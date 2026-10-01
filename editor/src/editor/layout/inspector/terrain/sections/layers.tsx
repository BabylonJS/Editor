import { join } from "path/posix";

import { Component, DragEvent, KeyboardEvent, ReactNode } from "react";
import { toast } from "sonner";

import {
	LuArrowDown,
	LuArrowUp,
	LuCopy,
	LuEllipsis,
	LuFileDown,
	LuFileUp,
	LuGripVertical,
	LuImport,
	LuPaintBucket,
	LuPaintbrush,
	LuPencil,
	LuPlus,
	LuRefreshCw,
	LuScale,
	LuTrash2,
	LuWandSparkles,
} from "react-icons/lu";

import type { Mesh, Observer } from "babylonjs";
import type { ITerrainLayerData, TerrainMaterialPlugin } from "babylonjs-editor-tools";

import type { Editor } from "../../../../main";

import { showConfirm } from "../../../../../ui/dialog";
import { Badge } from "../../../../../ui/shadcn/ui/badge";
import { Button } from "../../../../../ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../../ui/shadcn/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../ui/shadcn/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../../../ui/shadcn/ui/dropdown-menu";

import { openSingleFileDialog, saveSingleFileDialog } from "../../../../../tools/dialog";
import { onRedoObservable, onUndoObservable } from "../../../../../tools/undoredo";

import { getTerrainEligibility } from "../../../../../tools/terrain/engine/eligibility";
import { onTerrainChangedObservable } from "../../../../../tools/terrain/engine/events";
import { getTerrainLayerCoverage, getTerrainPlugin } from "../../../../../tools/terrain/engine/info";
import {
	addTerrainMaterialLayers,
	duplicateTerrainMaterialLayer,
	getTerrainAutoPaintRules,
	moveTerrainMaterialLayer,
	removeTerrainMaterialLayer,
	updateTerrainMaterialLayer,
} from "../../../../../tools/terrain/engine/layers";
import { disableTerrainTexturePainting, enableTerrainTexturePainting, setTerrainMaterialSettings } from "../../../../../tools/terrain/engine/material";
import type { ITerrainBusyInfo, ITerrainChangedEvent, ITerrainMaterialSettingsPatch } from "../../../../../tools/terrain/engine/types";
import { isTerrainBusy, onTerrainBusyChangedObservable } from "../../../../../tools/terrain/engine/yield";
import { getProjectDirectory } from "../../../../../tools/terrain/io/paths";
import { getTerrainImageThumbnail } from "../../../../../tools/terrain/io/sources";
import { exportTerrainLayerMask, importTerrainLayerMask } from "../../../../../tools/terrain/io/masks";

import { EditorInspectorNumberField } from "../../fields/number";
import { EditorInspectorSwitchField } from "../../fields/switch";
import { EditorInspectorSectionField } from "../../fields/section";

import { reportTerrainTabError } from "../drop-actions";
import type { ITerrainDropContext } from "../drop-routing";
import { formatTerrainCoverage, formatTerrainLayerTextureOption } from "../format";
import { getActiveTerrainLayerId, onTerrainSettingsChangedObservable, setActiveTerrainLayerId, type ITerrainSettingsChange } from "../settings";

import { TerrainDropZone } from "../components/drop-zone";
import { getTerrainMapSlotAbsolutePath } from "../components/map-slot";
import { TerrainCollapsibleBlock } from "../components/collapsible-block";

import { openTerrainSplatImport } from "../dialogs/import-splat";

import { TerrainLayerDetails } from "./layer-details";
import { runTerrainOperationWithFeedback } from "./generate-panel";

/** Maximum number of layers of a terrain material (TERRAIN_MAX_LAYERS of the runtime). */
export const TERRAIN_LAYERS_MAX = 8;

/** Private drag type of the layer rows (HTML5 drag and drop, §1.10). */
export const TERRAIN_LAYER_DRAG_TYPE = "terrain/layer";

/** Layer texture resolutions of the Material settings block (§1.10). */
export const TERRAIN_LAYER_TEXTURE_SIZE_OPTIONS: readonly number[] = [256, 512, 1024, 2048];

/** Delay of the coverage refresh after weight changes (computed at most once per burst of events, never in render). */
const TERRAIN_LAYERS_COVERAGE_DELAY_MS = 200;

/** Delay of the commit of the material settings number fields (one undo entry per settled edit). */
const TERRAIN_LAYERS_MATERIAL_COMMIT_DELAY_MS = 400;

/** Size of the row thumbnails (40 px rows, §1.10). */
const TERRAIN_LAYERS_THUMBNAIL_SIZE = 64;

const TERRAIN_LAYERS_MAX_TOOLTIP = "8 layers maximum (2 weight maps)";
const TERRAIN_LAYERS_LAST_LAYER_TOOLTIP = "A terrain material needs at least one layer: use Disable texture painting instead";

/**
 * Insertion index (0..n) → final index of a layer moved from `from` (moveLayer semantics): inserting after itself or right below itself
 * gives the same index (no move).
 * @param from defines the current index of the layer.
 * @param insertion defines the insertion index among the rows (0 = before the first row, n = after the last one).
 */
export function getTerrainLayerMoveIndex(from: number, insertion: number): number {
	return insertion > from ? insertion - 1 : insertion;
}

/**
 * Default name of a new layer: "Layer {n}" with the first n (from count + 1) not used yet.
 * @param layers defines the current layers.
 */
export function getTerrainNewLayerName(layers: readonly { name: string }[]): string {
	const names = new Set(layers.map((layer) => layer.name));

	let index = layers.length + 1;
	while (names.has(`Layer ${index}`)) {
		++index;
	}

	return `Layer ${index}`;
}

