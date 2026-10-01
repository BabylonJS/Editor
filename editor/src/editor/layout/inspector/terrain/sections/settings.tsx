import { join } from "path/posix";
import { ipcRenderer } from "electron";

import { Component, ReactNode } from "react";

import { LuCircleCheck, LuEraser, LuFileDown, LuFileUp, LuImport, LuScaling, LuSparkles, LuTriangleAlert } from "react-icons/lu";

import type { Mesh, Observer } from "babylonjs";
import type { ITerrainBudgetInfo } from "babylonjs-editor-tools";

import type { Editor } from "../../../../main";

import { showConfirm } from "../../../../../ui/dialog";
import { Button } from "../../../../../ui/shadcn/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../ui/shadcn/ui/select";

import { onSelectedAssetChanged } from "../../../../../tools/observables";
import { onRedoObservable, onUndoObservable } from "../../../../../tools/undoredo";

import { makeTerrainGeometryUnique } from "../../../../../tools/terrain/engine/structure";
import { getTerrainDependents, regenerateTerrainCollisionProxy, reprojectTerrainDecals, setTerrainPhysicsShapeToMesh } from "../../../../../tools/terrain/engine/dependents";
import { getTerrainEligibility } from "../../../../../tools/terrain/engine/eligibility";
import { onTerrainChangedObservable } from "../../../../../tools/terrain/engine/events";
import { getTerrainUndoStore } from "../../../../../tools/terrain/engine/history";
import { getTerrainMeshInfo, getTerrainPlugin, getTerrainStats } from "../../../../../tools/terrain/engine/info";
import { ensureTerrainUniqueMaterial, setTerrainMaterialSettings } from "../../../../../tools/terrain/engine/material";
import { getActiveTerrainPreview } from "../../../../../tools/terrain/engine/state";
import type { ITerrainBusyInfo, ITerrainChangedEvent, ITerrainDependentsStatus, ITerrainInfo, ITerrainStats, TerrainOperation } from "../../../../../tools/terrain/engine/types";
import { isTerrainBusy, onTerrainBusyChangedObservable } from "../../../../../tools/terrain/engine/yield";
import { getProjectDirectory, resolveRenamedAssetPath, toTerrainAbsolutePath } from "../../../../../tools/terrain/io/paths";

import { EditorInspectorBlockField } from "../../fields/block";
import { EditorInspectorListField, type IEditorInspectorListFieldItem } from "../../fields/list";
import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSectionField } from "../../fields/section";
import { EditorInspectorSwitchField } from "../../fields/switch";

import { reportTerrainTabError } from "../drop-actions";
import { formatTerrainBytes, formatTerrainCount, formatTerrainMegabytes, formatTerrainNumber, formatTerrainPlural, formatTerrainWeightMapOption } from "../format";
import {
	getActiveTerrainLayerId,
	getTerrainSettingsExternalRevision,
	notifyTerrainSettingsChanged,
	onTerrainSettingsChangedObservable,
	terrainSettings,
	type ITerrainSettingsChange,
} from "../settings";

import { TerrainFieldsRow } from "../components/fields-row";

import { openTerrainResizeDialog } from "../dialogs/resize";
import { openTerrainSplatImport } from "../dialogs/import-splat";
import { openTerrainHeightmapExport, openTerrainHeightmapImport } from "../dialogs/import-heightmap";

import { exportTerrainLayerMaskWithDialog, importTerrainLayerMaskWithDialog } from "./layers";
import { consumeTerrainGeneratePanelRequest, onTerrainGeneratePanelRequestedObservable, runTerrainOperationWithFeedback, TerrainGeneratePanel } from "./generate-panel";

/** Weight map resolutions of the Data section (§1.12). */
export const TERRAIN_WEIGHT_MAP_SIZE_OPTIONS: readonly number[] = [256, 512, 1024, 2048];

/** Portable sampler budget (TERRAIN_PORTABLE_SAMPLER_BUDGET of the runtime). */
const TERRAIN_SAMPLER_BUDGET = 16;

/** From this resolution the Dependents section warns about the weight of a mesh collider (§1.12). */
const TERRAIN_HEAVY_COLLIDER_SUBDIVISIONS = 512;

/** Refresh delays (terrain changes come in bursts during strokes). */
const TERRAIN_SETTINGS_INFO_DELAY_MS = 250;
const TERRAIN_SETTINGS_DEPENDENTS_DELAY_MS = 500;
const TERRAIN_SETTINGS_STATS_INTERVAL_MS = 1000;

const TERRAIN_MEBIBYTE = 1024 * 1024;

/** Range of the Undo budget field (MiB, §1.12). */
export const TERRAIN_UNDO_BUDGET_MIN_MIB = 16;
export const TERRAIN_UNDO_BUDGET_MAX_MIB = 65536;

/** Budget shown when the undo store can't be read (TERRAIN_DEFAULT_UNDO_BUDGET_BYTES of the engine, in MiB). */
const TERRAIN_UNDO_BUDGET_DEFAULT_MIB = 512;

/** Switches of the Viewport section (settings of terrainSettings.view, §1.12). */
const TERRAIN_VIEWPORT_SWITCHES: readonly {
	property: "hideGizmo" | "hideSceneIcons" | "showHud" | "showFootprint" | "otherGroundsBlockBrush" | "autoReprojectDecals";
	label: string;
}[] = [
	{ property: "hideGizmo", label: "Hide gizmo while the tab is open" },
	{ property: "hideSceneIcons", label: "Hide scene icons while the tab is open" },
	{ property: "showHud", label: "Show HUD" },
	{ property: "showFootprint", label: "Show footprint preview" },
	{ property: "otherGroundsBlockBrush", label: "Other terrains block the brush" },
	{ property: "autoReprojectDecals", label: "Re-project decals after each stroke" },
];

const TERRAIN_ERODE_TYPE_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "Thermal", value: "thermal" },
	{ text: "Hydraulic", value: "hydraulic" },
];

/** Parameters of the whole-terrain operations of the "Generate & modify" section (§1.12), kept per terrain for the session. */
export interface ITerrainGlobalOperationValues {
	smoothIterations: number;
	erodeType: "thermal" | "hydraulic";
	erodeIterations: number;
	erodeTalus: number;
	erodeDroplets: number;
	terraceStep: number;
	terraceSharpness: number;
	terraceOffset: number;
	flattenHeight: number;
	offsetAmount: number;
	scaleFactor: number;
	scalePivot: number;
	normalizeMin: number;
	normalizeMax: number;
}

