import { Component, ReactNode } from "react";
import { toast } from "sonner";

import { LuDices, LuSparkles } from "react-icons/lu";

import { Observable, type Mesh, type Observer } from "babylonjs";

import type { Editor } from "../../../../main";

import { Button } from "../../../../../ui/shadcn/ui/button";
import { Progress } from "../../../../../ui/shadcn/ui/progress";

import { createDefaultTerrainGenerateParams, type ITerrainGenerateParams } from "../../../../../tools/terrain/core/kernels/generate";
import { getTerrainMeshInfo } from "../../../../../tools/terrain/engine/info";
import { applyTerrainOperation, beginTerrainPreview } from "../../../../../tools/terrain/engine/operations";
import type { ITerrainBusyInfo, ITerrainOperationResult, ITerrainPreviewTransaction, TerrainOperation } from "../../../../../tools/terrain/engine/types";
import { onTerrainBusyChangedObservable } from "../../../../../tools/terrain/engine/yield";

import { EditorInspectorBlockField } from "../../fields/block";
import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorListField, type IEditorInspectorListFieldItem } from "../../fields/list";

import { updateTerrainSettings } from "../settings";
import { formatTerrainBusy } from "../format";
import { reportTerrainTabError } from "../drop-actions";

import { TerrainFieldsRow } from "../components/fields-row";

import { getTerrainWorldSize } from "../dialogs/resize";

/** Id of the loading toast of the global operations (§1.12). */
export const TERRAIN_BUSY_TOAST_ID = "terrain-busy";

/** Delay of the live preview after a field change (§1.13.3). */
export const TERRAIN_GENERATE_PREVIEW_DELAY_MS = 150;

/** A request of the header menu ("Generate…") is kept this long while the Settings category mounts. */
const TERRAIN_GENERATE_REQUEST_LIFETIME_MS = 2000;

/** Resolutions and droplet counts from which the preview runs long enough to show a progress bar in the panel (§1.13.3). */
const TERRAIN_GENERATE_PROGRESS_MIN_SUBDIVISIONS = 512;
const TERRAIN_GENERATE_PROGRESS_MIN_DROPLETS = 20000;

/** Minimum interval between two updates of the loading toast of an operation. */
const TERRAIN_BUSY_TOAST_INTERVAL_MS = 100;

const TERRAIN_GENERATE_TYPE_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "fBm", value: "fbm" },
	{ text: "Ridged", value: "ridged" },
	{ text: "Billow", value: "billow" },
	{ text: "Islands", value: "islands" },
];

const TERRAIN_GENERATE_EDGE_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "None", value: "none" },
	{ text: "Island", value: "island" },
];

const TERRAIN_GENERATE_MODE_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "Replace", value: "replace" },
	{ text: "Add", value: "add" },
];

/**
 * Notified by openTerrainGeneratePanel: the Settings category opens its inline Generate panel (consumeTerrainGeneratePanelRequest).
 */
export const onTerrainGeneratePanelRequestedObservable: Observable<void> = new Observable<void>();

let terrainGeneratePanelRequestTime: number | null = null;

/**
 * Opens the inline Generate panel (header menu "Generate…", §1.5, §1.13.3): switches to the Settings category (external settings change) and
 * asks the Settings category to open the panel. The request is kept for 2 s, so the Settings content consumes it when it mounts.
 */
export function openTerrainGeneratePanel(): void {
	terrainGeneratePanelRequestTime = Date.now();

	updateTerrainSettings(
		(settings) => {
			settings.category = "settings";
		},
		["category"]
	);

	try {
		onTerrainGeneratePanelRequestedObservable.notifyObservers();
	} catch (e) {
		console.error(e);
	}
}

/**
 * Returns true (once) when openTerrainGeneratePanel was called less than 2 s ago.
 */
export function consumeTerrainGeneratePanelRequest(): boolean {
	const time = terrainGeneratePanelRequestTime;
	terrainGeneratePanelRequestTime = null;

	return time !== null && Date.now() - time <= TERRAIN_GENERATE_REQUEST_LIFETIME_MS;
}

