import { Component, ReactNode } from "react";

import { LuDices, LuLink2, LuUnlink2 } from "react-icons/lu";

import { Color3, type Mesh } from "babylonjs";
import type { ITerrainLayerData } from "babylonjs-editor-tools";

import type { Editor } from "../../../../main";

import { Button } from "../../../../../ui/shadcn/ui/button";

import type { ITerrainAutoPaintRule } from "../../../../../tools/terrain/core/types";
import { getTerrainMeshInfo, getTerrainPlugin } from "../../../../../tools/terrain/engine/info";
import { createTerrainLayerProxy, getTerrainAutoPaintRules, setTerrainAutoPaintRules, updateTerrainMaterialLayer } from "../../../../../tools/terrain/engine/layers";
import type { ITerrainLayerProxy } from "../../../../../tools/terrain/engine/types";

import { EditorInspectorBlockField } from "../../fields/block";
import { EditorInspectorColorField } from "../../fields/color";
import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSwitchField } from "../../fields/switch";
import { EditorInspectorStringField } from "../../fields/string";
import { EditorInspectorListField, type IEditorInspectorListFieldItem } from "../../fields/list";

import { reportTerrainTabError } from "../drop-actions";
import { TerrainMapSlot } from "../components/map-slot";
import { TerrainFieldsRow } from "../components/fields-row";
import { TerrainCollapsibleBlock } from "../components/collapsible-block";

/** Delay of the commit of the auto-paint rule fields (one undo entry per settled edit). */
export const TERRAIN_AUTO_PAINT_COMMIT_DELAY_MS = 400;

/** Tile sizes accepted by the layer data (cm, §5.7). */
const TERRAIN_TILE_SIZE_MIN = 1;
const TERRAIN_TILE_SIZE_MAX = 100000;

const TERRAIN_NORMAL_CONVENTION_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "OpenGL", value: "opengl" },
	{ text: "DirectX", value: "directx" },
];

const TERRAIN_CHANNEL_ITEMS: IEditorInspectorListFieldItem[] = [
	{ text: "R", value: "r" },
	{ text: "G", value: "g" },
	{ text: "B", value: "b" },
	{ text: "A", value: "a" },
	{ text: "Luminance", value: "luminance" },
];

/** Aspect lock of the tile size per layer id, for the session (default on). */
const terrainTileAspectLocks = new Map<string, boolean>();

/**
 * Whether the tile size of a layer keeps its aspect ratio (LuLink2 toggle, default on).
 * @param layerId defines the id of the layer.
 */
export function isTerrainTileAspectLocked(layerId: string): boolean {
	return terrainTileAspectLocks.get(layerId) ?? true;
}

/**
 * Tile size with the aspect lock: the edited axis gets `value`, the other one keeps the ratio Z / X captured when the lock was taken.
 * @param axis defines the edited axis.
 * @param value defines the new size of the edited axis (cm).
 * @param ratio defines the ratio Z / X.
 */
export function getTerrainLockedTileSize(axis: "x" | "z", value: number, ratio: number): [number, number] {
	const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
	return axis === "x" ? [value, value * safeRatio] : [value / safeRatio, value];
}

function isSameTerrainTint(a: readonly number[], b: readonly number[]): boolean {
	return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6 && Math.abs(a[2] - b[2]) < 1e-6;
}