/**
 * Import layer mask… (§1.10 layer menu, §1.12 Import / export): asks for a grayscale image (image top = +Z) and replaces the weights of the
 * layer with it (importTerrainLayerMask, one undo entry). Never throws (errors are reported).
 * @param editor defines the editor reference.
 * @param mesh defines the terrain.
 * @param layerId defines the layer whose mask is imported.
 * @returns true once the mask was imported.
 */
export async function importTerrainLayerMaskWithDialog(editor: Editor, mesh: Mesh, layerId: string): Promise<boolean> {
	try {
		const layer = getTerrainPlugin(mesh)?.data.layers.find((item) => item.id === layerId);
		const file = openSingleFileDialog({
			title: layer ? `Import the mask of “${layer.name}”` : "Import layer mask",
			filters: [{ name: "Grayscale images", extensions: ["png", "jpg", "jpeg", "webp", "tif", "tiff"] }],
		});

		if (!file) {
			return false;
		}

		await importTerrainLayerMask(editor, mesh, layerId, file.replace(/\\/g, "/"));
		toast.success(layer ? `Mask of “${layer.name}” imported` : "Layer mask imported");

		return true;
	} catch (e) {
		reportTerrainTabError(editor, e);
		return false;
	}
}

/**
 * Export layer mask… (§1.10 layer menu, §1.12 Import / export): writes the weights of the layer as an 8-bit grayscale PNG (image top = +Z,
 * exportTerrainLayerMask). Never throws (errors are reported).
 * @param editor defines the editor reference.
 * @param mesh defines the terrain.
 * @param layerId defines the layer whose mask is exported.
 * @returns true once the file was written.
 */
export async function exportTerrainLayerMaskWithDialog(editor: Editor, mesh: Mesh, layerId: string): Promise<boolean> {
	try {
		const layer = getTerrainPlugin(mesh)?.data.layers.find((item) => item.id === layerId);
		const projectDirectory = getProjectDirectory();
		const name = `${(layer?.name || "layer").replace(/[^A-Za-z0-9_-]+/g, "_")}-mask.png`;

		let file = saveSingleFileDialog({
			title: layer ? `Export the mask of “${layer.name}”` : "Export layer mask",
			filters: [{ name: "PNG", extensions: ["png"] }],
			defaultPath: projectDirectory ? join(projectDirectory, name) : undefined,
		});

		if (!file) {
			return false;
		}

		file = file.replace(/\\/g, "/");
		if (!/\.png$/i.test(file)) {
			file = `${file}.png`;
		}

		await exportTerrainLayerMask(mesh, layerId, file);
		toast.success(layer ? `Mask of “${layer.name}” exported` : "Layer mask exported");

		return true;
	} catch (e) {
		reportTerrainTabError(editor, e);
		return false;
	}
}

export interface ITerrainLayersSectionProps {
	/** The editor reference. */
	editor: Editor;
	/** The target terrain (state `terrain` of the tab). */
	mesh: Mesh;
}

interface ITerrainLayersSectionState {
	/** layerFieldsRevision (§1.4): bumped on undo/redo and on terrain changes whose reason is not "layer-edit". */
	fieldsRevision: number;
	/** Coverage (0..1) per layer, null while the weights are not loaded. */
	coverage: number[] | null;
	/** Thumbnail URL per absolute albedo path (null: no thumbnail). */
	thumbnails: Record<string, string | null>;
	/** Layer whose name is edited inline. */
	renamingLayerId: string | null;
	renameValue: string;
	/** Layer dragged by its handle (reorder). */
	draggedLayerId: string | null;
	/** Insertion index (0..n) under the pointer while a layer is dragged. */
	dropIndex: number | null;
	/** A terrain operation runs (isTerrainBusy): every mutating button is disabled (§1.12). */
	busy: boolean;
	/** An action started by this section runs. */
	pending: boolean;
}

/** Editable copy of the material settings edited with number fields (committed with setMaterialSettings). */
interface ITerrainMaterialSettingsDraft {
	heightBlend: boolean;
	heightBlendTransition: number;
	anisotropy: number;
}

/** Number fields of the material settings draft (committed after a delay, or before an undo/redo). */
type TerrainMaterialDraftNumberKey = "heightBlendTransition" | "anisotropy";

/**
 * "Layers" section, first section of the Paint category (§1.10): the layer list (rows with drag-to-reorder, thumbnails, coverage, inline rename and
 * a menu), Add layer, drop zones (each row and Add layer: images, texture sets, `.material` files, masks, splat maps; §4.19), the active
 * layer details, the Material settings block and the paint globals. Without a terrain material it offers "Enable texture painting" and, for
 * PBR/Standard materials, "Use “{material}” as layer 1". The section subscribes itself to the terrain, busy, settings and undo/redo events.
 */
export class TerrainLayersSection extends Component<ITerrainLayersSectionProps, ITerrainLayersSectionState> {
	private readonly _runOwnChangeCallback: (change: () => void) => void;

	private _ownChangeDepth: number = 0;
	private _unmounted: boolean = false;

	private _terrainObserver: Observer<ITerrainChangedEvent> | null = null;
	private _busyObserver: Observer<Readonly<ITerrainBusyInfo> | null> | null = null;
	private _settingsObserver: Observer<ITerrainSettingsChange> | null = null;
	private _undoObserver: Observer<void> | null = null;
	private _redoObserver: Observer<void> | null = null;

	private _observedPlugin: TerrainMaterialPlugin | null = null;
	private _pluginObserver: Observer<TerrainMaterialPlugin> | null = null;

	private _coverageTimeout: ReturnType<typeof setTimeout> | null = null;

	private _materialDraftKey: string | null = null;
	private _materialDraft: ITerrainMaterialSettingsDraft | null = null;
	/** Bumped each time the draft is recreated: the material settings fields re-key with it. */
	private _materialDraftGeneration: number = 0;
	private _materialCommitTimeout: ReturnType<typeof setTimeout> | null = null;
	/** Fields of the draft edited since its last commit: only they are committed (the other values may be stale after an external change). */
	private readonly _materialDraftEdited: Set<TerrainMaterialDraftNumberKey> = new Set<TerrainMaterialDraftNumberKey>();