/**
 * Runs a whole-terrain operation (§1.12: one undo entry, busy state held by the engine) with the loading toast
 * `toast.loading("{label}…", { id: "terrain-busy" })` updated with the progress then dismissed. Refusals and errors are reported, never thrown.
 * @param editor defines the editor reference.
 * @param mesh defines the terrain.
 * @param operation defines the operation to run.
 * @param label defines the label of the toast ("Smoothing", "Eroding"...).
 * @returns the result of the operation, null when it was refused or failed.
 */
export async function runTerrainOperationWithFeedback(editor: Editor, mesh: Mesh, operation: TerrainOperation, label: string): Promise<ITerrainOperationResult | null> {
	let lastUpdate = 0;

	try {
		toast.loading(`${label}…`, { id: TERRAIN_BUSY_TOAST_ID });

		const result = await applyTerrainOperation(editor, mesh, operation, {
			onProgress: (progress) => {
				try {
					const now = Date.now();
					if (now - lastUpdate >= TERRAIN_BUSY_TOAST_INTERVAL_MS) {
						lastUpdate = now;
						toast.loading(formatTerrainBusy(label, progress), { id: TERRAIN_BUSY_TOAST_ID });
					}
				} catch (e) {
					console.error(e);
				}
			},
		});

		toast.dismiss(TERRAIN_BUSY_TOAST_ID);
		return result;
	} catch (e) {
		toast.dismiss(TERRAIN_BUSY_TOAST_ID);
		reportTerrainTabError(editor, e);
		return null;
	}
}

/** Values of the Generate panel: the generator parameters and the mode (§1.13.3). */
export interface ITerrainGeneratePanelValues {
	params: ITerrainGenerateParams;
	mode: "replace" | "add";
}

/** Last values used on each terrain during the session (the panel reopens with them). */
const terrainGeneratePanelValues = new WeakMap<Mesh, ITerrainGeneratePanelValues>();

/**
 * Values of the Generate panel for a terrain: the values last used on it during the session, else createDefaultTerrainGenerateParams of its
 * world size (§8.1 rule 12) in "replace" mode.
 * @param mesh defines the terrain.
 */
export function getTerrainGeneratePanelValues(mesh: Mesh): ITerrainGeneratePanelValues {
	const stored = terrainGeneratePanelValues.get(mesh);
	if (stored) {
		return stored;
	}

	let width = 10240;
	let height = 10240;
	try {
		const info = getTerrainMeshInfo(mesh);
		const size = getTerrainWorldSize(mesh, info.width, info.height);
		width = size.width;
		height = size.height;
	} catch (e) {
		// Not a valid grid (the panel is only opened on terrains): the defaults of a new terrain are used.
	}

	const values: ITerrainGeneratePanelValues = {
		params: createDefaultTerrainGenerateParams(width, height),
		mode: "replace",
	};

	terrainGeneratePanelValues.set(mesh, values);
	return values;
}

/**
 * Random seed of the generator (31-bit integer, like createDefaultTerrainGenerateParams).
 */
export function createTerrainGenerateSeed(): number {
	return Math.floor(Math.random() * 0x80000000);
}

export interface ITerrainGeneratePanelProps {
	/** The editor reference. */
	editor: Editor;
	/** The terrain previewed (the parent keys the panel by terrain: a target change unmounts it, which cancels the preview). */
	mesh: Mesh;
	/** Called once when the panel must close: applied, cancelled, closed elsewhere (undo/redo, scene disposal) or refused at opening. */
	onClose: () => void;
}

interface ITerrainGeneratePanelState {
	/** Bumped when values change outside the fields (random seed, islands type): the fields re-key. */
	fieldsRevision: number;
	/** true once the preview transaction is open. */
	open: boolean;
	/** true while a preview apply runs. */
	applying: boolean;
	/** Progress (0..1) of the running apply, null when unknown. */
	progress: number | null;
	/** true after Apply was clicked, until the transaction closes. */
	committing: boolean;
}

