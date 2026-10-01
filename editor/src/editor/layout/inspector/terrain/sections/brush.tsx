import { ReactNode, useMemo } from "react";

import type { AbstractMesh, Mesh } from "babylonjs";

import type { Editor } from "../../../../main";

import { TerrainGrid } from "../../../../../tools/terrain/core/grid";
import { getActiveTerrainTool, getTerrainBrushRadiusRange } from "../../../../../tools/terrain/core/settings";
import type { ITerrainMetric, TerrainTool } from "../../../../../tools/terrain/core/types";
import { getTerrainMeshInfo } from "../../../../../tools/terrain/engine/info";
import type { ITerrainInfo } from "../../../../../tools/terrain/engine/types";

import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSwitchField } from "../../fields/switch";
import { EditorInspectorSectionField } from "../../fields/section";
import { EditorInspectorListField, type IEditorInspectorListFieldItem } from "../../fields/list";

import { reportTerrainTabError } from "../drop-actions";
import type { ITerrainViewportStatus, TerrainViewportController } from "../viewport/controller";
import { getTerrainSettingsExternalRevision, notifyTerrainSettingsChanged, terrainSettings } from "../settings";

import { TerrainDropZone } from "../components/drop-zone";
import { TerrainFalloffPreview } from "../components/falloff-preview";
import { TerrainCollapsibleBlock } from "../components/collapsible-block";

import { getTerrainBrushDisplayName, TerrainBrushPalette, useTerrainBrushLibraryRevision } from "./palette";
import { isTerrainAirbrushTool, TERRAIN_TOOL_NAMES, useTerrainSettingsRevision } from "./tools";

/** Radius range used when the target terrain is unknown (the clamp of the persisted settings, core/settings.ts). */
export const TERRAIN_BRUSH_FALLBACK_RADIUS_RANGE: Readonly<{ min: number; max: number; step: number }> = { min: 0.01, max: 100000, step: 1 };

/** Items of the Falloff list (§1.8). */
export const TERRAIN_FALLOFF_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "Smooth", value: "smooth" },
	{ text: "Linear", value: "linear" },
	{ text: "Spherical", value: "spherical" },
	{ text: "Sharp", value: "sharp" },
	{ text: "Constant", value: "constant" },
	{ text: "Gaussian", value: "gaussian" },
];

/** Items of the Symmetry list (§1.8). */
export const TERRAIN_SYMMETRY_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "None", value: "none" },
	{ text: "X", value: "x" },
	{ text: "Z", value: "z" },
	{ text: "X and Z", value: "xz" },
];

/** Value adapter of the percent fields: `value` reads and writes `object[property]` × 100 (§1.4). */
export interface ITerrainPercentAdapter {
	value: number;
}

/**
 * Percent adapter of a 0..1 settings value (§1.4: `{ get value() { return s × 100 }, set value(v) { s = v / 100 } }`). The getter rounds to
 * 3 decimals so the field never shows floating point noise (0.35 × 100 = 35.00000000000001).
 * @param object defines the object holding the fraction.
 * @param property defines the property of the fraction.
 */
export function createTerrainPercentAdapter(object: object, property: string): ITerrainPercentAdapter {
	const target = object as Record<string, unknown>;

	return {
		get value(): number {
			const value = Number(target[property]);
			return Number.isFinite(value) ? Math.round(value * 100 * 1000) / 1000 : 0;
		},
		set value(value: number) {
			target[property] = value / 100;
		},
	};
}

/**
 * Key of a settings field (§1.4): changes only when a value changed from OUTSIDE the fields (updateTerrainSettings/resetTerrainSettings),
 * so a field never remounts while the user types or drags it.
 * @param property defines the property bound to the field.
 */
export function getTerrainSettingsFieldKey(property: string): string {
	let externalRevision = 0;
	try {
		externalRevision = getTerrainSettingsExternalRevision();
	} catch (e) {
		externalRevision = 0;
	}

	return `${property}-${externalRevision}`;
}