function clampTerrainTintChannel(value: number): number {
	return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function readTerrainLayer(mesh: Mesh, layerId: string): Readonly<ITerrainLayerData> | null {
	return getTerrainPlugin(mesh)?.data.layers.find((layer) => layer.id === layerId) ?? null;
}

/**
 * Color3-like view of the tint of one layer (sRGB 0..1) for EditorInspectorColorField (§1.10): channel writes and color picker changes update
 * the layer live (updateLayer with undo false, reason "layer-edit"); commit() registers the undo entry of a picker session (onFinishChange).
 * The channel fields of the ColorField register their own undo entries on this object, which replay through the same setters.
 * The object captures its terrain and layer, so undo entries keep working after the details show another layer.
 */
export class TerrainLayerTintColor {
	private readonly _editor: Editor;
	private readonly _mesh: Mesh;
	private readonly _layerId: string;

	private _last: [number, number, number];
	private _sessionStart: [number, number, number] | null = null;

	public constructor(editor: Editor, mesh: Mesh, layerId: string) {
		this._editor = editor;
		this._mesh = mesh;
		this._layerId = layerId;

		const layer = readTerrainLayer(mesh, layerId);
		this._last = layer ? [layer.tint[0], layer.tint[1], layer.tint[2]] : [1, 1, 1];
	}

	public get r(): number {
		return this._read()[0];
	}

	public set r(value: number) {
		this._writeChannel(0, value);
	}

	public get g(): number {
		return this._read()[1];
	}

	public set g(value: number) {
		this._writeChannel(1, value);
	}

	public get b(): number {
		return this._read()[2];
	}

	public set b(value: number) {
		this._writeChannel(2, value);
	}

	/**
	 * Color picker change: the first change of a picker session remembers the tint the session started from (undo entry of commit()).
	 * @param r defines the red channel (0..1).
	 * @param g defines the green channel (0..1).
	 * @param b defines the blue channel (0..1).
	 */
	public set(r: number, g: number, b: number): TerrainLayerTintColor {
		this._sessionStart ??= this._read().slice() as [number, number, number];
		this._write([r, g, b]);
		return this;
	}

	public clone(): Color3 {
		const tint = this._read();
		return new Color3(tint[0], tint[1], tint[2]);
	}

	public equals(other: { r: number; g: number; b: number } | null | undefined): boolean {
		return !!other && isSameTerrainTint(this._read(), [other.r, other.g, other.b]);
	}

	public toHexString(): string {
		return this.clone().toHexString();
	}

	public getClassName(): string {
		return "Color3";
	}

	/**
	 * Registers one undo entry for the picker session that just finished (updateLayer with undo true and the tint the session started from).
	 * @param old defines the value known by the field when the session started (used when no change was seen).
	 */
	public commit(old: { r: number; g: number; b: number } | null | undefined): void {
		const previous = this._sessionStart ?? (old ? [old.r, old.g, old.b] : null);
		this._sessionStart = null;

		const current = this._read().slice() as [number, number, number];
		if (!previous || isSameTerrainTint(previous, current)) {
			return;
		}

		updateTerrainMaterialLayer(this._mesh, this._layerId, { tint: current }, { undo: true, previous: { tint: [previous[0], previous[1], previous[2]] } });
	}

	private _read(): [number, number, number] {
		try {
			const layer = readTerrainLayer(this._mesh, this._layerId);
			if (layer) {
				this._last = [layer.tint[0], layer.tint[1], layer.tint[2]];
			}
		} catch (e) {
			// The last known tint is kept.
		}

		return this._last;
	}

	private _writeChannel(index: number, value: number): void {
		const tint = this._read().slice() as [number, number, number];
		tint[index] = value;
		this._write(tint);
	}

	private _write(tint: readonly number[]): void {
		const next: [number, number, number] = [clampTerrainTintChannel(tint[0]), clampTerrainTintChannel(tint[1]), clampTerrainTintChannel(tint[2])];
		if (isSameTerrainTint(next, this._read())) {
			return;
		}

		try {
			updateTerrainMaterialLayer(this._mesh, this._layerId, { tint: next }, { undo: false });
			this._last = next;
		} catch (e) {
			// Field setters never throw into the inspector (§1.2).
			reportTerrainTabError(this._editor, e);
		}
	}
}

/**
 * Tile size of one axis with the aspect lock on (§1.10): writing it updates both sizes live (updateLayer with undo false) with the ratio Z / X
 * captured at creation. The number field registers its own undo entry on this object (it replays through the setter, restoring both sizes).
 */
export class TerrainLockedTileSize {
	private readonly _editor: Editor;
	private readonly _mesh: Mesh;
	private readonly _layerId: string;
	private readonly _axis: "x" | "z";
	private readonly _ratio: number;
	private _last: number;

	public constructor(editor: Editor, mesh: Mesh, layerId: string, axis: "x" | "z", ratio: number) {
		this._editor = editor;
		this._mesh = mesh;
		this._layerId = layerId;
		this._axis = axis;
		this._ratio = ratio;

		this._last = readTerrainLayer(mesh, layerId)?.tileSize[axis === "x" ? 0 : 1] ?? 200;
	}

	public get value(): number {
		try {
			const layer = readTerrainLayer(this._mesh, this._layerId);
			if (layer) {
				this._last = layer.tileSize[this._axis === "x" ? 0 : 1];
			}
		} catch (e) {
			// The last known size is kept.
		}

		return this._last;
	}

	public set value(value: number) {
		if (!Number.isFinite(value) || value <= 0) {
			return;
		}

		try {
			updateTerrainMaterialLayer(this._mesh, this._layerId, { tileSize: getTerrainLockedTileSize(this._axis, value, this._ratio) }, { undo: false });
		} catch (e) {
			reportTerrainTabError(this._editor, e);
		}
	}
}

/** Editable copy of an auto-paint rule (§1.10.1): the optional bands are switches with their values kept while switched off. */
export interface ITerrainAutoPaintDraft {
	enabled: boolean;
	heightEnabled: boolean;
	minWorld: number;
	maxWorld: number;
	featherWorld: number;
	slopeEnabled: boolean;
	minDegrees: number;
	maxDegrees: number;
	featherDegrees: number;
	noiseEnabled: boolean;
	scale: number;
	amount: number;
	seed: number;
	opacity: number;
}

/**
 * Draft of the auto-paint rule of a layer: the stored rule, else a disabled rule whose height band defaults to the given world range.
 * @param rule defines the stored rule, null when the layer has none.
 * @param heightRange defines the world height range (cm) of the terrain, used by the default height band.
 */
export function createTerrainAutoPaintDraft(rule: ITerrainAutoPaintRule | null, heightRange: [number, number]): ITerrainAutoPaintDraft {
	const minWorld = Number.isFinite(heightRange[0]) ? heightRange[0] : 0;
	const maxWorld = Number.isFinite(heightRange[1]) && heightRange[1] - minWorld >= 1 ? heightRange[1] : minWorld + 1000;

	return {
		enabled: rule?.enabled ?? false,
		heightEnabled: !!rule?.height,
		minWorld: rule?.height?.minWorld ?? Math.round(minWorld),
		maxWorld: rule?.height?.maxWorld ?? Math.round(maxWorld),
		featherWorld: rule?.height?.featherWorld ?? 50,
		slopeEnabled: !!rule?.slope,
		minDegrees: rule?.slope?.minDegrees ?? 0,
		maxDegrees: rule?.slope?.maxDegrees ?? 30,
		featherDegrees: rule?.slope?.featherDegrees ?? 5,
		noiseEnabled: !!rule?.noise,
		scale: rule?.noise?.scale ?? 500,
		amount: rule?.noise?.amount ?? 0.5,
		seed: rule?.noise?.seed ?? 1,
		opacity: rule?.opacity ?? 1,
	};
}

/**
 * Auto-paint rule of a layer from its draft (§1.10.1): switched-off bands are null; feathers >= 0, noise scale >= 1 cm, amount and opacity 0..1,
 * integer seed.
 * @param layerId defines the id of the layer.
 * @param draft defines the draft.
 */
export function createTerrainAutoPaintRuleFromDraft(layerId: string, draft: ITerrainAutoPaintDraft): ITerrainAutoPaintRule {
	const clamp01 = (value: number): number => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
	const nonNegative = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

	return {
		layerId,
		enabled: draft.enabled,
		height: draft.heightEnabled
			? {
					minWorld: Math.min(draft.minWorld, draft.maxWorld),
					maxWorld: Math.max(draft.minWorld, draft.maxWorld),
					featherWorld: nonNegative(draft.featherWorld),
				}
			: null,
		slope: draft.slopeEnabled
			? {
					minDegrees: Math.min(90, Math.max(0, Math.min(draft.minDegrees, draft.maxDegrees))),
					maxDegrees: Math.min(90, Math.max(0, Math.max(draft.minDegrees, draft.maxDegrees))),
					featherDegrees: nonNegative(draft.featherDegrees),
				}
			: null,
		noise: draft.noiseEnabled
			? {
					scale: Number.isFinite(draft.scale) ? Math.max(1, draft.scale) : 500,
					amount: clamp01(draft.amount),
					seed: Number.isFinite(draft.seed) ? Math.round(draft.seed) : 1,
				}
			: null,
		opacity: clamp01(draft.opacity),
	};
}

export interface ITerrainAutoPaintRuleBlockProps {
	editor: Editor;
	mesh: Mesh;
	layerId: string;
	disabled: boolean;
	runOwnChange: (change: () => void) => void;
}

export interface ITerrainAutoPaintRuleBlockState {
	/** Bumped when a switch shows or hides fields, or the draft changes outside its fields (seed, rule reloaded): the fields re-key. */
	revision: number;
}

/**
 * "Auto-paint rule" collapsible block of the active layer (§1.10.1): Enabled; Height band min/max (world cm) + feather; Slope band min/max (°) +
 * feather; Noise scale (cm), amount (0–1), seed; Opacity (0–1). The fields edit a draft (no remount while typing or dragging) committed with
 * Switches at once, number fields 400 ms after the last change, when the field is left, when a
 * drag ends, and before undo/redo (so the undo reverts that edit instead of the previous entry, whose redo a late commit would cut).
 * The parent keys the block by layer and fields revision, so undo/redo and external changes reload the draft.
 */
export class TerrainAutoPaintRuleBlock extends Component<ITerrainAutoPaintRuleBlockProps, ITerrainAutoPaintRuleBlockState> {
	private readonly _draft: ITerrainAutoPaintDraft;
	/** World height range used by the default height band of a layer without rule. */
	private readonly _heightRange: [number, number];
	/** Stored rule the draft was created from (JSON, "null" without rule). */
	private _loadedRule: string;

	private _commitTimeout: ReturnType<typeof setTimeout> | null = null;

	public constructor(props: ITerrainAutoPaintRuleBlockProps) {
		super(props);

		let heightRange: [number, number] = [0, 1000];
		try {
			heightRange = getTerrainMeshInfo(props.mesh).worldHeightRange;
		} catch (e) {
			// Defaults are used.
		}

		const rule = this._readRule();

		this._heightRange = heightRange;
		this._loadedRule = JSON.stringify(rule);
		this._draft = createTerrainAutoPaintDraft(rule, heightRange);

		this.state = {
			revision: 0,
		};
	}

	public componentDidMount(): void {
		// When the parent re-keys the block, the previous block commits its pending edit in its componentWillUnmount, AFTER this block's
		// constructor read the rules: read them again, so the fields show (and a later edit commits) the stored rule, not the older one.
		this._reloadRule();
	}

	public componentWillUnmount(): void {
		// A pending edit is not lost when the layer or the tab changes.
		this._commitPending();
	}

	public render(): ReactNode {
		const draft = this._draft;
		const revision = this.state.revision;

		return (
			<TerrainCollapsibleBlock id="auto-paint-rule" title="Auto-paint rule" label={draft.enabled ? "On" : "Off"}>
				{/* The end of a pointer-locked drag of a number field (mouseup on the locked input, bubbling here) commits it at once. */}
				<div className={`flex flex-col gap-2 w-full ${this.props.disabled ? "pointer-events-none opacity-50" : ""}`} onMouseUp={() => this._commitPending()}>
					<EditorInspectorSwitchField key={`enabled-${revision}`} object={draft} property="enabled" label="Enabled" noUndoRedo onChange={() => this._commitNow()} />

					<EditorInspectorSwitchField
						key={`height-${revision}`}
						object={draft}
						property="heightEnabled"
						label="Height band"
						noUndoRedo
						onChange={() => this._commitNow()}
					/>
					{draft.heightEnabled && (
						<>
							<TerrainFieldsRow label="Min / Max (cm)">
								{this._getNumberField("minWorld", null, { step: 1 })}
								{this._getNumberField("maxWorld", null, { step: 1 })}
							</TerrainFieldsRow>
							{this._getNumberField("featherWorld", "Feather (cm)", { min: 0, step: 1 })}
						</>
					)}

					<EditorInspectorSwitchField key={`slope-${revision}`} object={draft} property="slopeEnabled" label="Slope band" noUndoRedo onChange={() => this._commitNow()} />
					{draft.slopeEnabled && (
						<>
							<TerrainFieldsRow label="Min / Max (°)">
								{this._getNumberField("minDegrees", null, { min: 0, max: 90, step: 0.1 })}
								{this._getNumberField("maxDegrees", null, { min: 0, max: 90, step: 0.1 })}
							</TerrainFieldsRow>
							{this._getNumberField("featherDegrees", "Feather (°)", { min: 0, max: 90, step: 0.1 })}
						</>
					)}

					<EditorInspectorSwitchField key={`noise-${revision}`} object={draft} property="noiseEnabled" label="Noise" noUndoRedo onChange={() => this._commitNow()} />
					{draft.noiseEnabled && (
						<>
							{this._getNumberField("scale", "Noise scale (cm)", { min: 1, step: 10 })}
							{this._getNumberField("amount", "Noise amount", { min: 0, max: 1, step: 0.01 })}
							<div className="flex items-center gap-1 w-full">
								<div className="flex-1 min-w-0">{this._getNumberField("seed", "Noise seed", { step: 1, integer: true })}</div>
								<Button variant="ghost" size="icon" title="Random seed" className="w-8 h-8 shrink-0" onClick={() => this._handleRandomSeed()}>
									<LuDices className="w-4 h-4" />
								</Button>
							</div>
						</>
					)}

					{this._getNumberField("opacity", "Opacity", { min: 0, max: 1, step: 0.01 })}

					<div className="px-2 text-xs text-muted-foreground">
						Rules are evaluated from the first layer to the last: higher layers cover lower ones. They drive the Auto-paint tool and “Apply auto-paint rules to the
						whole terrain”.
					</div>
				</div>
			</TerrainCollapsibleBlock>
		);
	}

	private _getNumberField(
		property: "minWorld" | "maxWorld" | "featherWorld" | "minDegrees" | "maxDegrees" | "featherDegrees" | "scale" | "amount" | "seed" | "opacity",
		label: string | null,
		options: { min?: number; max?: number; step: number; integer?: boolean }
	): ReactNode {
		return (
			<EditorInspectorNumberField
				key={`${property}-${this.state.revision}`}
				object={this._draft}
				property={property}
				label={label}
				min={options.min}
				max={options.max}
				step={options.step}
				noUndoRedo
				onChange={(value) => {
					if (options.integer) {
						this._draft[property] = Math.round(value);
					}

					this._scheduleCommit();
				}}
				onFinishChange={() => this._commitNow()}
			/>
		);
	}

	private _handleRandomSeed(): void {
		this._draft.seed = Math.floor(Math.random() * 0x7fffffff);
		this.setState({ revision: this.state.revision + 1 });
		this._commitNow();
	}

	private _scheduleCommit(): void {
		if (this._commitTimeout !== null) {
			clearTimeout(this._commitTimeout);
		}

		this._commitTimeout = setTimeout(() => {
			this._commitTimeout = null;
			this._commit();
		}, TERRAIN_AUTO_PAINT_COMMIT_DELAY_MS);
	}

	/** Commits the edit waiting for its delay, if any (end of a drag, unmount). */
	private _commitPending(): void {
		if (this._commitTimeout !== null) {
			this._commit();
		}
	}

	private _commitNow(): void {
		this._commit();

		// Switches show or hide their band fields.
		this.forceUpdate();
	}

	/** Stored rule of the layer, null when it has none (or the rules can't be read). */
	private _readRule(): ITerrainAutoPaintRule | null {
		try {
			return getTerrainAutoPaintRules(this.props.mesh).find((item) => item.layerId === this.props.layerId) ?? null;
		} catch (e) {
			return null;
		}
	}

	/** Reloads the draft when the stored rule changed since it was read (the fields re-key). */
	private _reloadRule(): void {
		try {
			const rule = this._readRule();
			const loaded = JSON.stringify(rule);
			if (loaded === this._loadedRule || this._commitTimeout !== null) {
				return;
			}

			this._loadedRule = loaded;
			Object.assign(this._draft, createTerrainAutoPaintDraft(rule, this._heightRange));
			this.setState({ revision: this.state.revision + 1 });
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _commit(): void {
		if (this._commitTimeout !== null) {
			clearTimeout(this._commitTimeout);
			this._commitTimeout = null;
		}

		try {
			if (!getTerrainPlugin(this.props.mesh)) {
				return;
			}

			const rules = getTerrainAutoPaintRules(this.props.mesh);
			const stored = rules.find((rule) => rule.layerId === this.props.layerId) ?? null;
			const rule = createTerrainAutoPaintRuleFromDraft(this.props.layerId, this._draft);

			if (stored && JSON.stringify(stored) === JSON.stringify(rule)) {
				return;
			}

			const next = rules.filter((item) => item.layerId !== this.props.layerId);
			next.push(rule);

			this.props.runOwnChange(() => setTerrainAutoPaintRules(this.props.mesh, next));
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}
}

export interface ITerrainLayerDetailsProps {
	/** The editor reference. */
	editor: Editor;
	/** The terrain. */
	mesh: Mesh;
	/** The active layer (current data of the terrain material). */
	layer: Readonly<ITerrainLayerData>;
	/** Number of layers of the terrain material. */
	layerCount: number;
	/** layerFieldsRevision of the Layers section (§1.4): the fields re-key when it changes (undo/redo, external layer changes). */
	fieldsRevision: number;
	/** Disables every edit (running operation, read-only terrain). */
	disabled: boolean;
	/** Runs a change made by the details without re-keying their fields (the Layers section ignores the notifications it triggers). */
	runOwnChange: (change: () => void) => void;
}

/**
 * Active layer details (§1.10), an EditorInspectorBlockField under the layer list: name, map slots (albedo, normal + convention, roughness +
 * channel + glossiness invert, ambient occlusion + channel, height + channel), tint, tile size (aspect lock) and offset, PBR values and the
 * "Auto-paint rule" collapsible. Numeric, switch and list fields bind to the flat layer proxy (createTerrainLayerProxy) WITHOUT noUndoRedo:
 * their own undo entries replay through the proxy (§7.1). The fields are keyed by `fieldsRevision` (D19).
 */
export class TerrainLayerDetails extends Component<ITerrainLayerDetailsProps> {
	private _proxyKey: string | null = null;
	private _proxy: ITerrainLayerProxy | null = null;
	private _tint: { color: TerrainLayerTintColor } | null = null;

	private _tileKey: string | null = null;
	private _tileX: TerrainLockedTileSize | null = null;
	private _tileZ: TerrainLockedTileSize | null = null;
	private _tileLockToggles: number = 0;
	/** Re-key counters of the linked tile size fields (the other field of a locked pair follows the edited one). */
	private _tileXFieldKey: number = 0;
	private _tileZFieldKey: number = 0;

	public render(): ReactNode {
		const proxy = this._getProxy();
		if (!proxy || !this._tint) {
			return null;
		}

		const { editor, mesh, layer, layerCount, disabled } = this.props;
		const revision = this.props.fieldsRevision;

		return (
			<EditorInspectorBlockField>
				<div className="px-2 text-sm font-semibold truncate">Layer “{layer.name}”</div>

				<div className={`flex flex-col gap-2 w-full ${disabled ? "pointer-events-none opacity-50" : ""}`}>
					<EditorInspectorStringField key={`name-${revision}`} object={proxy} property="name" label="Name" />

					<div className="flex flex-col gap-2 px-2">
						<TerrainMapSlot
							editor={editor}
							mesh={mesh}
							layerId={layer.id}
							slot="albedo"
							label="Albedo"
							path={layer.albedo}
							layerCount={layerCount}
							disabled={disabled}
							revision={revision}
						/>
						<TerrainMapSlot
							editor={editor}
							mesh={mesh}
							layerId={layer.id}
							slot="normal"
							label="Normal"
							path={layer.normal}
							layerCount={layerCount}
							disabled={disabled}
							revision={revision}
						/>
					</div>
					{layer.normal && (
						<EditorInspectorListField
							key={`normalConvention-${revision}`}
							object={proxy}
							property="normalConvention"
							label="Convention"
							items={TERRAIN_NORMAL_CONVENTION_ITEMS}
						/>
					)}

					<div className="px-2">
						<TerrainMapSlot
							editor={editor}
							mesh={mesh}
							layerId={layer.id}
							slot="roughness"
							label="Roughness"
							path={layer.roughnessMap}
							layerCount={layerCount}
							disabled={disabled}
							revision={revision}
						/>
					</div>
					{layer.roughnessMap && (
						<>
							<EditorInspectorListField
								key={`roughnessChannel-${revision}`}
								object={proxy}
								property="roughnessChannel"
								label="Channel"
								items={TERRAIN_CHANNEL_ITEMS}
							/>
							<EditorInspectorSwitchField key={`roughnessInvert-${revision}`} object={proxy} property="roughnessInvert" label="Glossiness map (invert)" />
						</>
					)}

					<div className="px-2">
						<TerrainMapSlot
							editor={editor}
							mesh={mesh}
							layerId={layer.id}
							slot="ao"
							label="Ambient occlusion"
							path={layer.aoMap}
							layerCount={layerCount}
							disabled={disabled}
							revision={revision}
						/>
					</div>
					{layer.aoMap && <EditorInspectorListField key={`aoChannel-${revision}`} object={proxy} property="aoChannel" label="Channel" items={TERRAIN_CHANNEL_ITEMS} />}

					<div className="px-2">
						<TerrainMapSlot
							editor={editor}
							mesh={mesh}
							layerId={layer.id}
							slot="height"
							label="Height"
							path={layer.heightMap}
							layerCount={layerCount}
							disabled={disabled}
							revision={revision}
						/>
					</div>
					{layer.heightMap && (
						<EditorInspectorListField key={`heightChannel-${revision}`} object={proxy} property="heightChannel" label="Channel" items={TERRAIN_CHANNEL_ITEMS} />
					)}

					<EditorInspectorColorField
						key={`tint-${revision}`}
						object={this._tint}
						property="color"
						label="Tint"
						noUndoRedo
						onFinishChange={(_, old) => this._commitTint(old)}
					/>

					{this._getTileSizeFields(proxy)}

					<TerrainFieldsRow label="Tile offset (cm)">
						<EditorInspectorNumberField key={`tileOffsetX-${revision}`} object={proxy} property="tileOffsetX" step={1} />
						<EditorInspectorNumberField key={`tileOffsetZ-${revision}`} object={proxy} property="tileOffsetZ" step={1} />
					</TerrainFieldsRow>

					<EditorInspectorNumberField key={`roughness-${revision}`} object={proxy} property="roughness" label="Roughness" min={0} max={1} step={0.01} />
					<EditorInspectorNumberField key={`metallic-${revision}`} object={proxy} property="metallic" label="Metallic" min={0} max={1} step={0.01} />
					<EditorInspectorNumberField key={`normalStrength-${revision}`} object={proxy} property="normalStrength" label="Normal strength" min={0} max={2} step={0.01} />
					<EditorInspectorNumberField key={`aoStrength-${revision}`} object={proxy} property="aoStrength" label="AO strength" min={0} max={1} step={0.01} />
					<EditorInspectorNumberField key={`heightScale-${revision}`} object={proxy} property="heightScale" label="Height scale" min={0} max={2} step={0.01} />
					<EditorInspectorNumberField key={`heightOffset-${revision}`} object={proxy} property="heightOffset" label="Height offset" min={-1} max={1} step={0.01} />
				</div>

				<TerrainAutoPaintRuleBlock
					key={`${layer.id}-${revision}`}
					editor={editor}
					mesh={mesh}
					layerId={layer.id}
					disabled={disabled}
					runOwnChange={this.props.runOwnChange}
				/>
			</EditorInspectorBlockField>
		);
	}

	/** Flat proxy, tint view and locked tile sizes of the current layer (kept while the terrain and the layer are the same). */
	private _getProxy(): ITerrainLayerProxy | null {
		const key = `${this.props.mesh.uniqueId}|${this.props.layer.id}`;
		if (this._proxyKey === key && this._proxy) {
			return this._proxy;
		}

		try {
			this._proxy = createTerrainLayerProxy(this.props.mesh, this.props.layer.id);
			this._tint = { color: new TerrainLayerTintColor(this.props.editor, this.props.mesh, this.props.layer.id) };
			this._proxyKey = key;
		} catch (e) {
			this._proxy = null;
			this._tint = null;
			this._proxyKey = null;
		}

		return this._proxy;
	}

	private _getTileSizeFields(proxy: ITerrainLayerProxy): ReactNode {
		const { editor, mesh, layer } = this.props;
		const revision = this.props.fieldsRevision;
		const locked = isTerrainTileAspectLocked(layer.id);

		let xField: ReactNode;
		let zField: ReactNode;

		if (locked) {
			// New adapters (and a new ratio Z / X) whenever the fields re-key or the lock is taken again.
			const key = `${mesh.uniqueId}|${layer.id}|${revision}|${this._tileLockToggles}`;
			if (this._tileKey !== key || !this._tileX || !this._tileZ) {
				const ratio = layer.tileSize[0] > 0 ? layer.tileSize[1] / layer.tileSize[0] : 1;
				this._tileX = new TerrainLockedTileSize(editor, mesh, layer.id, "x", ratio);
				this._tileZ = new TerrainLockedTileSize(editor, mesh, layer.id, "z", ratio);
				this._tileKey = key;
			}

			xField = (
				<EditorInspectorNumberField
					key={`tileSizeX-${key}-${this._tileXFieldKey}`}
					object={this._tileX}
					property="value"
					min={TERRAIN_TILE_SIZE_MIN}
					max={TERRAIN_TILE_SIZE_MAX}
					step={1}
					onChange={() => this._handleLockedTileSizeChanged("x")}
				/>
			);

			zField = (
				<EditorInspectorNumberField
					key={`tileSizeZ-${key}-${this._tileZFieldKey}`}
					object={this._tileZ}
					property="value"
					min={TERRAIN_TILE_SIZE_MIN}
					max={TERRAIN_TILE_SIZE_MAX}
					step={1}
					onChange={() => this._handleLockedTileSizeChanged("z")}
				/>
			);
		} else {
			xField = (
				<EditorInspectorNumberField
					key={`tileSizeX-${revision}-free-${this._tileLockToggles}`}
					object={proxy}
					property="tileSizeX"
					min={TERRAIN_TILE_SIZE_MIN}
					max={TERRAIN_TILE_SIZE_MAX}
					step={1}
				/>
			);

			zField = (
				<EditorInspectorNumberField
					key={`tileSizeZ-${revision}-free-${this._tileLockToggles}`}
					object={proxy}
					property="tileSizeZ"
					min={TERRAIN_TILE_SIZE_MIN}
					max={TERRAIN_TILE_SIZE_MAX}
					step={1}
				/>
			);
		}

		return (
			<div className="flex items-center gap-1 w-full">
				<div className="flex-1 min-w-0">
					<TerrainFieldsRow label="Tile size (cm)">
						{xField}
						{zField}
					</TerrainFieldsRow>
				</div>

				<Button
					variant="ghost"
					size="icon"
					title={locked ? "Aspect ratio locked: click to edit X and Z separately" : "Lock the aspect ratio"}
					className={`w-8 h-8 shrink-0 ${locked ? "text-primary" : ""}`}
					onClick={() => this._toggleTileAspectLock()}
				>
					{locked ? <LuLink2 className="w-4 h-4" /> : <LuUnlink2 className="w-4 h-4" />}
				</Button>
			</div>
		);
	}

	private _handleLockedTileSizeChanged(axis: "x" | "z"): void {
		// The other field of the pair remounts with the linked value.
		if (axis === "x") {
			++this._tileZFieldKey;
		} else {
			++this._tileXFieldKey;
		}

		this.forceUpdate();
	}

	private _toggleTileAspectLock(): void {
		const layerId = this.props.layer.id;
		terrainTileAspectLocks.set(layerId, !isTerrainTileAspectLocked(layerId));

		++this._tileLockToggles;
		this._tileKey = null;
		this.forceUpdate();
	}

	private _commitTint(old: { r: number; g: number; b: number } | null | undefined): void {
		try {
			const tint = this._tint?.color;
			if (tint) {
				this.props.runOwnChange(() => tint.commit(old));
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}
}