/**
 * Inline, non-modal Generate panel of the Settings category (§1.13.3, D21): opening it opens a preview transaction (beginTerrainPreview,
 * refused while a stroke, an operation or another preview runs); every change is applied live (debounced 150 ms) through transaction.apply;
 * Apply commits one undo entry; Cancel, closing the panel, switching category, changing the target, unmounting the tab or an undo/redo of
 * the terrain cancels (the start state is restored). The viewport stays visible and navigable while the preview runs.
 */
export class TerrainGeneratePanel extends Component<ITerrainGeneratePanelProps, ITerrainGeneratePanelState> {
	private readonly _values: ITerrainGeneratePanelValues;
	private readonly _subdivisions: number;

	private _transaction: ITerrainPreviewTransaction | null = null;
	private _closedObserver: Observer<"commit" | "cancel"> | null = null;
	private _busyObserver: Observer<Readonly<ITerrainBusyInfo> | null> | null = null;

	private _applyTimeout: ReturnType<typeof setTimeout> | null = null;
	private _pendingApplies: number = 0;
	private _lastRequestedKey: string | null = null;

	private _closeNotified: boolean = false;
	private _unmounted: boolean = false;

	public constructor(props: ITerrainGeneratePanelProps) {
		super(props);

		this._values = getTerrainGeneratePanelValues(props.mesh);

		let subdivisions = 0;
		try {
			subdivisions = getTerrainMeshInfo(props.mesh).subdivisions;
		} catch (e) {
			// Unknown resolution: the progress bar follows the droplet count only.
		}

		this._subdivisions = subdivisions;

		this.state = {
			fieldsRevision: 0,
			open: false,
			applying: false,
			progress: null,
			committing: false,
		};
	}

	public componentDidMount(): void {
		try {
			const transaction = beginTerrainPreview(this.props.editor, this.props.mesh);

			this._transaction = transaction;
			this._closedObserver = transaction.onClosedObservable.add(() => this._notifyClose());
			this._busyObserver = onTerrainBusyChangedObservable.add((info) => this._handleBusyChanged(info));

			this.setState({ open: true });
			this._scheduleApply(0);
		} catch (e) {
			// Refused (a stroke, an operation or another preview runs, read-only terrain...): the refusal text is shown and the panel closes.
			reportTerrainTabError(this.props.editor, e);
			this._notifyClose();
		}
	}