export interface ITerrainSettingsFieldProps {
	/** Object of the terrainSettings singleton holding the value (e.g. terrainSettings.brush). */
	object: object;
	/** Property of the object (a plain key, never a dotted path). */
	property: string;
	/** Label of the field (none for the fields of a TerrainFieldsRow). */
	label?: ReactNode;
	/** Keys notified with notifyTerrainSettingsChanged after an edit; default [property]. */
	keys?: string[];
	/** Optional tooltip of the field. */
	tooltip?: ReactNode;
	/** Editor reference (error reports). */
	editor?: Editor | null;
}

export interface ITerrainSettingsNumberFieldProps extends ITerrainSettingsFieldProps {
	/** Range and step in DISPLAYED units (percent fields: 0..100). */
	min?: number;
	max?: number;
	step?: number;
	/** Integer field: the stored value is rounded in onChange (§1.4). */
	integer?: boolean;
	/** The stored value is a 0..1 fraction shown in percent (percent adapter, §1.4). */
	percent?: boolean;
	/** Called after an edit with the STORED value (fraction for percent fields). */
	onChange?: (value: number) => void;
}

/**
 * Number field bound to the terrainSettings singleton (§1.4): `noUndoRedo`, keyed by the external revision, notifies with
 * notifyTerrainSettingsChanged (persisted, no remount), integers rounded and percentages adapted.
 */