export type TerrainGlobalOperationKind = "smooth" | "erode" | "terrace" | "flatten" | "offset" | "scale" | "normalize" | "clear-holes";

/**
 * Default parameters of the whole-terrain operations: heights (flatten, scale pivot, normalize range) from the terrain's world height range.
 * @param heightRange defines the world height range (cm) of the terrain.
 */
export function createTerrainGlobalOperationValues(heightRange: [number, number]): ITerrainGlobalOperationValues {
	const min = Number.isFinite(heightRange[0]) ? Math.round(heightRange[0]) : 0;
	const max = Number.isFinite(heightRange[1]) && heightRange[1] - heightRange[0] >= 1 ? Math.round(heightRange[1]) : min + 1000;

	return {
		smoothIterations: 3,
		erodeType: "thermal",
		erodeIterations: 10,
		erodeTalus: 35,
		erodeDroplets: 50000,
		terraceStep: 100,
		terraceSharpness: 0.8,
		terraceOffset: 0,
		flattenHeight: min,
		offsetAmount: 100,
		scaleFactor: 1.5,
		scalePivot: min,
		normalizeMin: min,
		normalizeMax: max,
	};
}

function clampTerrainInteger(value: number, min: number, max: number, fallback: number): number {
	return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

function clampTerrainNumber(value: number, min: number, max: number, fallback: number): number {
	return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/**
 * Whole-terrain operation of the "Generate & modify" section (§1.12) from its parameters (clamped to the ranges of the fields and of MCP
 * modify_terrain): smooth all (1–20 iterations, full strength), thermal (1–50 iterations, talus 0–89°) or hydraulic erosion (1–200000 droplets,
 * random seed), terraces, flatten, offset, scale (pivot), normalize, clear holes.
 * @param kind defines the operation.
 * @param values defines the parameters.
 */
export function createTerrainGlobalOperation(kind: TerrainGlobalOperationKind, values: ITerrainGlobalOperationValues): TerrainOperation {
	switch (kind) {
		case "smooth":
			return { type: "smooth", iterations: clampTerrainInteger(values.smoothIterations, 1, 20, 3), strength: 1 };

		case "erode":
			if (values.erodeType === "hydraulic") {
				return { type: "erode-hydraulic", droplets: clampTerrainInteger(values.erodeDroplets, 1, 200000, 50000), seed: Math.floor(Math.random() * 0x7fffffff) };
			}

			return {
				type: "erode-thermal",
				iterations: clampTerrainInteger(values.erodeIterations, 1, 50, 10),
				talusDegrees: clampTerrainNumber(values.erodeTalus, 0, 89, 35),
				amount: 0.5,
			};

		case "terrace":
			return {
				type: "terrace",
				step: clampTerrainNumber(values.terraceStep, 1, Number.MAX_SAFE_INTEGER, 100),
				sharpness: clampTerrainNumber(values.terraceSharpness, 0, 1, 0.8),
				offset: clampTerrainNumber(values.terraceOffset, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0),
			};

		case "flatten":
			return { type: "flatten", heightWorld: clampTerrainNumber(values.flattenHeight, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0) };

		case "offset":
			return { type: "offset", amountWorld: clampTerrainNumber(values.offsetAmount, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0) };

		case "scale":
			return {
				type: "scale",
				factor: clampTerrainNumber(values.scaleFactor, 0, Number.MAX_SAFE_INTEGER, 1),
				pivotWorld: clampTerrainNumber(values.scalePivot, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0),
			};

		case "normalize":
			return {
				type: "normalize",
				minWorld: Math.min(values.normalizeMin, values.normalizeMax),
				maxWorld: Math.max(values.normalizeMin, values.normalizeMax),
			};

		case "clear-holes":
			return { type: "clear-holes" };
	}
}

/**
 * Confirmation (title, text, button) and busy label of a whole-terrain operation (§1.12: "buttons with confirm + one undo entry each").
 * @param kind defines the operation.
 * @param values defines the parameters.
 */
export function getTerrainGlobalOperationTexts(
	kind: TerrainGlobalOperationKind,
	values: ITerrainGlobalOperationValues
): { title: string; text: string; confirm: string; label: string } {
	const operation = createTerrainGlobalOperation(kind, values);

	switch (operation.type) {
		case "smooth":
			return {
				title: "Smooth the whole terrain?",
				text: `${formatTerrainPlural(operation.iterations, "smoothing iteration")} will be applied to the whole terrain. This can be undone.`,
				confirm: "Smooth",
				label: "Smoothing",
			};

		case "erode-thermal":
			return {
				title: "Erode the whole terrain?",
				text: `Thermal erosion (${formatTerrainPlural(operation.iterations, "iteration")}, talus ${formatTerrainNumber(operation.talusDegrees, 1)}°) will run on the whole terrain. This can be undone.`,
				confirm: "Erode",
				label: "Eroding",
			};

		case "erode-hydraulic":
			return {
				title: "Erode the whole terrain?",
				text: `Hydraulic erosion (${formatTerrainPlural(operation.droplets, "droplet")}) will run on the whole terrain. This can be undone.`,
				confirm: "Erode",
				label: "Eroding",
			};

		case "terrace":
			return {
				title: "Terrace the whole terrain?",
				text: `The heights will be quantized in steps of ${formatTerrainNumber(operation.step, 1)} cm. This can be undone.`,
				confirm: "Terrace",
				label: "Terracing",
			};

		case "flatten":
			return {
				title: "Flatten the whole terrain?",
				text: `Every vertex will be set to ${formatTerrainNumber(operation.heightWorld, 1)} cm. This can be undone.`,
				confirm: "Flatten",
				label: "Flattening",
			};

		case "offset":
			return {
				title: "Offset the heights?",
				text: `Every vertex will move by ${formatTerrainNumber(operation.amountWorld, 1)} cm. This can be undone.`,
				confirm: "Offset",
				label: "Offsetting",
			};

		case "scale":
			return {
				title: "Scale the heights?",
				text: `The heights will be scaled by ${formatTerrainNumber(operation.factor, 3)} around ${formatTerrainNumber(operation.pivotWorld, 1)} cm. This can be undone.`,
				confirm: "Scale",
				label: "Scaling",
			};

		case "normalize":
			return {
				title: "Normalize the heights?",
				text: `The heights will be remapped to ${formatTerrainNumber(operation.minWorld, 1)}–${formatTerrainNumber(operation.maxWorld, 1)} cm. This can be undone.`,
				confirm: "Normalize",
				label: "Normalizing",
			};

		case "clear-holes":
			return {
				title: "Clear every hole?",
				text: "Every hole of the terrain will be filled. This can be undone.",
				confirm: "Clear",
				label: "Clearing holes",
			};

		default:
			return {
				title: "Modify the whole terrain?",
				text: "The operation will run on the whole terrain. This can be undone.",
				confirm: "Apply",
				label: "Modifying",
			};
	}
}

/**
 * Colour class of the sampler budget (§1.12): green up to 14 samplers, amber at 15–16, red above or when features were dropped.
 * @param budget defines the budget information of the terrain material.
 */
export function getTerrainSamplerBudgetClassName(budget: Readonly<ITerrainBudgetInfo>): string {
	const total = budget.baseSamplers + budget.terrainSamplers;
	if (budget.dropped.length > 0 || total > TERRAIN_SAMPLER_BUDGET) {
		return "text-red-500";
	}

	return total <= TERRAIN_SAMPLER_BUDGET - 2 ? "text-green-500" : "text-amber-500";
}

/** Session parameters of the whole-terrain operations, per terrain. */
const terrainGlobalOperationValues = new WeakMap<Mesh, ITerrainGlobalOperationValues>();

interface ITerrainSettingsRowProps {
	label: ReactNode;
	children: ReactNode;
	className?: string;
}

function TerrainSettingsRow(props: ITerrainSettingsRowProps): JSX.Element {
	return (
		<div className={`flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-2 text-sm ${props.className ?? ""}`}>
			<div className="text-muted-foreground">{props.label}</div>
			<div className="min-w-0 text-right break-words">{props.children}</div>
		</div>
	);
}

interface ITerrainSettingsLinkProps {
	children: ReactNode;
	disabled?: boolean;
	onClick: () => void;
}

function TerrainSettingsLink(props: ITerrainSettingsLinkProps): JSX.Element {
	return (
		<button
			type="button"
			disabled={props.disabled}
			onClick={() => props.onClick()}
			className="underline underline-offset-2 font-semibold hover:text-primary disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition-colors duration-300"
		>
			{props.children}
		</button>
	);
}

export interface ITerrainSettingsSectionsProps {
	/** The editor reference. */
	editor: Editor;
	/** The target terrain (state `terrain` of the tab). */
	mesh: Mesh;
}

interface ITerrainSettingsSectionsState {
	info: ITerrainInfo | null;
	infoError: string | null;
	dependents: ITerrainDependentsStatus | null;
	stats: ITerrainStats | null;
	/** A terrain operation runs (isTerrainBusy): every mutating button is disabled (§1.12). */
	busy: boolean;
	/** An action started by this category runs. */
	pending: boolean;
	/** The inline Generate panel is open (§1.13.3). */
	generateOpen: boolean;
	/** uniqueId of the terrain the Generate panel was opened for (never shown for another terrain). */
	generateMeshId: number | null;
	/** Re-key counter of the operation fields (other terrain). */
	operationsRevision: number;
}

/**
 * Settings category of the Terrain tab (§1.12), below the header: Terrain (size, Resize / resample…, height clamp), Generate & modify (inline
 * Generate panel and the whole-terrain operations), Import / export (heightmaps, splat maps, layer masks), Dependents (physics, decals,
 * navmeshes, LODs, collision proxy, sharing), Viewport (view settings), Data (weight maps) and Info (sizes, memory, undo budget,
 * sampler budget, frame stats). Settings fields bind to terrainSettings with noUndoRedo and are keyed by the external revision (D19).
 */
export class TerrainSettingsSections extends Component<ITerrainSettingsSectionsProps, ITerrainSettingsSectionsState> {
	private _unmounted: boolean = false;

	private _terrainObserver: Observer<ITerrainChangedEvent> | null = null;
	private _busyObserver: Observer<Readonly<ITerrainBusyInfo> | null> | null = null;
	private _settingsObserver: Observer<ITerrainSettingsChange> | null = null;
	private _undoObserver: Observer<void> | null = null;
	private _redoObserver: Observer<void> | null = null;
	private _generateObserver: Observer<void> | null = null;

	private _infoTimeout: ReturnType<typeof setTimeout> | null = null;
	private _dependentsTimeout: ReturnType<typeof setTimeout> | null = null;
	private _statsInterval: ReturnType<typeof setInterval> | null = null;
	private _dependentsRequest: number = 0;

	/**
	 * Value (MiB) edited by the Undo budget field. The field writes this draft at every keystroke and pointer-locked move; the budget of the
	 * undo store is only set when the edit is committed (Enter, field left, end of a drag): lowering the budget releases undo payloads for good,
	 * so the intermediate values ("102" while typing "1024", the steps of a drag) must never reach it.
	 */
	private _undoBudgetDraft: { value: number };
	/** Draft value when a pointer-locked drag of the field started (null outside a drag). */
	private _undoBudgetDragStart: number | null = null;
	/** A commit waits for its confirmation: the blur of the field (the dialog takes the focus) doesn't commit a second time. */
	private _undoBudgetCommitting: boolean = false;

	public constructor(props: ITerrainSettingsSectionsProps) {
		super(props);

		this._undoBudgetDraft = { value: this._readUndoBudget() };

		const { info, infoError } = this._readInfo(props.mesh);

		this.state = {
			info,
			infoError,
			dependents: null,
			stats: null,
			busy: false,
			pending: false,
			generateOpen: false,
			generateMeshId: null,
			operationsRevision: 0,
		};
	}

	public componentDidMount(): void {
		try {
			this._terrainObserver = onTerrainChangedObservable.add((event) => this._handleTerrainChanged(event));
			this._busyObserver = onTerrainBusyChangedObservable.add(() => this._handleBusyChanged());
			this._settingsObserver = onTerrainSettingsChangedObservable.add(() => this._handleSettingsChanged());
			this._undoObserver = onUndoObservable.add(() => this._handleUndoRedo());
			this._redoObserver = onRedoObservable.add(() => this._handleUndoRedo());
			this._generateObserver = onTerrainGeneratePanelRequestedObservable.add(() => this._handleGenerateRequested());

			this._statsInterval = setInterval(() => this._refreshStats(), TERRAIN_SETTINGS_STATS_INTERVAL_MS);

			this.setState({ busy: isTerrainBusy() });

			this._refreshInfo();
			this._refreshStats();
			void this._refreshDependents();

			// "Generate…" of the header switched to this category before it mounted.
			this._handleGenerateRequested();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	public componentDidUpdate(prevProps: Readonly<ITerrainSettingsSectionsProps>): void {
		try {
			if (prevProps.mesh !== this.props.mesh) {
				// The Generate panel is keyed by terrain: closing it cancels the preview of the previous terrain (§1.13.3).
				this.setState({
					...this._readInfo(this.props.mesh),
					dependents: null,
					generateOpen: false,
					generateMeshId: null,
					operationsRevision: this.state.operationsRevision + 1,
				});

				void this._refreshDependents();
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	public componentWillUnmount(): void {
		this._unmounted = true;

		try {
			if (this._infoTimeout !== null) {
				clearTimeout(this._infoTimeout);
			}

			if (this._dependentsTimeout !== null) {
				clearTimeout(this._dependentsTimeout);
			}

			if (this._statsInterval !== null) {
				clearInterval(this._statsInterval);
			}

			onTerrainChangedObservable.remove(this._terrainObserver);
			onTerrainBusyChangedObservable.remove(this._busyObserver);
			onTerrainSettingsChangedObservable.remove(this._settingsObserver);
			onUndoObservable.remove(this._undoObserver);
			onRedoObservable.remove(this._redoObserver);
			onTerrainGeneratePanelRequestedObservable.remove(this._generateObserver);
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	public render(): ReactNode {
		const { readOnly, newerVersion } = this._getReadOnlyState();
		const disabled = this.state.busy || this.state.pending;

		return (
			<div className="flex flex-col gap-2 w-full">
				{this._getTerrainSection(disabled, newerVersion)}
				{this._getGenerateSection(disabled, readOnly)}
				{this._getImportExportSection(disabled, readOnly)}
				{this._getDependentsSection(disabled, readOnly)}
				{this._getViewportSection()}
				{this._getDataSection(disabled, readOnly)}
				{this._getInfoSection()}
			</div>
		);
	}

	/** Read-only terrains (newer version, unsupported resolution) can't be edited; only a newer version also blocks Resize / resample. */
	private _getReadOnlyState(): { readOnly: boolean; newerVersion: boolean } {
		try {
			const eligibility = getTerrainEligibility(this.props.mesh);
			if (!eligibility.eligible) {
				return { readOnly: false, newerVersion: false };
			}

			return { readOnly: eligibility.readOnly, newerVersion: eligibility.warnings.includes("newer-version") };
		} catch (e) {
			return { readOnly: false, newerVersion: false };
		}
	}

	/** getTerrainMeshInfo of a terrain, or the error that prevents reading it. */
	private _readInfo(mesh: Mesh): { info: ITerrainInfo | null; infoError: string | null } {
		try {
			return { info: getTerrainMeshInfo(mesh), infoError: null };
		} catch (e) {
			return { info: null, infoError: e instanceof Error ? e.message : String(e) };
		}
	}

	private _getSettingsKey(property: string): string {
		return `${property}-${getTerrainSettingsExternalRevision()}`;
	}

	private _getTerrainSection(disabled: boolean, newerVersion: boolean): ReactNode {
		const info = this.state.info;
		const heightClamp = terrainSettings.sculpt?.heightClamp;

		return (
			<EditorInspectorSectionField title="Terrain">
				{info && (
					<div className="px-2 text-sm break-words">
						{formatTerrainNumber(info.width, 1)} × {formatTerrainNumber(info.height, 1)} cm · {info.subdivisions} subdivisions · cell{" "}
						{formatTerrainNumber(info.cellX, 2)} × {formatTerrainNumber(info.cellZ, 2)} cm
					</div>
				)}

				{this.state.infoError && (
					<div className="flex items-center gap-2 px-2 text-sm text-red-500">
						<LuTriangleAlert className="w-4 h-4 shrink-0" /> {this.state.infoError}
					</div>
				)}

				<Button
					variant="secondary"
					size="sm"
					className="flex items-center gap-2 self-start mx-2"
					disabled={disabled || newerVersion}
					onClick={() => this._runAction(() => openTerrainResizeDialog(this.props.editor, this.props.mesh))}
				>
					<LuScaling className="w-4 h-4" /> Resize / resample…
				</Button>

				{heightClamp && (
					<>
						<EditorInspectorSwitchField
							key={this._getSettingsKey("heightClamp.enabled")}
							object={heightClamp}
							property="enabled"
							label="Height clamp"
							noUndoRedo
							onChange={() => this._notifySettingsChanged("sculpt.heightClamp")}
						/>
						{heightClamp.enabled && (
							<TerrainFieldsRow label="Min / Max (cm)">
								<EditorInspectorNumberField
									key={this._getSettingsKey("heightClamp.minWorld")}
									object={heightClamp}
									property="minWorld"
									step={1}
									noUndoRedo
									onChange={() => this._notifySettingsChanged("sculpt.heightClamp")}
								/>
								<EditorInspectorNumberField
									key={this._getSettingsKey("heightClamp.maxWorld")}
									object={heightClamp}
									property="maxWorld"
									step={1}
									noUndoRedo
									onChange={() => this._notifySettingsChanged("sculpt.heightClamp")}
								/>
							</TerrainFieldsRow>
						)}
					</>
				)}
			</EditorInspectorSectionField>
		);
	}

	/** Parameters of the operations of the terrain (session), created from its height range once it is known. */
	private _getOperationValues(): ITerrainGlobalOperationValues {
		const stored = terrainGlobalOperationValues.get(this.props.mesh);
		if (stored) {
			return stored;
		}

		const values = createTerrainGlobalOperationValues(this.state.info?.worldHeightRange ?? [0, 1000]);
		if (this.state.info) {
			terrainGlobalOperationValues.set(this.props.mesh, values);
		}

		return values;
	}

	private _getOperationField(
		values: ITerrainGlobalOperationValues,
		property: Exclude<keyof ITerrainGlobalOperationValues, "erodeType">,
		label: string | null,
		options: { min?: number; max?: number; step: number; integer?: boolean }
	): ReactNode {
		return (
			<EditorInspectorNumberField
				key={`${property}-${this.state.operationsRevision}`}
				object={values}
				property={property}
				label={label}
				min={options.min}
				max={options.max}
				step={options.step}
				noUndoRedo
				onChange={(value) => {
					if (options.integer) {
						values[property] = Math.round(value);
					}
				}}
			/>
		);
	}

	private _getOperationBlock(kind: TerrainGlobalOperationKind, button: string, fields: ReactNode, disabled: boolean): ReactNode {
		return (
			<EditorInspectorBlockField key={kind}>
				{fields}
				<Button variant="secondary" size="sm" className="self-end" disabled={disabled} onClick={() => this._runAction(() => this._runGlobalOperation(kind))}>
					{button}
				</Button>
			</EditorInspectorBlockField>
		);
	}

	private _getGenerateSection(disabled: boolean, readOnly: boolean): ReactNode {
		const values = this._getOperationValues();
		const generateOpen = this.state.generateOpen && this.state.generateMeshId === this.props.mesh.uniqueId;
		const previewOpen = generateOpen || !!getActiveTerrainPreview();
		const operationsDisabled = disabled || readOnly || previewOpen;

		return (
			<EditorInspectorSectionField title="Generate & modify">
				<Button
					variant={generateOpen ? "default" : "secondary"}
					size="sm"
					className="flex items-center gap-2 self-start mx-2"
					disabled={!generateOpen && (disabled || readOnly)}
					onClick={() => this._toggleGeneratePanel(generateOpen)}
				>
					<LuSparkles className="w-4 h-4" /> Generate…
				</Button>

				{generateOpen && (
					<TerrainGeneratePanel key={this.props.mesh.uniqueId} editor={this.props.editor} mesh={this.props.mesh} onClose={() => this._handleGeneratePanelClosed()} />
				)}

				{previewOpen && <div className="px-2 text-xs text-muted-foreground">Finish or cancel Generate first.</div>}

				{this._getOperationBlock(
					"smooth",
					"Smooth all",
					this._getOperationField(values, "smoothIterations", "Iterations", { min: 1, max: 20, step: 1, integer: true }),
					operationsDisabled
				)}

				{this._getOperationBlock(
					"erode",
					"Erode all",
					<>
						<EditorInspectorListField
							key={`erodeType-${this.state.operationsRevision}`}
							object={values}
							property="erodeType"
							label="Type"
							items={TERRAIN_ERODE_TYPE_ITEMS}
							noUndoRedo
							onChange={() => this.forceUpdate()}
						/>
						{values.erodeType === "thermal" && (
							<>
								{this._getOperationField(values, "erodeIterations", "Iterations", { min: 1, max: 50, step: 1, integer: true })}
								{this._getOperationField(values, "erodeTalus", "Talus angle (°)", { min: 0, max: 89, step: 0.1 })}
							</>
						)}
						{values.erodeType === "hydraulic" && this._getOperationField(values, "erodeDroplets", "Droplets", { min: 1, max: 200000, step: 100, integer: true })}
					</>,
					operationsDisabled
				)}

				{this._getOperationBlock(
					"terrace",
					"Terrace all",
					<>
						{this._getOperationField(values, "terraceStep", "Step (cm)", { min: 1, step: 1 })}
						{this._getOperationField(values, "terraceSharpness", "Sharpness", { min: 0, max: 1, step: 0.01 })}
						{this._getOperationField(values, "terraceOffset", "Offset (cm)", { step: 1 })}
					</>,
					operationsDisabled
				)}

				{this._getOperationBlock("flatten", "Flatten to height…", this._getOperationField(values, "flattenHeight", "Height (cm)", { step: 1 }), operationsDisabled)}

				{this._getOperationBlock("offset", "Offset heights…", this._getOperationField(values, "offsetAmount", "Offset (cm)", { step: 1 }), operationsDisabled)}

				{this._getOperationBlock(
					"scale",
					"Scale heights…",
					<>
						{this._getOperationField(values, "scaleFactor", "Factor", { min: 0, step: 0.01 })}
						{this._getOperationField(values, "scalePivot", "Pivot (cm)", { step: 1 })}
					</>,
					operationsDisabled
				)}

				{this._getOperationBlock(
					"normalize",
					"Normalize to range…",
					<TerrainFieldsRow label="Min / Max (cm)">
						{this._getOperationField(values, "normalizeMin", null, { step: 1 })}
						{this._getOperationField(values, "normalizeMax", null, { step: 1 })}
					</TerrainFieldsRow>,
					operationsDisabled
				)}

				<Button
					variant="secondary"
					size="sm"
					className="flex items-center gap-2 self-start mx-2"
					disabled={operationsDisabled || this.state.info?.holes === 0}
					onClick={() => this._runAction(() => this._runGlobalOperation("clear-holes"))}
				>
					<LuEraser className="w-4 h-4" /> Clear holes
				</Button>
			</EditorInspectorSectionField>
		);
	}

	private _getImportExportSection(disabled: boolean, readOnly: boolean): ReactNode {
		const { editor, mesh } = this.props;

		const plugin = getTerrainPlugin(mesh);
		const layerId = getActiveTerrainLayerId(mesh.material);
		const layer = plugin?.data.layers.find((item) => item.id === layerId) ?? null;

		return (
			<EditorInspectorSectionField title="Import / export">
				<div className="flex flex-wrap gap-2 px-2">
					<Button
						variant="secondary"
						size="sm"
						className="flex items-center gap-2"
						disabled={disabled || readOnly}
						onClick={() => this._runAction(() => openTerrainHeightmapImport(editor, mesh))}
					>
						<LuFileUp className="w-4 h-4" /> Import heightmap…
					</Button>
					<Button
						variant="secondary"
						size="sm"
						className="flex items-center gap-2"
						disabled={disabled}
						onClick={() => this._runAction(() => openTerrainHeightmapExport(editor, mesh))}
					>
						<LuFileDown className="w-4 h-4" /> Export heightmap…
					</Button>
					<Button
						variant="secondary"
						size="sm"
						className="flex items-center gap-2"
						disabled={disabled || readOnly}
						onClick={() => this._runAction(() => openTerrainSplatImport(editor, mesh))}
					>
						<LuImport className="w-4 h-4" /> Import splat map…
					</Button>
				</div>

				<div className="px-2 text-xs text-muted-foreground">
					{layer
						? `Layer masks of the active layer “${layer.name}” (grayscale PNG, image top = +Z).`
						: "Layer masks need a painted layer: enable texture painting in the Paint category."}
				</div>

				<div className="flex flex-wrap gap-2 px-2">
					<Button
						variant="secondary"
						size="sm"
						className="flex items-center gap-2"
						disabled={disabled || readOnly || !layer}
						onClick={() => layer && this._runAction(() => importTerrainLayerMaskWithDialog(editor, mesh, layer.id))}
					>
						<LuFileUp className="w-4 h-4" /> Import layer mask…
					</Button>
					<Button
						variant="secondary"
						size="sm"
						className="flex items-center gap-2"
						disabled={disabled || !layer}
						onClick={() => layer && this._runAction(() => exportTerrainLayerMaskWithDialog(editor, mesh, layer.id))}
					>
						<LuFileDown className="w-4 h-4" /> Export layer mask…
					</Button>
				</div>
			</EditorInspectorSectionField>
		);
	}

	private _getDependentsSection(disabled: boolean, readOnly: boolean): ReactNode {
		const dependents = this.state.dependents;
		const info = this.state.info;
		const mutationsDisabled = disabled || readOnly;

		let physics: ReactNode = null;
		if (dependents) {
			switch (dependents.physics) {
				case "mesh":
					physics = (
						<span className="inline-flex items-center gap-1">
							<LuCircleCheck className="w-4 h-4 text-green-500" /> Mesh
						</span>
					);
					break;

				case "box":
				case "other":
					physics = (
						<span className="inline-flex flex-wrap items-center justify-end gap-1">
							<LuTriangleAlert className="w-4 h-4 text-amber-500" />
							{dependents.physics === "box" ? "Box" : "Other shape"}: bodies won't follow the relief
							<TerrainSettingsLink disabled={mutationsDisabled} onClick={() => this._runAction(() => this._setPhysicsShapeToMesh())}>
								Use mesh shape
							</TerrainSettingsLink>
						</span>
					);
					break;

				default:
					physics = "None";
					break;
			}
		}

		return (
			<EditorInspectorSectionField title="Dependents">
				{!dependents && <div className="px-2 text-sm text-muted-foreground">Loading…</div>}

				{dependents && (
					<div className="flex flex-col gap-2 w-full">
						<TerrainSettingsRow label="Physics">{physics}</TerrainSettingsRow>

						{dependents.physics === "mesh" && info && info.subdivisions >= TERRAIN_HEAVY_COLLIDER_SUBDIVISIONS && (
							<div className="px-2 text-xs text-amber-500">
								A mesh collider of {formatTerrainCount(dependents.physicsTriangles)} triangles is heavy in games; consider 256 or 512 subdivisions.
							</div>
						)}

						{(dependents.decals.total > 0 || dependents.decals.merged > 0) && (
							<>
								{dependents.decals.total > 0 && (
									<TerrainSettingsRow label="Decals">
										<span className="inline-flex flex-wrap items-center justify-end gap-1">
											{dependents.decals.total} decal(s) on this terrain, {dependents.decals.stale} outdated
											<TerrainSettingsLink disabled={disabled} onClick={() => this._runAction(() => this._reprojectDecals())}>
												Re-project now
											</TerrainSettingsLink>
										</span>
									</TerrainSettingsRow>
								)}

								{dependents.decals.merged > 0 && (
									<div className="px-2 text-xs text-muted-foreground">{formatTerrainPlural(dependents.decals.merged, "merged decal")} can't be updated.</div>
								)}

								{this._getViewSwitch("autoReprojectDecals", "Re-project decals after each stroke")}
							</>
						)}

						{dependents.navmeshes.map((path) => (
							<div key={path} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-sm">
								<span>“{this._getNavmeshName(path)}” uses this terrain: rebake it in the Navigation editor</span>
								<TerrainSettingsLink onClick={() => this._showInAssetsBrowser(path)}>Show in Assets Browser</TerrainSettingsLink>
							</div>
						))}

						{dependents.lods > 0 && <div className="px-2 text-sm">LOD meshes don't follow sculpting.</div>}

						{dependents.collisionProxy !== "none" && (
							<TerrainSettingsRow label="Collision proxy">
								{dependents.collisionProxy === "stale" ? (
									<span className="inline-flex flex-wrap items-center justify-end gap-1">
										<LuTriangleAlert className="w-4 h-4 text-amber-500" /> Outdated
										<TerrainSettingsLink disabled={disabled} onClick={() => this._runAction(() => this._regenerateCollisionProxy())}>
											Rebuild
										</TerrainSettingsLink>
									</span>
								) : (
									<span className="inline-flex items-center gap-1">
										<LuCircleCheck className="w-4 h-4 text-green-500" /> Up to date
									</span>
								)}
							</TerrainSettingsRow>
						)}

						{dependents.sharedGeometry > 0 && (
							<TerrainSettingsRow label="Geometry">
								<span className="inline-flex flex-wrap items-center justify-end gap-1">
									Shared with {formatTerrainPlural(dependents.sharedGeometry, "other mesh", "other meshes")}
									<TerrainSettingsLink disabled={mutationsDisabled} onClick={() => this._runAction(() => this._makeGeometryUnique())}>
										Make unique
									</TerrainSettingsLink>
								</span>
							</TerrainSettingsRow>
						)}

						{dependents.sharedMaterial > 0 && (
							<TerrainSettingsRow label="Material">
								<span className="inline-flex flex-wrap items-center justify-end gap-1">
									Shared with {formatTerrainPlural(dependents.sharedMaterial, "other mesh", "other meshes")}
									<TerrainSettingsLink disabled={mutationsDisabled} onClick={() => this._runAction(() => this._makeMaterialUnique())}>
										Make unique
									</TerrainSettingsLink>
								</span>
							</TerrainSettingsRow>
						)}

						{dependents.instances > 0 && (
							<div className="px-2 text-sm">{formatTerrainPlural(dependents.instances, "instance")} share the geometry and the material of this terrain.</div>
						)}
					</div>
				)}
			</EditorInspectorSectionField>
		);
	}

	private _getViewSwitch(property: (typeof TERRAIN_VIEWPORT_SWITCHES)[number]["property"], label: string): ReactNode {
		const view = terrainSettings.view;
		if (!view) {
			return null;
		}

		return (
			<EditorInspectorSwitchField
				key={`${this._getSettingsKey(`view.${property}`)}-${view[property]}`}
				object={view}
				property={property}
				label={label}
				noUndoRedo
				onChange={() => this._notifySettingsChanged(`view.${property}`)}
			/>
		);
	}

	private _getViewportSection(): ReactNode {
		return (
			<EditorInspectorSectionField title="Viewport">{TERRAIN_VIEWPORT_SWITCHES.map((item) => this._getViewSwitch(item.property, item.label))}</EditorInspectorSectionField>
		);
	}

	private _getDataSection(disabled: boolean, readOnly: boolean): ReactNode {
		const plugin = getTerrainPlugin(this.props.mesh);
		const layerCount = plugin?.data.layers.length ?? 0;
		const mapCount = layerCount > 4 ? 2 : 1;

		return (
			<EditorInspectorSectionField title="Data">
				{plugin && (
					<>
						<div className="flex gap-2 items-center px-2">
							<div className="w-1/3 text-ellipsis overflow-hidden whitespace-nowrap">Weight maps</div>
							<Select
								disabled={disabled || readOnly}
								value={String(plugin.data.weightMapSize)}
								onValueChange={(value) => this._runAction(() => this._setWeightMapSize(parseInt(value, 10)))}
							>
								<SelectTrigger className="w-2/3">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TERRAIN_WEIGHT_MAP_SIZE_OPTIONS.map((size) => (
										<SelectItem key={size} value={String(size)}>
											{formatTerrainWeightMapOption(size, mapCount)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{plugin.data.weightMaps.slice(0, mapCount).map((path, index) => (
							<div key={index} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-sm">
								<span className="text-muted-foreground">Weight map {index + 1}:</span>
								{path ? (
									<>
										<span className="min-w-0 break-all">{path}</span>
										<TerrainSettingsLink onClick={() => this._revealFile(path)}>Reveal</TerrainSettingsLink>
									</>
								) : (
									<span className="text-muted-foreground">not saved yet</span>
								)}
							</div>
						))}
					</>
				)}

				{!plugin && <div className="px-2 text-sm text-muted-foreground">No weight maps: texture painting is not enabled for this terrain.</div>}
			</EditorInspectorSectionField>
		);
	}

	private _getInfoSection(): ReactNode {
		const info = this.state.info;
		const stats = this.state.stats;
		const budget = info?.budget ?? null;

		return (
			<EditorInspectorSectionField title="Info">
				{info && (
					<div className="flex flex-col gap-1 w-full">
						<TerrainSettingsRow label="Vertices">{formatTerrainCount(info.vertices)}</TerrainSettingsRow>
						<TerrainSettingsRow label="Triangles">{formatTerrainCount(info.triangles)}</TerrainSettingsRow>
						<TerrainSettingsRow label="Holes">{formatTerrainCount(info.holes)}</TerrainSettingsRow>
						<TerrainSettingsRow label="Geometry file (estimate)">{formatTerrainBytes(info.memory.geometryFileBytes)}</TerrainSettingsRow>
						<TerrainSettingsRow label="CPU memory">{formatTerrainBytes(info.memory.cpuBytes)}</TerrainSettingsRow>
						<TerrainSettingsRow label="GPU memory">{formatTerrainBytes(info.memory.gpuBytes)}</TerrainSettingsRow>

						{budget && (
							<TerrainSettingsRow label="Sampler budget">
								<span className={getTerrainSamplerBudgetClassName(budget)}>
									base {budget.baseSamplers} + terrain {budget.terrainSamplers} = {budget.baseSamplers + budget.terrainSamplers}/
									{budget.budget || TERRAIN_SAMPLER_BUDGET}
									{budget.dropped.length > 0 ? ` (${budget.dropped.join(", ")} disabled)` : ""}
								</span>
							</TerrainSettingsRow>
						)}
					</div>
				)}

				{stats && (
					<div className="flex flex-col gap-1 w-full">
						<TerrainSettingsRow label="Undo memory">
							{formatTerrainMegabytes(stats.undoBytes)} / {formatTerrainMegabytes(stats.undoBudgetBytes)}
						</TerrainSettingsRow>
						<TerrainSettingsRow label="Last frame">
							{formatTerrainNumber(stats.lastFrameMs, 2)} ms · {formatTerrainPlural(stats.dabsLastFrame, "dab")} · {formatTerrainBytes(stats.uploadedBytesLastFrame)}{" "}
							uploaded
						</TerrainSettingsRow>
					</div>
				)}

				{/* A pointer-locked drag ends with a mouseup on the locked input, which bubbles here (the field commits nothing itself with noUndoRedo). */}
				<div className="w-full" onPointerDown={() => this._handleUndoBudgetPointerDown()} onMouseUp={() => this._handleUndoBudgetMouseUp()}>
					<EditorInspectorNumberField
						object={this._undoBudgetDraft}
						property="value"
						label="Undo budget (MiB)"
						min={TERRAIN_UNDO_BUDGET_MIN_MIB}
						max={TERRAIN_UNDO_BUDGET_MAX_MIB}
						step={1}
						noUndoRedo
						onFinishChange={(value) => void this._commitUndoBudget(value)}
					/>
				</div>
			</EditorInspectorSectionField>
		);
	}

	/** Budget of the undo store in MiB (the default when the undo store can't be read). */
	private _readUndoBudget(): number {
		try {
			return Math.round(getTerrainUndoStore().budgetBytes / TERRAIN_MEBIBYTE);
		} catch (e) {
			return TERRAIN_UNDO_BUDGET_DEFAULT_MIB;
		}
	}

	/** New draft read from the undo store: the field shows the applied budget again (it reloads its value when its object changes). */
	private _resetUndoBudgetDraft(): void {
		this._undoBudgetDraft = { value: this._readUndoBudget() };

		if (!this._unmounted) {
			this.forceUpdate();
		}
	}

	private _handleUndoBudgetPointerDown(): void {
		this._undoBudgetDragStart = this._undoBudgetDraft.value;
	}

	private _handleUndoBudgetMouseUp(): void {
		const start = this._undoBudgetDragStart;
		this._undoBudgetDragStart = null;

		if (start !== null && this._undoBudgetDraft.value !== start) {
			void this._commitUndoBudget(this._undoBudgetDraft.value);
		}
	}

	/**
	 * Applies a committed Undo budget (MiB) to the undo store. A budget below the memory already used releases the oldest undo payloads at once
	 * (those edits can't be undone anymore): it asks for a confirmation first. The draft is then reloaded from the undo store.
	 * @param value defines the committed value of the field (MiB).
	 */
	private async _commitUndoBudget(value: number): Promise<void> {
		if (this._undoBudgetCommitting) {
			return;
		}

		try {
			const mebibytes = Math.round(value);
			if (!Number.isFinite(mebibytes) || mebibytes < TERRAIN_UNDO_BUDGET_MIN_MIB || mebibytes > TERRAIN_UNDO_BUDGET_MAX_MIB) {
				return;
			}

			const bytes = mebibytes * TERRAIN_MEBIBYTE;
			if (bytes === getTerrainUndoStore().budgetBytes) {
				return;
			}

			const usedBytes = getTerrainStats(this.props.editor.layout.preview.scene).undoBytes;
			if (bytes < usedBytes && !(await this._confirmUndoBudget(mebibytes, usedBytes))) {
				return;
			}

			getTerrainUndoStore().budgetBytes = bytes;
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		} finally {
			this._resetUndoBudgetDraft();
			this._refreshStats();
		}
	}

	private async _confirmUndoBudget(mebibytes: number, usedBytes: number): Promise<boolean> {
		this._undoBudgetCommitting = true;

		try {
			return await showConfirm(
				"Lower the terrain undo budget?",
				`The terrain undo history uses ${formatTerrainMegabytes(usedBytes)}. With a budget of ${mebibytes} MiB its oldest edits are released at once and can no longer be undone.`,
				{ confirmText: "Lower budget" }
			);
		} finally {
			this._undoBudgetCommitting = false;
		}
	}

	private _notifySettingsChanged(key: string): void {
		try {
			notifyTerrainSettingsChanged([key]);
			this.forceUpdate();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _runAction(action: () => unknown): void {
		void (async () => {
			this.setState({ pending: true });

			try {
				await action();
			} catch (e) {
				reportTerrainTabError(this.props.editor, e);
			} finally {
				if (!this._unmounted) {
					this.setState({ pending: false });
					this._refreshInfo();
					void this._refreshDependents();
				}
			}
		})();
	}

	private async _runGlobalOperation(kind: TerrainGlobalOperationKind): Promise<void> {
		const values = this._getOperationValues();
		const texts = getTerrainGlobalOperationTexts(kind, values);

		const confirmed = await showConfirm(texts.title, texts.text, { confirmText: texts.confirm });
		if (!confirmed) {
			return;
		}

		await runTerrainOperationWithFeedback(this.props.editor, this.props.mesh, createTerrainGlobalOperation(kind, values), texts.label);
	}

	private _toggleGeneratePanel(open: boolean): void {
		// Closing the panel cancels its preview (unmount).
		this.setState({ generateOpen: !open, generateMeshId: open ? null : this.props.mesh.uniqueId });
	}

	private _handleGeneratePanelClosed(): void {
		if (!this._unmounted) {
			this.setState({ generateOpen: false, generateMeshId: null });
			this._refreshInfo();
		}
	}

	private _handleGenerateRequested(): void {
		try {
			if (!this._unmounted && consumeTerrainGeneratePanelRequest()) {
				this.setState({ generateOpen: true, generateMeshId: this.props.mesh.uniqueId });
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleTerrainChanged(event: ITerrainChangedEvent): void {
		try {
			if (this._unmounted) {
				return;
			}

			const mesh = this.props.mesh;
			if (event.mesh !== mesh && (!event.mesh.material || event.mesh.material !== mesh.material)) {
				return;
			}

			this._scheduleInfoRefresh();
			this._scheduleDependentsRefresh();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleBusyChanged(): void {
		try {
			if (this._unmounted) {
				return;
			}

			const busy = isTerrainBusy();
			// Compared with the latest QUEUED state, not this.state: a short operation opens and closes its busy scope before React applies
			// the first update, and the "idle" notification compared with the stale this.state left every button disabled.
			this.setState((state) => (state.busy === busy ? null : { busy }));

			if (!busy) {
				this._scheduleInfoRefresh();
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleSettingsChanged(): void {
		try {
			// Settings fields re-key on external changes (shortcuts, reset, MCP); collapsed sections.
			if (!this._unmounted) {
				this.forceUpdate();
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleUndoRedo(): void {
		try {
			if (!this._unmounted) {
				this._scheduleInfoRefresh();
				this._scheduleDependentsRefresh();
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _scheduleInfoRefresh(): void {
		if (this._infoTimeout !== null) {
			return;
		}

		this._infoTimeout = setTimeout(() => {
			this._infoTimeout = null;
			this._refreshInfo();
		}, TERRAIN_SETTINGS_INFO_DELAY_MS);
	}

	private _scheduleDependentsRefresh(): void {
		if (this._dependentsTimeout !== null) {
			clearTimeout(this._dependentsTimeout);
		}

		this._dependentsTimeout = setTimeout(() => {
			this._dependentsTimeout = null;
			void this._refreshDependents();
		}, TERRAIN_SETTINGS_DEPENDENTS_DELAY_MS);
	}

	private _refreshInfo(): void {
		if (!this._unmounted) {
			this.setState(this._readInfo(this.props.mesh));
		}
	}

	private _refreshStats(): void {
		try {
			if (this._unmounted) {
				return;
			}

			this.setState({ stats: getTerrainStats(this.props.editor.layout.preview.scene) });
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private async _refreshDependents(): Promise<void> {
		const request = ++this._dependentsRequest;
		const mesh = this.props.mesh;

		try {
			const dependents = await getTerrainDependents(mesh);
			if (!this._unmounted && request === this._dependentsRequest && mesh === this.props.mesh) {
				this.setState({ dependents });
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _setPhysicsShapeToMesh(): void {
		setTerrainPhysicsShapeToMesh(this.props.editor, this.props.mesh);
	}

	private async _reprojectDecals(): Promise<void> {
		await reprojectTerrainDecals(this.props.mesh);
	}

	private async _regenerateCollisionProxy(): Promise<void> {
		await regenerateTerrainCollisionProxy(this.props.mesh);
	}

	private _makeGeometryUnique(): void {
		makeTerrainGeometryUnique(this.props.editor, this.props.mesh);
	}

	private _makeMaterialUnique(): void {
		ensureTerrainUniqueMaterial(this.props.editor, this.props.mesh);
	}

	private _getNavmeshName(path: string): string {
		const name = path.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() ?? path;
		return name;
	}

	private _showInAssetsBrowser(relativePath: string): void {
		try {
			const projectDirectory = getProjectDirectory();
			if (projectDirectory) {
				onSelectedAssetChanged.notifyObservers(join(projectDirectory, relativePath));
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _revealFile(relativePath: string): void {
		try {
			ipcRenderer.send("editor:show-item", toTerrainAbsolutePath(resolveRenamedAssetPath(relativePath)));
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private async _setWeightMapSize(size: number): Promise<void> {
		const plugin = getTerrainPlugin(this.props.mesh);
		if (!plugin || plugin.data.weightMapSize === size) {
			return;
		}

		const confirmed = await showConfirm(`Resample weight maps to ${size}²?`, "This can be undone.", { confirmText: "Resample" });
		if (confirmed) {
			await setTerrainMaterialSettings(this.props.editor, this.props.mesh, { weightMapSize: size });
		}
	}
}