	/** Layer whose "Rename" menu item was selected: the inline editor opens once the menu has closed (its focus trap would blur it). */
	private _pendingRenameLayerId: string | null = null;

	public constructor(props: ITerrainLayersSectionProps) {
		super(props);

		this._runOwnChangeCallback = (change) => this._runOwnChange(change);

		this.state = {
			fieldsRevision: 0,
			coverage: null,
			thumbnails: {},
			renamingLayerId: null,
			renameValue: "",
			draggedLayerId: null,
			dropIndex: null,
			busy: false,
			pending: false,
		};
	}

	public componentDidMount(): void {
		try {
			this._terrainObserver = onTerrainChangedObservable.add((event) => this._handleTerrainChanged(event));
			this._busyObserver = onTerrainBusyChangedObservable.add(() => this._handleBusyChanged());
			this._settingsObserver = onTerrainSettingsChangedObservable.add(() => this._handleSettingsChanged());
			this._undoObserver = onUndoObservable.add(() => this._handleUndoRedo());
			this._redoObserver = onRedoObservable.add(() => this._handleUndoRedo());
			this.setState({ busy: isTerrainBusy() });

			this._observePlugin();
			this._refreshCoverage();
			this._refreshThumbnails();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	public componentDidUpdate(prevProps: Readonly<ITerrainLayersSectionProps>): void {
		try {
			this._observePlugin();

			if (prevProps.mesh !== this.props.mesh) {
				// The pending edit belongs to the previous terrain.
				this._flushMaterialDraft(prevProps.mesh);

				this.setState({
					fieldsRevision: this.state.fieldsRevision + 1,
					coverage: null,
					renamingLayerId: null,
					draggedLayerId: null,
					dropIndex: null,
				});

				this._refreshCoverage();
				this._refreshThumbnails();
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	public componentWillUnmount(): void {
		this._unmounted = true;

		try {
			this._flushMaterialDraft();

			if (this._coverageTimeout !== null) {
				clearTimeout(this._coverageTimeout);
				this._coverageTimeout = null;
			}

			onTerrainChangedObservable.remove(this._terrainObserver);
			onTerrainBusyChangedObservable.remove(this._busyObserver);
			onTerrainSettingsChangedObservable.remove(this._settingsObserver);
			onUndoObservable.remove(this._undoObserver);
			onRedoObservable.remove(this._redoObserver);

			this._stopObservingPlugin();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	public render(): ReactNode {
		const { editor, mesh } = this.props;

		const plugin = getTerrainPlugin(mesh);
		const layers = plugin?.data.layers ?? [];
		const count = layers.length;

		const readOnly = this._isReadOnly();
		const disabled = this.state.busy || this.state.pending || readOnly;

		const activeLayerId = getActiveTerrainLayerId(mesh.material);
		const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? null;

		const listContext: ITerrainDropContext = {
			zone: "layers-list",
			isTerrain: true,
			hasTerrainMaterial: !!plugin,
			layerCount: count,
		};

		return (
			<TooltipProvider delayDuration={300}>
				<EditorInspectorSectionField title="Layers" label={this._getSectionLabel(plugin, count, disabled)}>
					{!plugin && this._getEnableBlock(listContext, disabled)}

					{plugin && (
						<div className="flex flex-col gap-2 w-full">
							<div
								className="flex flex-col gap-1 w-full"
								onDragOver={(ev) => this._handleListDragOver(ev)}
								onDragLeave={(ev) => this._handleListDragLeave(ev)}
								onDrop={(ev) => this._handleListDrop(ev, layers)}
							>
								{layers.map((layer, index) => this._getLayerRow(layer, index, layers, layer.id === activeLayer?.id, listContext, disabled))}
							</div>

							{this._getAddLayerZone(listContext, count, disabled)}

							{activeLayer && (
								<TerrainLayerDetails
									key={`${mesh.uniqueId}-${activeLayer.id}`}
									editor={editor}
									mesh={mesh}
									layer={activeLayer}
									layerCount={count}
									fieldsRevision={this.state.fieldsRevision}
									disabled={disabled}
									runOwnChange={this._runOwnChangeCallback}
								/>
							)}

							{this._getMaterialSettingsBlock(plugin, count, disabled)}
							{this._getPaintGlobals(disabled)}
						</div>
					)}
				</EditorInspectorSectionField>
			</TooltipProvider>
		);
	}

	/** Read-only terrains (newer version, unsupported resolution): every edit is disabled. */
	private _isReadOnly(): boolean {
		try {
			const eligibility = getTerrainEligibility(this.props.mesh);
			return eligibility.eligible && eligibility.readOnly;
		} catch (e) {
			return false;
		}
	}

	private _getSectionLabel(plugin: TerrainMaterialPlugin | null, count: number, disabled: boolean): ReactNode {
		// The section header toggles on click: the menu must not propagate its clicks (React events bubble out of portals).
		return (
			<div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
				<span>{`${count}/${TERRAIN_LAYERS_MAX}`}</span>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="w-6 h-6" title="Layers menu">
							<LuEllipsis className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem className="gap-2" disabled={disabled} onClick={() => this._runAction(() => openTerrainSplatImport(this.props.editor, this.props.mesh))}>
							<LuImport className="w-4 h-4" /> Import splat map…
						</DropdownMenuItem>
						<DropdownMenuItem className="gap-2" disabled={disabled || !plugin} onClick={() => this._runAction(() => this._disableTexturePainting())}>
							<LuPaintbrush className="w-4 h-4" /> Disable texture painting…
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	}

	private _getEnableBlock(context: ITerrainDropContext, disabled: boolean): ReactNode {
		const material = this.props.mesh.material;
		const className = material?.getClassName();
		const convertible = !!material && (className === "PBRMaterial" || className === "StandardMaterial");

		return (
			<TerrainDropZone editor={this.props.editor} mesh={this.props.mesh} context={context} disabled={disabled} overlay className="rounded-lg">
				<div className="flex flex-col items-center gap-3 w-full p-3 rounded-lg bg-muted-foreground/10 text-center">
					<div className="text-sm">Texture painting is not enabled for this terrain.</div>

					<Button className="flex items-center gap-2" disabled={disabled} onClick={() => this._runAction(() => this._enableTexturePainting("create"))}>
						<LuPaintbrush className="w-4 h-4" /> Enable texture painting
					</Button>

					{convertible && (
						<Button
							variant="secondary"
							className="flex items-center gap-2 max-w-full whitespace-normal h-auto py-2"
							disabled={disabled}
							onClick={() => this._runAction(() => this._enableTexturePainting("convert"))}
						>
							<span className="break-words">Use “{material!.name}” as layer 1</span>
						</Button>
					)}

					<div className="text-xs text-muted-foreground">Or drop images, a texture folder or a .material here to create layers.</div>
				</div>
			</TerrainDropZone>
		);
	}

	private _getLayerRow(
		layer: Readonly<ITerrainLayerData>,
		index: number,
		layers: readonly ITerrainLayerData[],
		active: boolean,
		listContext: ITerrainDropContext,
		disabled: boolean
	): ReactNode {
		const count = layers.length;
		const albedo = getTerrainMapSlotAbsolutePath(layer.albedo);
		const thumbnail = albedo ? (this.state.thumbnails[albedo] ?? null) : null;
		const renaming = this.state.renamingLayerId === layer.id;

		const dragged = this.state.draggedLayerId;
		const draggedIndex = dragged ? layers.findIndex((item) => item.id === dragged) : -1;
		const dropIndex = this.state.dropIndex;
		const noOpDrop = dropIndex === null || draggedIndex < 0 || getTerrainLayerMoveIndex(draggedIndex, dropIndex) === draggedIndex;

		const tint = `rgb(${Math.round(layer.tint[0] * 255)}, ${Math.round(layer.tint[1] * 255)}, ${Math.round(layer.tint[2] * 255)})`;

		return (
			<TerrainDropZone
				key={layer.id}
				editor={this.props.editor}
				mesh={this.props.mesh}
				context={{ ...listContext, zone: "layer-row", layerId: layer.id }}
				getLayerName={(layerId) => layers.find((item) => item.id === layerId)?.name}
				disabled={disabled}
				className="rounded-lg"
			>
				<div
					data-terrain-layer-row={layer.id}
					className={`
						relative h-12 rounded-lg px-2 flex items-center gap-2 cursor-pointer select-none
						${active ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-muted-foreground/10"}
						${dragged === layer.id ? "opacity-50" : ""}
						transition-colors duration-200 ease-in-out
					`}
					onClick={() => this._selectLayer(layer.id)}
					onDragOver={(ev) => this._handleRowDragOver(ev, index)}
				>
					{!noOpDrop && dropIndex === index && <div className="pointer-events-none absolute left-1 right-1 -top-[3px] h-0.5 rounded bg-primary" />}
					{!noOpDrop && dropIndex === count && index === count - 1 && (
						<div className="pointer-events-none absolute left-1 right-1 -bottom-[3px] h-0.5 rounded bg-primary" />
					)}

					<span
						draggable={!disabled}
						title="Drag to reorder"
						onClick={(ev) => ev.stopPropagation()}
						onDragStart={(ev) => this._handleLayerDragStart(ev, layer.id)}
						onDragEnd={() => this._handleLayerDragEnd()}
						className={`shrink-0 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
					>
						<LuGripVertical className="w-4 h-4" />
					</span>

					<div className="w-10 h-10 shrink-0 rounded-md overflow-hidden border border-border/50" style={{ backgroundColor: thumbnail ? undefined : tint }}>
						{thumbnail && <img src={thumbnail} alt="" draggable={false} className="w-full h-full object-cover" />}
					</div>

					{renaming ? (
						<input
							autoFocus
							value={this.state.renameValue}
							onClick={(ev) => ev.stopPropagation()}
							onChange={(ev) => this.setState({ renameValue: ev.currentTarget.value })}
							onKeyDown={(ev) => this._handleRenameKeyDown(ev, layer)}
							onBlur={() => this._commitRename(layer)}
							className="flex-1 min-w-0 px-2 py-1 rounded-md bg-background text-sm outline-none ring-1 ring-primary/60"
						/>
					) : (
						// The name is the keyboard entry of the row (Tab, then Enter or Space selects the layer); its click bubbles to the row.
						<button
							type="button"
							data-terrain-layer-name={layer.id}
							aria-pressed={active}
							aria-keyshortcuts={`Shift+${index + 1}`}
							className="flex-1 min-w-0 truncate text-sm text-left rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-primary"
							title={`${layer.name} (Shift+${index + 1})`}
							onDoubleClick={(ev) => {
								ev.stopPropagation();
								if (!disabled) {
									this._startRename(layer);
								}
							}}
						>
							{layer.name}
						</button>
					)}

					<Badge variant="secondary" className="shrink-0 px-1.5 font-normal" title="Coverage of the terrain">
						{formatTerrainCoverage(this.state.coverage?.[index])}
					</Badge>

					<div onClick={(ev) => ev.stopPropagation()}>{this._getLayerMenu(layer, index, count, disabled)}</div>
				</div>
			</TerrainDropZone>
		);
	}

	private _getLayerMenu(layer: Readonly<ITerrainLayerData>, index: number, count: number, disabled: boolean): ReactNode {
		const last = count <= 1;

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="w-7 h-7" title="Layer menu">
						<LuEllipsis className="w-4 h-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" onCloseAutoFocus={(ev) => this._handleLayerMenuCloseAutoFocus(ev, layer.id)}>
					{/* The inline editor opens once the menu has closed: opened from the item, the menu's focus trap and its return of the focus
					    to the ⋯ trigger would take the focus from the input (typed text lost, editor left open). */}
					<DropdownMenuItem className="gap-2" disabled={disabled} onSelect={() => this._requestRename(layer.id)}>
						<LuPencil className="w-4 h-4" /> Rename
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2" disabled={disabled || count >= TERRAIN_LAYERS_MAX} onClick={() => this._runAction(() => this._duplicateLayer(layer))}>
						<LuCopy className="w-4 h-4" /> Duplicate
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2" disabled={disabled || index === 0} onClick={() => this._runAction(() => this._moveLayer(layer, index - 1))}>
						<LuArrowUp className="w-4 h-4" /> Move up
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2" disabled={disabled || index >= count - 1} onClick={() => this._runAction(() => this._moveLayer(layer, index + 1))}>
						<LuArrowDown className="w-4 h-4" /> Move down
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem className="gap-2" disabled={disabled} onClick={() => this._runAction(() => this._fillLayer(layer))}>
						<LuPaintBucket className="w-4 h-4" /> Fill terrain with this layer…
					</DropdownMenuItem>
					<DropdownMenuItem
						className="gap-2"
						disabled={disabled}
						onClick={() => this._runAction(() => importTerrainLayerMaskWithDialog(this.props.editor, this.props.mesh, layer.id))}
					>
						<LuFileUp className="w-4 h-4" /> Import mask…
					</DropdownMenuItem>
					<DropdownMenuItem className="gap-2" onClick={() => this._runAction(() => exportTerrainLayerMaskWithDialog(this.props.editor, this.props.mesh, layer.id))}>
						<LuFileDown className="w-4 h-4" /> Export mask…
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					{last ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<div>
									<DropdownMenuItem className="gap-2" disabled>
										<LuTrash2 className="w-4 h-4" /> Remove…
									</DropdownMenuItem>
								</div>
							</TooltipTrigger>
							<TooltipContent side="left" className="max-w-64">
								{TERRAIN_LAYERS_LAST_LAYER_TOOLTIP}
							</TooltipContent>
						</Tooltip>
					) : (
						<DropdownMenuItem className="gap-2" disabled={disabled} onClick={() => this._runAction(() => this._removeLayer(layer))}>
							<LuTrash2 className="w-4 h-4" /> Remove…
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	private _getAddLayerZone(context: ITerrainDropContext, count: number, disabled: boolean): ReactNode {
		const full = count >= TERRAIN_LAYERS_MAX;

		const button = (
			<Button variant="secondary" size="sm" className="flex items-center gap-2" disabled={disabled || full} onClick={() => this._runAction(() => this._addLayer())}>
				<LuPlus className="w-4 h-4" /> Add layer
			</Button>
		);

		return (
			<TerrainDropZone editor={this.props.editor} mesh={this.props.mesh} context={context} disabled={disabled} overlay className="rounded-lg">
				<div className="flex flex-wrap items-center gap-2 w-full p-2 rounded-lg border border-dashed border-muted-foreground/30">
					{full ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<span>{button}</span>
							</TooltipTrigger>
							<TooltipContent>{TERRAIN_LAYERS_MAX_TOOLTIP}</TooltipContent>
						</Tooltip>
					) : (
						button
					)}

					<div className="flex-1 min-w-[120px] text-xs text-muted-foreground">Drop images, a texture folder or a .material to add layers.</div>
				</div>
			</TerrainDropZone>
		);
	}

	/**
	 * Draft of the material settings number fields: recreated from the material when the fields re-key (undo/redo, external change, other
	 * material), but kept while one of its edits waits for its commit (the commit then re-renders and the next render recreates it).
	 */
	private _getMaterialDraft(plugin: TerrainMaterialPlugin): ITerrainMaterialSettingsDraft {
		const key = `${this.props.mesh.material?.uniqueId ?? -1}|${this.state.fieldsRevision}`;
		if (this._materialDraft && (this._materialDraftKey === key || this._materialCommitTimeout !== null)) {
			return this._materialDraft;
		}

		++this._materialDraftGeneration;

		this._materialDraftKey = key;
		this._materialDraftEdited.clear();
		this._materialDraft = {
			heightBlend: plugin.data.heightBlend,
			heightBlendTransition: plugin.data.heightBlendTransition,
			anisotropy: plugin.data.anisotropy,
		};

		return this._materialDraft;
	}

	/** Drops the draft (a refused commit): the next render recreates it from the material and the fields re-key. */
	private _invalidateMaterialDraft(): void {
		if (this._materialCommitTimeout !== null) {
			clearTimeout(this._materialCommitTimeout);
			this._materialCommitTimeout = null;
		}

		this._materialDraft = null;
		this._materialDraftKey = null;
		this._materialDraftEdited.clear();

		if (!this._unmounted) {
			this.forceUpdate();
		}
	}

	private _getMaterialSettingsBlock(plugin: TerrainMaterialPlugin, count: number, disabled: boolean): ReactNode {
		const draft = this._getMaterialDraft(plugin);
		const revision = this._materialDraftGeneration;

		return (
			<TerrainCollapsibleBlock id="material-settings" title="Material settings">
				{/* The end of a pointer-locked drag of a number field (mouseup on the locked input, bubbling here) commits it at once. */}
				<div className={`flex flex-col gap-2 w-full ${disabled ? "pointer-events-none opacity-50" : ""}`} onMouseUp={() => this._flushMaterialDraft()}>
					<EditorInspectorSwitchField
						key={`heightBlend-${revision}`}
						object={draft}
						property="heightBlend"
						label="Height-based blending"
						noUndoRedo
						onChange={(value) => this._commitMaterialSettings({ heightBlend: value })}
					/>

					{draft.heightBlend && (
						<EditorInspectorNumberField
							key={`heightBlendTransition-${revision}`}
							object={draft}
							property="heightBlendTransition"
							label="Transition"
							min={0.01}
							max={1}
							step={0.01}
							noUndoRedo
							onChange={() => this._scheduleMaterialDraftCommit("heightBlendTransition")}
							onFinishChange={() => this._flushMaterialDraft()}
						/>
					)}

					<div className="flex gap-2 items-center px-2">
						<div className="w-1/3 text-ellipsis overflow-hidden whitespace-nowrap" title="Layer texture resolution">
							Layer texture resolution
						</div>
						<Select value={String(plugin.data.layerTextureSize)} onValueChange={(value) => this._commitMaterialSettings({ layerTextureSize: parseInt(value, 10) })}>
							<SelectTrigger className="w-2/3">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TERRAIN_LAYER_TEXTURE_SIZE_OPTIONS.map((size) => (
									<SelectItem key={size} value={String(size)}>
										{formatTerrainLayerTextureOption(size, count)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<EditorInspectorNumberField
						key={`anisotropy-${revision}`}
						object={draft}
						property="anisotropy"
						label="Anisotropy"
						min={1}
						max={16}
						step={1}
						noUndoRedo
						onChange={(value) => {
							draft.anisotropy = Math.round(value);
							this._scheduleMaterialDraftCommit("anisotropy");
						}}
						onFinishChange={() => this._flushMaterialDraft()}
					/>

					<Button variant="secondary" size="sm" className="flex items-center gap-2 self-start" onClick={() => this._rebuildLayerTextures(plugin)}>
						<LuRefreshCw className="w-4 h-4" /> Rebuild layer textures
					</Button>
				</div>
			</TerrainCollapsibleBlock>
		);
	}

	private _getPaintGlobals(disabled: boolean): ReactNode {
		let hasEnabledRule = false;
		try {
			hasEnabledRule = getTerrainAutoPaintRules(this.props.mesh).some((rule) => rule.enabled);
		} catch (e) {
			hasEnabledRule = false;
		}

		const autoPaintButton = (
			<Button
				variant="secondary"
				size="sm"
				className="flex items-center justify-start gap-2 w-full h-auto py-2 whitespace-normal text-left"
				disabled={disabled || !hasEnabledRule}
				onClick={() => this._runAction(() => this._applyAutoPaintRules())}
			>
				<LuWandSparkles className="w-4 h-4 shrink-0" /> Apply auto-paint rules to the whole terrain…
			</Button>
		);

		return (
			<div className="flex flex-col gap-2 w-full">
				{hasEnabledRule ? (
					autoPaintButton
				) : (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="w-full">{autoPaintButton}</span>
						</TooltipTrigger>
						<TooltipContent>Enable the auto-paint rule of a layer first</TooltipContent>
					</Tooltip>
				)}

				<Button
					variant="secondary"
					size="sm"
					className="flex items-center justify-start gap-2 w-full"
					disabled={disabled}
					onClick={() => this._runAction(() => runTerrainOperationWithFeedback(this.props.editor, this.props.mesh, { type: "normalize-weights" }, "Normalizing weights"))}
				>
					<LuScale className="w-4 h-4 shrink-0" /> Normalize weights
				</Button>
			</div>
		);
	}

	/** Runs a change of the details or material settings: the notifications it triggers don't re-key the fields (they keep focus and pointer lock). */
	private _runOwnChange(change: () => void): void {
		++this._ownChangeDepth;

		try {
			change();
		} finally {
			--this._ownChangeDepth;
		}
	}

	private _isRelevantMesh(mesh: Mesh): boolean {
		// Meshes sharing the terrain material share its layers.
		return mesh === this.props.mesh || (!!mesh.material && mesh.material === this.props.mesh.material);
	}

	private _handleTerrainChanged(event: ITerrainChangedEvent): void {
		try {
			if (this._unmounted || !this._isRelevantMesh(event.mesh)) {
				return;
			}

			// §1.4: fields re-key on every change except the live writes of the layer proxy (and this section's own commits).
			if (event.reason !== "layer-edit" && this._ownChangeDepth === 0) {
				this.setState({ fieldsRevision: this.state.fieldsRevision + 1 });
			}

			if (event.kinds.some((kind) => kind === "weights" || kind === "layers" || kind === "material")) {
				this._scheduleCoverageRefresh();
			}

			if (event.reason !== "layer-edit") {
				this._refreshThumbnails();
			}

			this._observePlugin();
			this.forceUpdate();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleBusyChanged(): void {
		try {
			if (!this._unmounted) {
				const busy = isTerrainBusy();
				// Compared with the latest QUEUED state, not this.state: a short operation (Add layer, a dropped texture set) opens and closes
				// its busy scope before React applies the first update, and the "idle" notification compared with the stale this.state was
				// dropped, leaving the whole section disabled until the next operation.
				this.setState((state) => (state.busy === busy ? null : { busy }));
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleSettingsChanged(): void {
		try {
			// Active layer, collapsed blocks, reset...
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
				this.setState({ fieldsRevision: this.state.fieldsRevision + 1 });
				this._scheduleCoverageRefresh();
				this._refreshThumbnails();
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	/** Observes the resources of the current terrain material (weights loaded → coverage). */
	private _observePlugin(): void {
		const plugin = getTerrainPlugin(this.props.mesh);
		if (plugin === this._observedPlugin) {
			return;
		}

		this._stopObservingPlugin();

		this._observedPlugin = plugin;
		this._pluginObserver =
			plugin?.onResourcesChangedObservable.add(() => {
				try {
					this._scheduleCoverageRefresh();
					this._refreshThumbnails();
				} catch (e) {
					reportTerrainTabError(this.props.editor, e);
				}
			}) ?? null;
	}

	private _stopObservingPlugin(): void {
		if (this._observedPlugin && this._pluginObserver) {
			this._observedPlugin.onResourcesChangedObservable.remove(this._pluginObserver);
		}

		this._observedPlugin = null;
		this._pluginObserver = null;
	}

	private _scheduleCoverageRefresh(): void {
		if (this._coverageTimeout !== null) {
			clearTimeout(this._coverageTimeout);
		}

		this._coverageTimeout = setTimeout(() => {
			this._coverageTimeout = null;
			this._refreshCoverage();
		}, TERRAIN_LAYERS_COVERAGE_DELAY_MS);
	}

	private _refreshCoverage(): void {
		try {
			if (this._unmounted) {
				return;
			}

			const coverage = getTerrainLayerCoverage(this.props.mesh);
			this.setState({ coverage });
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _refreshThumbnails(): void {
		const layers = getTerrainPlugin(this.props.mesh)?.data.layers ?? [];

		for (const layer of layers) {
			const path = getTerrainMapSlotAbsolutePath(layer.albedo);
			if (!path) {
				continue;
			}

			getTerrainImageThumbnail(path, TERRAIN_LAYERS_THUMBNAIL_SIZE)
				.then((url) => {
					if (!this._unmounted && this.state.thumbnails[path] !== url) {
						this.setState((state) => ({ thumbnails: { ...state.thumbnails, [path]: url } }));
					}
				})
				.catch((e) => console.error(e));
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
				}
			}
		})();
	}

	private _selectLayer(layerId: string): void {
		try {
			const material = this.props.mesh.material;
			if (material) {
				setActiveTerrainLayerId(material, layerId);
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private async _enableTexturePainting(from: "create" | "convert"): Promise<void> {
		await enableTerrainTexturePainting(this.props.editor, this.props.mesh, { from });
	}

	private async _disableTexturePainting(): Promise<void> {
		const confirmed = await showConfirm(
			"Disable texture painting?",
			"The terrain gets back the material it had before texture painting was enabled (or a PBR material using the first layer's albedo and normal maps). Painted layers are kept in the terrain material while this can be undone.",
			{ confirmText: "Disable" }
		);

		if (confirmed) {
			await disableTerrainTexturePainting(this.props.editor, this.props.mesh);
		}
	}

	private async _addLayer(): Promise<void> {
		const layers = getTerrainPlugin(this.props.mesh)?.data.layers ?? [];

		const ids = await addTerrainMaterialLayers(this.props.editor, this.props.mesh, [{ name: getTerrainNewLayerName(layers) }]);
		if (ids[0]) {
			this._selectLayer(ids[0]);
		}
	}

	private async _duplicateLayer(layer: Readonly<ITerrainLayerData>): Promise<void> {
		const id = await duplicateTerrainMaterialLayer(this.props.editor, this.props.mesh, layer.id);
		if (id) {
			this._selectLayer(id);
		}
	}

	private async _moveLayer(layer: Readonly<ITerrainLayerData>, toIndex: number): Promise<void> {
		await moveTerrainMaterialLayer(this.props.editor, this.props.mesh, layer.id, toIndex);
	}

	private async _removeLayer(layer: Readonly<ITerrainLayerData>): Promise<void> {
		const confirmed = await showConfirm(`Remove layer “${layer.name}”?`, "Its painted areas go to the other layers. This can be undone.", { confirmText: "Remove" });

		if (confirmed) {
			await removeTerrainMaterialLayer(this.props.editor, this.props.mesh, layer.id);
		}
	}

	private async _fillLayer(layer: Readonly<ITerrainLayerData>): Promise<void> {
		const confirmed = await showConfirm(
			`Fill the terrain with “${layer.name}”?`,
			`“${layer.name}” covers the whole terrain and the other layers are cleared. This can be undone.`,
			{
				confirmText: "Fill",
			}
		);

		if (confirmed) {
			await runTerrainOperationWithFeedback(this.props.editor, this.props.mesh, { type: "fill-layer", layerId: layer.id }, "Filling");
		}
	}

	private async _applyAutoPaintRules(): Promise<void> {
		const confirmed = await showConfirm(
			"Apply auto-paint rules to the whole terrain?",
			"Every painted layer is recomputed from the height, slope and noise rules of the layers. This can be undone.",
			{ confirmText: "Apply" }
		);

		if (confirmed) {
			await runTerrainOperationWithFeedback(this.props.editor, this.props.mesh, { type: "auto-paint" }, "Auto-painting");
		}
	}

	private _rebuildLayerTextures(plugin: TerrainMaterialPlugin): void {
		try {
			plugin.rebuildLayerTextures();
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	/**
	 * setTerrainMaterialSettings(this.props.editor, one undo entry). Its synchronous notification doesn't re-key the fields (own change); the section re-renders
	 * (a switch shows or hides the Transition field).
	 * @param patch defines the settings to change.
	 * @param mesh defines the terrain whose material changes (default: the current target).
	 */
	private _commitMaterialSettings(patch: ITerrainMaterialSettingsPatch, mesh: Mesh = this.props.mesh): void {
		try {
			this._runOwnChange(() => {
				setTerrainMaterialSettings(this.props.editor, mesh, patch).catch((e) => {
					reportTerrainTabError(this.props.editor, e);
					this._invalidateMaterialDraft();
				});
			});

			if (!this._unmounted) {
				this.forceUpdate();
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _scheduleMaterialDraftCommit(key: TerrainMaterialDraftNumberKey): void {
		this._materialDraftEdited.add(key);

		if (this._materialCommitTimeout !== null) {
			clearTimeout(this._materialCommitTimeout);
		}

		this._materialCommitTimeout = setTimeout(() => {
			this._materialCommitTimeout = null;
			this._flushMaterialDraft();
		}, TERRAIN_LAYERS_MATERIAL_COMMIT_DELAY_MS);
	}

	/**
	 * Commits the number fields of the Material settings block edited since the last commit (transition, anisotropy) when they differ from
	 * the material (one undo entry, registered synchronously: no resampling). Called 400 ms after the last change, when a field is left or
	 * a drag ends, and when the target changes or the section unmounts.
	 * @param mesh defines the terrain the draft belongs to (default: the current target; the previous one when the target changed).
	 */
	private _flushMaterialDraft(mesh: Mesh = this.props.mesh): void {
		if (this._materialCommitTimeout !== null) {
			clearTimeout(this._materialCommitTimeout);
			this._materialCommitTimeout = null;
		}

		const edited = Array.from(this._materialDraftEdited);
		this._materialDraftEdited.clear();

		try {
			const draft = this._materialDraft;
			const plugin = getTerrainPlugin(mesh);
			if (!draft || !plugin || !edited.length) {
				return;
			}

			const patch: ITerrainMaterialSettingsPatch = {};
			if (edited.includes("heightBlendTransition") && Number.isFinite(draft.heightBlendTransition) && draft.heightBlendTransition !== plugin.data.heightBlendTransition) {
				patch.heightBlendTransition = draft.heightBlendTransition;
			}

			const anisotropy = Math.round(draft.anisotropy);
			if (edited.includes("anisotropy") && Number.isFinite(anisotropy) && anisotropy !== plugin.data.anisotropy) {
				patch.anisotropy = anisotropy;
			}

			if (Object.keys(patch).length > 0) {
				this._commitMaterialSettings(patch, mesh);
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _startRename(layer: Readonly<ITerrainLayerData>): void {
		this.setState({ renamingLayerId: layer.id, renameValue: layer.name });
	}

	private _requestRename(layerId: string): void {
		this._pendingRenameLayerId = layerId;
	}

	/**
	 * The layer menu closed: when its "Rename" item was selected, the inline editor opens now (the menu's focus trap is gone) and the focus is
	 * NOT given back to the ⋯ trigger, so the editor's input keeps it.
	 */
	private _handleLayerMenuCloseAutoFocus(ev: Event, layerId: string): void {
		const pending = this._pendingRenameLayerId;
		this._pendingRenameLayerId = null;

		if (pending !== layerId) {
			return;
		}

		ev.preventDefault();

		try {
			const layer = getTerrainPlugin(this.props.mesh)?.data.layers.find((item) => item.id === layerId);

			if (layer && !this._unmounted) {
				this._startRename(layer);
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleRenameKeyDown(ev: KeyboardEvent<HTMLInputElement>, layer: Readonly<ITerrainLayerData>): void {
		ev.stopPropagation();

		if (ev.key === "Enter") {
			this._commitRename(layer);
		} else if (ev.key === "Escape") {
			this.setState({ renamingLayerId: null });
		}
	}

	private _commitRename(layer: Readonly<ITerrainLayerData>): void {
		if (this.state.renamingLayerId !== layer.id) {
			return;
		}

		const name = this.state.renameValue.trim();
		this.setState({ renamingLayerId: null });

		if (!name || name === layer.name) {
			return;
		}

		try {
			updateTerrainMaterialLayer(this.props.mesh, layer.id, { name }, { undo: true });
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleLayerDragStart(ev: DragEvent<HTMLSpanElement>, layerId: string): void {
		try {
			ev.stopPropagation();

			ev.dataTransfer.effectAllowed = "move";
			ev.dataTransfer.setData(TERRAIN_LAYER_DRAG_TYPE, layerId);

			const row = (ev.currentTarget as HTMLElement).closest("[data-terrain-layer-row]") as HTMLElement | null;
			if (row) {
				ev.dataTransfer.setDragImage(row, 16, row.clientHeight / 2);
			}

			this.setState({ draggedLayerId: layerId, dropIndex: null });
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleLayerDragEnd(): void {
		this.setState({ draggedLayerId: null, dropIndex: null });
	}

	private _isLayerDrag(ev: DragEvent<HTMLElement>): boolean {
		return this.state.draggedLayerId !== null && Array.from(ev.dataTransfer?.types ?? []).includes(TERRAIN_LAYER_DRAG_TYPE);
	}

	private _handleRowDragOver(ev: DragEvent<HTMLDivElement>, index: number): void {
		try {
			if (!this._isLayerDrag(ev)) {
				return;
			}

			const rect = ev.currentTarget.getBoundingClientRect();
			const insertion = ev.clientY < rect.top + rect.height / 2 ? index : index + 1;

			if (this.state.dropIndex !== insertion) {
				this.setState({ dropIndex: insertion });
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleListDragOver(ev: DragEvent<HTMLDivElement>): void {
		try {
			if (!this._isLayerDrag(ev)) {
				return;
			}

			ev.preventDefault();
			ev.dataTransfer.dropEffect = "move";
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleListDragLeave(ev: DragEvent<HTMLDivElement>): void {
		try {
			if (this.state.dropIndex !== null && !ev.currentTarget.contains(ev.relatedTarget as Node | null)) {
				this.setState({ dropIndex: null });
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}

	private _handleListDrop(ev: DragEvent<HTMLDivElement>, layers: readonly ITerrainLayerData[]): void {
		try {
			if (!this._isLayerDrag(ev)) {
				return;
			}

			ev.preventDefault();
			ev.stopPropagation();

			const layerId = ev.dataTransfer.getData(TERRAIN_LAYER_DRAG_TYPE) || this.state.draggedLayerId;
			const insertion = this.state.dropIndex;

			this.setState({ draggedLayerId: null, dropIndex: null });

			const from = layers.findIndex((layer) => layer.id === layerId);
			if (from < 0 || insertion === null) {
				return;
			}

			const toIndex = getTerrainLayerMoveIndex(from, insertion);
			if (toIndex !== from) {
				const layer = layers[from];
				this._runAction(() => this._moveLayer(layer, toIndex));
			}
		} catch (e) {
			reportTerrainTabError(this.props.editor, e);
		}
	}
}