	public componentWillUnmount(): void {
		this._unmounted = true;
		this._clearApplyTimeout();

		try {
			const transaction = this._transaction;

			if (this._closedObserver) {
				transaction?.onClosedObservable.remove(this._closedObserver);
				this._closedObserver = null;
			}

			if (this._busyObserver) {
				onTerrainBusyChangedObservable.remove(this._busyObserver);
				this._busyObserver = null;
			}

			// Closing the panel, switching category, changing the target or unmounting the tab cancels the preview (§1.13.3).
			if (transaction?.isOpen) {
				transaction.cancel();
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	public render(): ReactNode {
		const params = this._values.params;
		const revision = this.state.fieldsRevision;
		const disabled = !this.state.open || this.state.committing;

		const showProgress =
			this.state.applying && (this._subdivisions >= TERRAIN_GENERATE_PROGRESS_MIN_SUBDIVISIONS || params.erosionDroplets > TERRAIN_GENERATE_PROGRESS_MIN_DROPLETS);

		return (
			<EditorInspectorBlockField>
				<div className="flex items-center gap-2 px-2 text-sm font-semibold">
					<LuSparkles className="w-4 h-4" /> Generate
				</div>

				<div className="px-2 text-xs text-muted-foreground">Live preview: Apply keeps the result, Cancel restores the terrain. The viewport stays navigable.</div>

				<div className={`flex flex-col gap-2 w-full ${disabled ? "pointer-events-none opacity-50" : ""}`}>
					<EditorInspectorListField
						key={`type-${revision}`}
						object={params}
						property="type"
						label="Type"
						items={TERRAIN_GENERATE_TYPE_ITEMS}
						noUndoRedo
						onChange={(value) => this._handleTypeChanged(value)}
					/>

					<div className="flex items-center gap-1 w-full">
						<div className="flex-1 min-w-0">
							<EditorInspectorNumberField
								key={`seed-${revision}`}
								object={params}
								property="seed"
								label="Seed"
								step={1}
								noUndoRedo
								onChange={(value) => this._handleIntegerChanged("seed", value)}
							/>
						</div>

						<Button variant="ghost" size="icon" title="Random seed" className="w-8 h-8 shrink-0" onClick={() => this._handleRandomSeed()}>
							<LuDices className="w-4 h-4" />
						</Button>
					</div>

					<EditorInspectorNumberField
						key={`scale-${revision}`}
						object={params}
						property="scale"
						label="Scale (cm)"
						min={1}
						step={10}
						noUndoRedo
						onChange={() => this._handleValueChanged()}
					/>
					<TerrainFieldsRow label="Height (cm)">
						<EditorInspectorNumberField key={`min-${revision}`} object={params} property="minWorld" step={1} noUndoRedo onChange={() => this._handleValueChanged()} />
						<EditorInspectorNumberField key={`max-${revision}`} object={params} property="maxWorld" step={1} noUndoRedo onChange={() => this._handleValueChanged()} />
					</TerrainFieldsRow>
					<EditorInspectorNumberField
						key={`octaves-${revision}`}
						object={params}
						property="octaves"
						label="Octaves"
						min={1}
						max={10}
						step={1}
						noUndoRedo
						onChange={(value) => this._handleIntegerChanged("octaves", value)}
					/>
					<EditorInspectorNumberField
						key={`persistence-${revision}`}
						object={params}
						property="persistence"
						label="Persistence"
						min={0}
						max={1}
						step={0.01}
						noUndoRedo
						onChange={() => this._handleValueChanged()}
					/>
					<EditorInspectorNumberField
						key={`lacunarity-${revision}`}
						object={params}
						property="lacunarity"
						label="Lacunarity"
						min={1}
						max={4}
						step={0.01}
						noUndoRedo
						onChange={() => this._handleValueChanged()}
					/>
					<EditorInspectorNumberField
						key={`warp-${revision}`}
						object={params}
						property="warp"
						label="Warp"
						min={0}
						max={2}
						step={0.01}
						noUndoRedo
						onChange={() => this._handleValueChanged()}
					/>

					<EditorInspectorListField
						key={`edge-${revision}`}
						object={params}
						property="edgeFalloff"
						label="Edge falloff"
						items={TERRAIN_GENERATE_EDGE_ITEMS}
						noUndoRedo
						onChange={() => this._handleValueChanged()}
					/>

					<EditorInspectorNumberField
						key={`droplets-${revision}`}
						object={params}
						property="erosionDroplets"
						label="Erosion droplets"
						min={0}
						max={200000}
						step={100}
						noUndoRedo
						onChange={(value) => this._handleIntegerChanged("erosionDroplets", value)}
					/>
					<EditorInspectorNumberField
						key={`terraces-${revision}`}
						object={params}
						property="terraceSteps"
						label="Terrace steps"
						min={0}
						max={64}
						step={1}
						noUndoRedo
						onChange={(value) => this._handleIntegerChanged("terraceSteps", value)}
					/>

					<EditorInspectorListField
						key={`mode-${revision}`}
						object={this._values}
						property="mode"
						label="Mode"
						items={TERRAIN_GENERATE_MODE_ITEMS}
						noUndoRedo
						onChange={() => this._handleValueChanged()}
					/>
				</div>

				{showProgress && (
					<div className="flex flex-col gap-1 px-2">
						<Progress value={Math.round((this.state.progress ?? 0) * 100)} />
						<div className="text-xs text-muted-foreground">{formatTerrainBusy("Generating", this.state.progress ?? 0)}</div>
					</div>
				)}

				<div className="flex flex-wrap justify-end gap-2 px-2">
					<Button variant="secondary" size="sm" disabled={this.state.committing} onClick={() => this._handleCancel()}>
						Cancel
					</Button>
					<Button size="sm" disabled={!this.state.open || this.state.committing} onClick={() => void this._handleApply()}>
						{this.state.committing ? "Applying…" : "Apply"}
					</Button>
				</div>
			</EditorInspectorBlockField>
		);
	}

	private _getKey(): string {
		return JSON.stringify(this._values);
	}

	private _handleValueChanged(): void {
		try {
			terrainGeneratePanelValues.set(this.props.mesh, this._values);
			this._scheduleApply(TERRAIN_GENERATE_PREVIEW_DELAY_MS);
			this.forceUpdate();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleIntegerChanged(property: "seed" | "octaves" | "erosionDroplets" | "terraceSteps", value: number): void {
		this._values.params[property] = Math.round(value);
		this._handleValueChanged();
	}

	private _handleTypeChanged(value: string): void {
		// §8.1 rule 12: the islands type uses the island edge falloff.
		if (value === "islands" && this._values.params.edgeFalloff !== "island") {
			this._values.params.edgeFalloff = "island";
			this.setState({ fieldsRevision: this.state.fieldsRevision + 1 });
		}

		this._handleValueChanged();
	}

	private _handleRandomSeed(): void {
		this._values.params.seed = createTerrainGenerateSeed();
		this.setState({ fieldsRevision: this.state.fieldsRevision + 1 });
		this._handleValueChanged();
	}

	private _handleBusyChanged(info: Readonly<ITerrainBusyInfo> | null): void {
		try {
			if (this._unmounted || this._pendingApplies === 0) {
				return;
			}

			if (!info || (info.meshId !== null && info.meshId !== this.props.mesh.id)) {
				return;
			}

			this.setState({ progress: info.progress });
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _notifyClose(): void {
		if (this._closeNotified) {
			return;
		}

		this._closeNotified = true;

		try {
			this.props.onClose();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _clearApplyTimeout(): void {
		if (this._applyTimeout !== null) {
			clearTimeout(this._applyTimeout);
			this._applyTimeout = null;
		}
	}

	private _scheduleApply(delay: number): void {
		this._clearApplyTimeout();

		this._applyTimeout = setTimeout(() => {
			this._applyTimeout = null;
			this._applyPreview().catch((e) => reportTerrainTabError(this.props.editor, e));
		}, delay);
	}

	/**
	 * Applies the current values to the preview (the transaction restores the start state first and supersedes older applies).
	 * Rejects when the generation failed (the preview is then back at its start state).
	 */
	private async _applyPreview(): Promise<void> {
		const transaction = this._transaction;
		if (!transaction?.isOpen) {
			return;
		}

		const operation: TerrainOperation = {
			type: "generate",
			params: { ...this._values.params },
			mode: this._values.mode,
		};

		this._lastRequestedKey = this._getKey();
		++this._pendingApplies;

		if (!this._unmounted) {
			this.setState({ applying: true });
		}

		try {
			await transaction.apply(operation);
		} finally {
			--this._pendingApplies;

			if (!this._unmounted) {
				this.setState({
					applying: this._pendingApplies > 0,
					progress: this._pendingApplies > 0 ? this.state.progress : null,
				});
			}
		}
	}

	private async _handleApply(): Promise<void> {
		const transaction = this._transaction;
		if (!transaction?.isOpen || this.state.committing) {
			return;
		}

		this.setState({ committing: true });

		try {
			// The last change may not be previewed yet: apply it first, so the committed state is the one shown by the fields.
			if (this._applyTimeout !== null || this._lastRequestedKey !== this._getKey()) {
				this._clearApplyTimeout();
				await this._applyPreview();
			}

			// One undo entry (deferred by the transaction until a running apply ends); the panel closes on onClosedObservable.
			transaction.commit();
		} catch (e) {
			if (!this._unmounted) {
				this.setState({ committing: false });
			}

			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleCancel(): void {
		try {
			this._clearApplyTimeout();
			this._transaction?.cancel();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}

		this._notifyClose();
	}
}