export function TerrainSettingsNumberField(props: ITerrainSettingsNumberFieldProps): JSX.Element {
	const adapter = useMemo(() => (props.percent ? createTerrainPercentAdapter(props.object, props.property) : null), [props.object, props.property, props.percent]);

	function handleChange(): void {
		try {
			const target = props.object as Record<string, unknown>;
			if (props.integer) {
				const value = Number(target[props.property]);
				if (Number.isFinite(value)) {
					target[props.property] = Math.round(value);
				}
			}

			notifyTerrainSettingsChanged(props.keys ?? [props.property]);
			props.onChange?.(Number(target[props.property]));
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	return (
		<EditorInspectorNumberField
			key={getTerrainSettingsFieldKey(props.property)}
			noUndoRedo
			object={adapter ?? props.object}
			property={adapter ? "value" : props.property}
			label={props.label}
			tooltip={props.tooltip}
			min={props.min}
			max={props.max}
			step={props.step ?? (props.integer ? 1 : undefined)}
			onChange={() => handleChange()}
		/>
	);
}

export interface ITerrainSettingsSwitchFieldProps extends ITerrainSettingsFieldProps {
	disabled?: boolean;
	/** Called after an edit with the new value. */
	onChange?: (value: boolean) => void;
}

/**
 * Switch field bound to the terrainSettings singleton (§1.4): `noUndoRedo`, keyed by the external revision, notifies with
 * notifyTerrainSettingsChanged.
 */
export function TerrainSettingsSwitchField(props: ITerrainSettingsSwitchFieldProps): JSX.Element {
	function handleChange(value: boolean): void {
		try {
			notifyTerrainSettingsChanged(props.keys ?? [props.property]);
			props.onChange?.(value);
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	return (
		<EditorInspectorSwitchField
			key={getTerrainSettingsFieldKey(props.property)}
			noUndoRedo
			object={props.object}
			property={props.property}
			label={props.label}
			tooltip={props.tooltip}
			disabled={props.disabled}
			onChange={(value) => handleChange(value)}
		/>
	);
}

export interface ITerrainSettingsListFieldProps extends ITerrainSettingsFieldProps {
	/** Items of the list (keep the array identity stable between renders when possible). */
	items: IEditorInspectorListFieldItem[];
	/** Called after an edit with the new value. */
	onChange?: (value: any) => void;
}

/**
 * List field bound to the terrainSettings singleton (§1.4): `noUndoRedo`, keyed by the external revision, notifies with
 * notifyTerrainSettingsChanged.
 */
export function TerrainSettingsListField(props: ITerrainSettingsListFieldProps): JSX.Element {
	function handleChange(value: any): void {
		try {
			notifyTerrainSettingsChanged(props.keys ?? [props.property]);
			props.onChange?.(value);
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	return (
		<EditorInspectorListField
			key={getTerrainSettingsFieldKey(props.property)}
			noUndoRedo
			object={props.object}
			property={props.property}
			label={props.label}
			items={props.items}
			onChange={(value) => handleChange(value)}
		/>
	);
}

/**
 * World length (cm) of the mesh's local unit axes, read from the rows of Babylon's row-vector world matrix as Matrix.decompose does (§4.1):
 * sx = |(m0, m1, m2)|, sy = |(m4, m5, m6)|, sz = |(m8, m9, m10)|. null when a component is degenerate (< 1e-6) or the matrix is unavailable.
 * @param mesh defines the mesh.
 */
export function getTerrainMeshMetric(mesh: AbstractMesh | null | undefined): ITerrainMetric | null {
	if (!mesh) {
		return null;
	}

	try {
		const m = mesh.getWorldMatrix().m;
		const sx = Math.hypot(m[0], m[1], m[2]);
		const sy = Math.hypot(m[4], m[5], m[6]);
		const sz = Math.hypot(m[8], m[9], m[10]);

		if (![sx, sy, sz].every((value) => Number.isFinite(value) && value >= 1e-6)) {
			return null;
		}

		return { sx, sy, sz };
	} catch (e) {
		return null;
	}
}

/**
 * Information of a terrain (getTerrainMeshInfo), null when unavailable (not a valid grid, disposed mesh...). Never throws.
 * @param mesh defines the terrain.
 */
export function getTerrainInfoSafe(mesh: Mesh | null | undefined): ITerrainInfo | null {
	if (!mesh || mesh.isDisposed()) {
		return null;
	}

	try {
		return getTerrainMeshInfo(mesh);
	} catch (e) {
		return null;
	}
}

/**
 * Smallest world cell size (cm) of a terrain: min(cellX sx, cellZ sz) (§4.17). null when unknown.
 * @param info defines the information of the terrain (local cell sizes).
 * @param metric defines the metric of the terrain.
 */
export function getTerrainWorldCellSize(info: Pick<ITerrainInfo, "cellX" | "cellZ"> | null, metric: ITerrainMetric | null): number | null {
	if (!info || !metric) {
		return null;
	}

	const cell = Math.min(info.cellX * metric.sx, info.cellZ * metric.sz);
	return Number.isFinite(cell) && cell > 0 ? cell : null;
}

/**
 * Rounds a field step to 2 significant digits (the NumberField drag increment and display precision): 3.125 → 3.1, 10 → 10, 0.3125 → 0.31.
 * @param step defines the raw step.
 */
export function roundTerrainFieldStep(step: number): number {
	if (!Number.isFinite(step) || step <= 0) {
		return 1;
	}

	return Number(step.toPrecision(2));
}

/**
 * Range of the Radius field (§1.8, §4.17): getTerrainBrushRadiusRange of the target terrain (min 1.5 cells, max half the world diagonal,
 * step a quarter cell rounded to 2 significant digits), TERRAIN_BRUSH_FALLBACK_RADIUS_RANGE when the terrain is unknown.
 * @param info defines the information of the target terrain (subdivisions and local size).
 * @param metric defines the metric of the target terrain.
 */
export function getTerrainBrushRadiusFieldRange(
	info: Pick<ITerrainInfo, "subdivisions" | "width" | "height"> | null,
	metric: ITerrainMetric | null
): { min: number; max: number; step: number } {
	if (!info || !metric) {
		return { ...TERRAIN_BRUSH_FALLBACK_RADIUS_RANGE };
	}

	try {
		const grid = new TerrainGrid(info.subdivisions, info.width, info.height);
		const range = getTerrainBrushRadiusRange(grid, metric);

		if (![range.min, range.max, range.step].every((value) => Number.isFinite(value)) || range.min <= 0 || range.max <= range.min) {
			return { ...TERRAIN_BRUSH_FALLBACK_RADIUS_RANGE };
		}

		return {
			min: range.min,
			max: range.max,
			step: roundTerrainFieldStep(range.step),
		};
	} catch (e) {
		return { ...TERRAIN_BRUSH_FALLBACK_RADIUS_RANGE };
	}
}

/**
 * Tool whose strength and airbrush the Brush section edits: the active tool, else the Sculpt tool (Settings category).
 */
export function getTerrainBrushSectionTool(): TerrainTool {
	return getActiveTerrainTool(terrainSettings) ?? terrainSettings.sculptTool ?? "raise";
}

export interface ITerrainBrushSectionProps {
	/** Editor reference. */
	editor: Editor;
	/** Target terrain of the tab. */
	mesh: Mesh;
	/** Viewport controller of the tab (brush shape refresh, brush capture); null while none is mounted. */
	controller: TerrainViewportController | null;
	/** Information of the target (radius range, drop routing); computed with getTerrainMeshInfo when omitted. */
	info?: ITerrainInfo | null;
	/** Last status of the viewport controller (capture state of the palette). */
	status?: Readonly<ITerrainViewportStatus> | null;
}

/**
 * "Brush" section of the Sculpt and Paint categories (§1.8, §1.9): label = the selected brush name; the palette; Radius (range relative to
 * the terrain), Strength (per tool), Hardness and Falloff (with its profile) always visible; "Stroke & jitter" and "Pen & image" collapsible
 * blocks. The whole section is a routed drop zone ("brush-section": images go to the brush library, folders expanded).
 */
export function TerrainBrushSection(props: ITerrainBrushSectionProps): JSX.Element {
	useTerrainSettingsRevision();
	useTerrainBrushLibraryRevision();

	const info = props.info === undefined ? getTerrainInfoSafe(props.mesh) : props.info;
	const metric = getTerrainMeshMetric(props.mesh);
	const range = getTerrainBrushRadiusFieldRange(info, metric);

	const brush = terrainSettings.brush;
	const tool = getTerrainBrushSectionTool();

	function refreshBrushShape(): void {
		try {
			props.controller?.refreshBrushShape();
		} catch (e) {
			reportTerrainTabError(props.editor, e);
		}
	}

	return (
		<TerrainDropZone
			editor={props.editor}
			mesh={props.mesh}
			overlay
			className="w-full rounded-lg"
			context={{
				zone: "brush-section",
				isTerrain: !!info,
				hasTerrainMaterial: !!info?.material?.isTerrainMaterial,
				layerCount: info?.layers.length ?? 0,
			}}
		>
			<EditorInspectorSectionField title="Brush" label={getTerrainBrushDisplayName(brush.brushId)}>
				<TerrainBrushPalette editor={props.editor} controller={props.controller} status={props.status} />

				<TerrainSettingsNumberField
					editor={props.editor}
					object={brush}
					property="radius"
					label="Radius"
					keys={["brush.radius"]}
					min={range.min}
					max={range.max}
					step={range.step}
				/>

				<TerrainSettingsNumberField
					editor={props.editor}
					object={terrainSettings.strength}
					property={tool}
					label="Strength"
					keys={["strength", `strength.${tool}`]}
					percent
					min={0}
					max={100}
					step={1}
				/>

				<TerrainSettingsNumberField
					editor={props.editor}
					object={brush}
					property="hardness"
					label="Hardness"
					keys={["brush.hardness"]}
					percent
					min={0}
					max={95}
					step={1}
					onChange={() => refreshBrushShape()}
				/>

				<div className="flex flex-wrap items-center gap-y-2 w-full">
					<div className="flex-1 min-w-[160px]">
						<TerrainSettingsListField
							editor={props.editor}
							object={brush}
							property="falloff"
							label="Falloff"
							keys={["brush.falloff"]}
							items={TERRAIN_FALLOFF_ITEMS}
							onChange={() => refreshBrushShape()}
						/>
					</div>
					<div className="px-2">
						<TerrainFalloffPreview falloff={brush.falloff} hardness={brush.hardness} className="w-[72px] h-[29px]" />
					</div>
				</div>

				<TerrainCollapsibleBlock id="stroke-jitter" title="Stroke & jitter">
					<TerrainSettingsNumberField
						editor={props.editor}
						object={brush}
						property="spacing"
						label="Spacing"
						keys={["brush.spacing"]}
						percent
						min={2}
						max={200}
						step={1}
					/>
					<TerrainSettingsNumberField editor={props.editor} object={brush} property="rotation" label="Rotation" keys={["brush.rotation"]} min={-180} max={180} step={1} />
					<TerrainSettingsSwitchField editor={props.editor} object={brush} property="followStroke" label="Follow stroke direction" keys={["brush.followStroke"]} />
					<TerrainSettingsNumberField
						editor={props.editor}
						object={brush}
						property="positionJitter"
						label="Position jitter"
						keys={["brush.positionJitter"]}
						percent
						min={0}
						max={100}
						step={1}
					/>
					<TerrainSettingsNumberField
						editor={props.editor}
						object={brush}
						property="rotationJitter"
						label="Rotation jitter"
						keys={["brush.rotationJitter"]}
						min={0}
						max={180}
						step={1}
					/>
					<TerrainSettingsNumberField
						editor={props.editor}
						object={brush}
						property="sizeJitter"
						label="Size jitter"
						keys={["brush.sizeJitter"]}
						percent
						min={0}
						max={100}
						step={1}
					/>
					<TerrainSettingsNumberField
						editor={props.editor}
						object={brush}
						property="strengthJitter"
						label="Strength jitter"
						keys={["brush.strengthJitter"]}
						percent
						min={0}
						max={100}
						step={1}
					/>
					{isTerrainAirbrushTool(tool) && (
						<TerrainSettingsSwitchField
							editor={props.editor}
							object={terrainSettings.airbrush}
							property={tool}
							label="Airbrush"
							tooltip={`${TERRAIN_TOOL_NAMES[tool]}: keeps applying while the pointer is still (30 dabs per second).`}
							keys={["airbrush", `airbrush.${tool}`]}
						/>
					)}
					<TerrainSettingsNumberField
						editor={props.editor}
						object={brush}
						property="smoothing"
						label="Stroke smoothing"
						keys={["brush.smoothing"]}
						percent
						min={0}
						max={95}
						step={1}
					/>
					<TerrainSettingsListField editor={props.editor} object={brush} property="symmetry" label="Symmetry" keys={["brush.symmetry"]} items={TERRAIN_SYMMETRY_ITEMS} />
				</TerrainCollapsibleBlock>

				<TerrainCollapsibleBlock id="pen-image" title="Pen & image">
					<TerrainSettingsSwitchField editor={props.editor} object={brush} property="pressureSize" label="Pressure → size" keys={["brush.pressureSize"]} />
					{brush.pressureSize && (
						<TerrainSettingsNumberField
							editor={props.editor}
							object={brush}
							property="pressureSizeMin"
							label="Minimum size"
							keys={["brush.pressureSizeMin"]}
							percent
							min={0}
							max={100}
							step={1}
						/>
					)}
					<TerrainSettingsSwitchField editor={props.editor} object={brush} property="pressureStrength" label="Pressure → strength" keys={["brush.pressureStrength"]} />
					<TerrainSettingsSwitchField
						editor={props.editor}
						object={brush}
						property="edgeFalloff"
						label="Edge falloff (image brushes)"
						keys={["brush.edgeFalloff"]}
						onChange={() => refreshBrushShape()}
					/>
					<TerrainSettingsSwitchField
						editor={props.editor}
						object={brush}
						property="applyBrushDefaults"
						label="Apply brush defaults"
						tooltip="Selecting a brush applies the defaults stored with it (Brush settings…)."
						keys={["brush.applyBrushDefaults"]}
					/>
				</TerrainCollapsibleBlock>
			</EditorInspectorSectionField>
		</TerrainDropZone>
	);
}
