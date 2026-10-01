import { ipcRenderer } from "electron";
import { join } from "path/posix";

import { ReactNode } from "react";
import { toast } from "sonner";

import { FaMountainSun } from "react-icons/fa6";
import {
	LuAudioWaveform,
	LuEllipsis,
	LuFileDown,
	LuFileUp,
	LuFocus,
	LuFolderOpen,
	LuGrid3X3,
	LuHand,
	LuLayers,
	LuListTree,
	LuLoader,
	LuMountain,
	LuPaintbrush,
	LuRotateCcw,
	LuScaling,
	LuSettings2,
	LuSparkles,
	LuTarget,
	LuTrendingUp,
	LuTriangleAlert,
} from "react-icons/lu";

import type { Mesh } from "babylonjs";
import type { TerrainBudgetFeature, TerrainMaterialPlugin } from "babylonjs-editor-tools";

import type { Editor } from "../../../../main";

import { Badge } from "../../../../../ui/shadcn/ui/badge";
import { Toggle } from "../../../../../ui/shadcn/ui/toggle";
import { Button } from "../../../../../ui/shadcn/ui/button";
import { Progress } from "../../../../../ui/shadcn/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "../../../../../ui/shadcn/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../../ui/shadcn/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../../ui/shadcn/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../../../../../ui/shadcn/ui/dropdown-menu";

import { showConfirm } from "../../../../../ui/dialog";
import { openSingleFileDialog } from "../../../../../tools/dialog";

import type { TerrainCategory, TerrainOverlay } from "../../../../../tools/terrain/core/types";
import { getDefaultTerrainSubdivisions } from "../../../../../tools/terrain/core/settings";

import { setTerrainPhysicsShapeToMesh } from "../../../../../tools/terrain/engine/dependents";
import { ensureTerrainUniqueMaterial, getTerrainRememberedMaterial, relinkTerrainWeightMap, restoreTerrainMaterial } from "../../../../../tools/terrain/engine/material";
import { applyTerrainOperation } from "../../../../../tools/terrain/engine/operations";
import { makeTerrainGeometryUnique, resizeTerrain, setTerrainMeshVisible } from "../../../../../tools/terrain/engine/structure";
import type { ITerrainBusyInfo, ITerrainInfo } from "../../../../../tools/terrain/engine/types";

import { getProjectDirectory, resolveRenamedAssetPath, toProjectRelativePath } from "../../../../../tools/terrain/io/paths";

import { EditorInspectorNumberField } from "../../fields/number";

import type { ITerrainViewportStatus, TerrainViewportController } from "../viewport/controller";
import { getTerrainSettingsExternalRevision, notifyTerrainSettingsChanged, resetTerrainSettings, terrainSettings, updateTerrainSettings } from "../settings";

import { reportTerrainTabError } from "../drop-actions";
import { formatTerrainBusy, formatTerrainResolution, formatTerrainSize } from "../format";

import { listTerrainTabTerrains, selectTerrainTabNode } from "./empty";

import { openTerrainHeightmapExport } from "../dialogs/import-heightmap";

/** Weight maps needed for a layer count (getTerrainWeightMapCount of the runtime). */
function getTerrainHeaderWeightMapCount(layerCount: number): 1 | 2 {
	return layerCount > 4 ? 2 : 1;
}

/**
 * Category of the settings (Sculpt when the settings are not loaded yet).
 */
export function getTerrainTabCategory(): TerrainCategory {
	return terrainSettings.category ?? "sculpt";
}

/**
 * External revision of the settings (0 when unavailable): key of the settings fields (§1.4, D19).
 */
export function getTerrainTabExternalRevision(): number {
	try {
		return getTerrainSettingsExternalRevision();
	} catch {
		return 0;
	}
}

/**
 * Switches the category (external settings change, §1.5).
 * @param category defines the new category.
 */
export function setTerrainTabCategory(category: TerrainCategory): void {
	updateTerrainSettings(
		(settings) => {
			settings.category = category;
		},
		["category"]
	);
}

/** Percent adapter of view.overlayOpacity (stable identity: the NumberField resyncs only when its object changes). */
const terrainOverlayOpacityAdapter = {
	get value(): number {
		return Math.round((terrainSettings.view?.overlayOpacity ?? 0) * 100);
	},
	set value(value: number) {
		if (terrainSettings.view) {
			terrainSettings.view.overlayOpacity = Math.min(1, Math.max(0, value / 100));
		}
	},
};

interface ITerrainOverlayToggle {
	overlay: TerrainOverlay;
	label: string;
	icon: ReactNode;
	paintOnly?: boolean;
}

const TERRAIN_OVERLAY_TOGGLES: readonly ITerrainOverlayToggle[] = [
	{ overlay: "layer-weights", label: "Layer weights", icon: <LuLayers /> },
	{ overlay: "active-layer", label: "Active layer", icon: <LuTarget />, paintOnly: true },
	{ overlay: "contours", label: "Contours", icon: <LuAudioWaveform /> },
	{ overlay: "slope", label: "Slope", icon: <LuTrendingUp /> },
	{ overlay: "grid", label: "Vertex grid", icon: <LuGrid3X3 /> },
];

const TERRAIN_OVERLAYS_DISABLED_TOOLTIP =
	"Overlays are drawn by the terrain material; this terrain keeps its own material. The HUD still shows the height and slope under the cursor.";

const TERRAIN_BUDGET_FEATURE_LABELS: Readonly<Record<TerrainBudgetFeature, string>> = {
	normals: "layer normals",
	weights1: "layers 5–8",
	albedo: "layer colors",
	terrain: "terrain layers",
};

/**
 * Runs an action of the header and reports its errors (refusals as warnings, §1.17).
 */
async function runTerrainHeaderAction(editor: Editor, action: () => unknown | Promise<unknown>): Promise<void> {
	try {
		await action();
	} catch (e) {
		reportTerrainTabError(editor, e);
	}
}

export interface ITerrainHeaderProps {
	/** The editor reference. */
	editor: Editor;
	/** The target terrain. */
	mesh: Mesh;
	/** getTerrainMeshInfo(mesh). */
	info: ITerrainInfo;
	/** Terrain material plugin of the terrain, null without terrain material. */
	plugin: TerrainMaterialPlugin | null;
	/** Viewport controller of the tab (Navigate toggle), null when unavailable. */
	controller: TerrainViewportController | null;
	/** Last status of the controller. */
	status: Readonly<ITerrainViewportStatus>;
	/** Running terrain operation (busy banner), null when idle. */
	busy: Readonly<ITerrainBusyInfo> | null;
	/** Number of layer source files that can't be found (layer textures banner). */
	missingLayerSources?: number;
	/** Opens the Resize / resample dialog (§1.13.2). */
	onResize: () => void;
	/** Opens the Import heightmap flow (§1.13.4). */
	onImportHeightmap: () => void;
	/** Switches to the Settings category and opens the Generate panel (§1.13.3). */
	onGenerate: () => void;
	/** [Rebuild] of the layer textures banner: rebuilds the layer arrays and counts the missing sources again (default: plugin.rebuildLayerTextures). */
	onRebuildLayerTextures?: () => void;
}

interface ITerrainBannerProps {
	children: ReactNode;
	/** Error banners use a red icon. */
	error?: boolean;
	icon?: ReactNode;
}

function TerrainBanner(props: ITerrainBannerProps): JSX.Element {
	return (
		<Badge variant="secondary" className="flex items-start gap-2 w-full font-normal whitespace-normal text-left">
			<span className="shrink-0 mt-0.5">{props.icon ?? <LuTriangleAlert className={`w-4 h-4 ${props.error ? "text-red-500" : "text-amber-500"}`} />}</span>
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 break-words">{props.children}</div>
		</Badge>
	);
}

interface ITerrainBannerActionProps {
	children: ReactNode;
	disabled?: boolean;
	onClick: () => void;
}

function TerrainBannerAction(props: ITerrainBannerActionProps): JSX.Element {
	return (
		<button
			type="button"
			disabled={props.disabled}
			onClick={(ev) => {
				ev.stopPropagation();
				props.onClick();
			}}
			className="underline underline-offset-2 font-semibold hover:text-primary disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition-colors duration-300"
		>
			{props.children}
		</button>
	);
}

/**
 * Header of the `terrain` state (§1.5): terrain selector, resolution and size badges, Navigate toggle, menu, category switch, overlay toggles
 * and the banners (one per issue, with an action link).
 */
export function TerrainHeader(props: ITerrainHeaderProps): JSX.Element {
	const { editor, mesh, info, plugin } = props;

	const busy = props.busy !== null;
	const readOnly = info.readOnly;
	const newerVersion = info.warnings.includes("newer-version");
	const category = getTerrainTabCategory();
	const overlay = terrainSettings.view?.overlay ?? "none";
	const hasTerrainMaterial = info.material?.isTerrainMaterial === true;

	const terrains = listTerrainTabTerrains(mesh.getScene());
	if (!terrains.some((item) => item.mesh === mesh)) {
		terrains.unshift({ mesh, name: mesh.name, subdivisions: info.subdivisions });
	}

	function setOverlay(value: TerrainOverlay, pressed: boolean): void {
		updateTerrainSettings(
			(settings) => {
				settings.view.overlay = pressed ? value : "none";
			},
			["view.overlay"]
		);
	}

	function revealWeightFiles(): void {
		const projectDirectory = getProjectDirectory();
		const path = plugin?.data.weightMaps.find((weightMap) => !!weightMap);
		if (!projectDirectory || !path) {
			return;
		}

		ipcRenderer.send("editor:show-item", join(projectDirectory, resolveRenamedAssetPath(path)));
	}

	async function resetSettings(): Promise<void> {
		const confirmed = await showConfirm(
			"Reset brush and tool settings?",
			"Every tool, brush, filter and view setting goes back to its default. Your brushes and terrains are not changed.",
			{ confirmText: "Reset" }
		);

		if (confirmed) {
			resetTerrainSettings();
		}
	}

	return (
		<TooltipProvider delayDuration={300}>
			<div className="flex flex-col gap-2 w-full">
				<div className="flex flex-wrap items-center gap-2 w-full">
					<Select
						value={String(mesh.uniqueId)}
						onValueChange={(value) => {
							const item = terrains.find((terrain) => String(terrain.mesh.uniqueId) === value);
							if (item && item.mesh !== mesh) {
								selectTerrainTabNode(editor, item.mesh);
							}
						}}
					>
						<SelectTrigger className="h-8 flex-1 min-w-[120px]">
							<SelectValue>
								<span className="flex items-center gap-2 min-w-0">
									<FaMountainSun className="w-4 h-4 shrink-0" />
									<span className="truncate">{mesh.name}</span>
								</span>
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{terrains.map((item) => (
								<SelectItem key={item.mesh.uniqueId} value={String(item.mesh.uniqueId)}>
									<span className="flex items-center gap-2">
										<FaMountainSun className="w-4 h-4" />
										{item.name}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Badge variant="secondary" className="shrink-0">
						{formatTerrainResolution(info.subdivisions)}
					</Badge>
					<Badge variant="secondary" className="shrink-0">
						{formatTerrainSize(info.width, info.height)}
					</Badge>

					<div className="flex items-center gap-1 ml-auto">
						<Tooltip>
							<TooltipTrigger asChild>
								<Toggle
									size="sm"
									aria-label="Navigate (N)"
									pressed={props.status.navigateMode}
									onPressedChange={() => props.controller?.setNavigateMode(!props.status.navigateMode)}
								>
									<LuHand />
								</Toggle>
							</TooltipTrigger>
							<TooltipContent>Navigate (N): left drag moves the camera instead of editing</TooltipContent>
						</Tooltip>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="w-8 h-8" title="Terrain menu" aria-label="Terrain menu">
									<LuEllipsis className="w-4 h-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem className="gap-2" onClick={() => void runTerrainHeaderAction(editor, () => editor.layout.preview.focusObject(mesh))}>
									<LuFocus className="w-4 h-4" /> Focus terrain
								</DropdownMenuItem>
								<DropdownMenuItem className="gap-2" onClick={() => void runTerrainHeaderAction(editor, () => editor.layout.graph.setSelectedNode(mesh))}>
									<LuListTree className="w-4 h-4" /> Select in graph
								</DropdownMenuItem>

								<DropdownMenuSeparator />

								<DropdownMenuItem className="gap-2" disabled={busy || newerVersion} onClick={() => props.onResize()}>
									<LuScaling className="w-4 h-4" /> Resize / resample…
								</DropdownMenuItem>
								<DropdownMenuItem className="gap-2" disabled={busy || readOnly} onClick={() => props.onImportHeightmap()}>
									<LuFileUp className="w-4 h-4" /> Import heightmap…
								</DropdownMenuItem>
								<DropdownMenuItem className="gap-2" onClick={() => void openTerrainHeightmapExport(editor, mesh)}>
									<LuFileDown className="w-4 h-4" /> Export heightmap…
								</DropdownMenuItem>
								<DropdownMenuItem className="gap-2" disabled={readOnly} onClick={() => props.onGenerate()}>
									<LuSparkles className="w-4 h-4" /> Generate…
								</DropdownMenuItem>

								{!!plugin?.data.weightMaps.some((path) => !!path) && (
									<DropdownMenuItem className="gap-2" onClick={() => void runTerrainHeaderAction(editor, () => revealWeightFiles())}>
										<LuFolderOpen className="w-4 h-4" /> Reveal weight files
									</DropdownMenuItem>
								)}

								<DropdownMenuSeparator />

								<DropdownMenuItem className="gap-2" onClick={() => void runTerrainHeaderAction(editor, () => resetSettings())}>
									<LuRotateCcw className="w-4 h-4" /> Reset brush & tool settings…
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<ToggleGroup
					type="single"
					size="sm"
					value={category}
					onValueChange={(value) => value && void runTerrainHeaderAction(editor, () => setTerrainTabCategory(value as TerrainCategory))}
					className="w-full"
				>
					<ToggleGroupItem value="sculpt" className="flex-1 min-w-0 gap-1">
						<LuMountain /> <span className="truncate">Sculpt</span>
					</ToggleGroupItem>
					<ToggleGroupItem value="paint" className="flex-1 min-w-0 gap-1">
						<LuPaintbrush /> <span className="truncate">Paint</span>
					</ToggleGroupItem>
					<ToggleGroupItem value="settings" className="flex-1 min-w-0 gap-1">
						<LuSettings2 /> <span className="truncate">Settings</span>
					</ToggleGroupItem>
				</ToggleGroup>

				<div className="flex flex-wrap items-center gap-1 w-full">
					{TERRAIN_OVERLAY_TOGGLES.filter((toggle) => !toggle.paintOnly || category === "paint" || overlay === toggle.overlay).map((toggle) => (
						<Tooltip key={toggle.overlay}>
							<TooltipTrigger asChild>
								<span>
									<Toggle
										size="sm"
										aria-label={toggle.label}
										disabled={!hasTerrainMaterial}
										pressed={overlay === toggle.overlay}
										onPressedChange={(pressed) => void runTerrainHeaderAction(editor, () => setOverlay(toggle.overlay, pressed))}
									>
										{toggle.icon}
									</Toggle>
								</span>
							</TooltipTrigger>
							<TooltipContent className="max-w-64">{hasTerrainMaterial ? toggle.label : TERRAIN_OVERLAYS_DISABLED_TOOLTIP}</TooltipContent>
						</Tooltip>
					))}
				</div>

				{hasTerrainMaterial && overlay !== "none" && (
					<div className="flex flex-col gap-1 w-full">
						<EditorInspectorNumberField
							key={`overlay-opacity-${getTerrainTabExternalRevision()}`}
							object={terrainOverlayOpacityAdapter}
							property="value"
							label="Opacity"
							min={0}
							max={100}
							step={1}
							noUndoRedo
							onChange={() => notifyTerrainSettingsChanged(["view.overlayOpacity"])}
						/>

						{overlay === "contours" && terrainSettings.view && (
							<EditorInspectorNumberField
								key={`contour-interval-${getTerrainTabExternalRevision()}`}
								object={terrainSettings.view}
								property="contourInterval"
								label="Interval"
								min={1}
								step={1}
								noUndoRedo
								onChange={() => notifyTerrainSettingsChanged(["view.contourInterval"])}
							/>
						)}
					</div>
				)}

				<TerrainHeaderBanners {...props} />
			</div>
		</TooltipProvider>
	);
}

/**
 * [Locate…] of the weights error banner (§1.5): for each weight map that failed (0 first), asks for a PNG inside the project and relinks it.
 */
async function locateTerrainWeightMaps(editor: Editor, mesh: Mesh, plugin: TerrainMaterialPlugin): Promise<void> {
	const count = getTerrainHeaderWeightMapCount(plugin.data.layers.length);

	for (let index = 0; index < count; ++index) {
		const k = index as 0 | 1;
		if (plugin.getWeightMap(k)) {
			continue;
		}

		const path = openSingleFileDialog({
			title: `Locate weight map ${k + 1}`,
			filters: [{ name: "PNG", extensions: ["png"] }],
		});

		if (!path) {
			return;
		}

		const relativePath = toProjectRelativePath(path.replace(/\\/g, "/"));
		if (!relativePath) {
			toast.error("The weight map must be inside the project folder.");
			return;
		}

		await relinkTerrainWeightMap(editor, mesh, k, relativePath);
	}
}

/**
 * [Reset weights] of the weights error banner (§1.5): layer 1 covers the whole terrain again (undoable fill-layer operation).
 */
async function resetTerrainWeights(editor: Editor, mesh: Mesh, plugin: TerrainMaterialPlugin): Promise<void> {
	const layer = plugin.data.layers[0];
	if (!layer) {
		return;
	}

	const confirmed = await showConfirm("Reset the painted layers?", "Layer 1 covers the whole terrain again. This can be undone.");
	if (confirmed) {
		await applyTerrainOperation(editor, mesh, { type: "fill-layer", layerId: layer.id });
	}
}

/**
 * Banners of the header (§1.5): busy progress, read-only states, sharing, visibility, runtime, physics, budget, loading and loading errors.
 */
export function TerrainHeaderBanners(props: ITerrainHeaderProps): JSX.Element {
	const { editor, mesh, info, plugin } = props;

	const scene = mesh.getScene();
	const warnings = info.warnings;
	const busy = props.busy !== null;
	const hasTerrainMaterial = info.material?.isTerrainMaterial === true;
	const banners: ReactNode[] = [];

	if (props.busy) {
		const progress = Math.min(1, Math.max(0, props.busy.progress));

		banners.push(
			<div key="busy" className="flex flex-col gap-1 w-full p-2 rounded-md bg-secondary">
				<div className="text-xs">{formatTerrainBusy(props.busy.label, progress)}</div>
				<Progress value={progress * 100} />
			</div>
		);
	}

	if (warnings.includes("newer-version")) {
		banners.push(<TerrainBanner key="newer-version">Created with a newer editor version: read-only.</TerrainBanner>);
	}

	if (warnings.includes("unsupported-resolution")) {
		const target = getDefaultTerrainSubdivisions(info.width, info.height, info.subdivisions);

		banners.push(
			<TerrainBanner key="unsupported-resolution">
				This terrain has {info.subdivisions} subdivisions; terrains support 2 to 1024: read-only.
				<TerrainBannerAction disabled={busy} onClick={() => void runTerrainHeaderAction(editor, () => resizeTerrain(editor, mesh, { subdivisions: target }))}>
					Resample to {target}
				</TerrainBannerAction>
			</TerrainBanner>
		);
	}

	if (warnings.includes("shared-geometry")) {
		const others = Math.max(1, (mesh.geometry?.meshes.length ?? 2) - 1);

		banners.push(
			<TerrainBanner key="shared-geometry">
				Shares its geometry with {others} other mesh(es).
				<TerrainBannerAction disabled={busy} onClick={() => void runTerrainHeaderAction(editor, () => makeTerrainGeometryUnique(editor, mesh))}>
					Make unique
				</TerrainBannerAction>
			</TerrainBanner>
		);
	}

	if (warnings.includes("shared-material")) {
		const count = mesh.material ? scene.meshes.filter((candidate) => candidate.material === mesh.material).length : 0;

		banners.push(
			<TerrainBanner key="shared-material">
				Terrain material shared by {Math.max(2, count)} meshes.
				<TerrainBannerAction disabled={busy} onClick={() => void runTerrainHeaderAction(editor, () => ensureTerrainUniqueMaterial(editor, mesh))}>
					Make unique
				</TerrainBannerAction>
			</TerrainBanner>
		);
	}

	if (warnings.includes("hidden") || !mesh.isEnabled() || !mesh.isVisible) {
		banners.push(
			<TerrainBanner key="hidden">
				“{mesh.name}” is hidden: strokes are disabled.
				<TerrainBannerAction disabled={busy} onClick={() => void runTerrainHeaderAction(editor, () => setTerrainMeshVisible(editor, mesh))}>
					Show
				</TerrainBannerAction>
			</TerrainBanner>
		);
	}

	if (warnings.includes("tilted")) {
		banners.push(<TerrainBanner key="tilted">Tilted terrain: heights are measured along its local Y axis.</TerrainBanner>);
	}

	if (warnings.includes("box-physics")) {
		banners.push(
			<TerrainBanner key="box-physics">
				Physics uses a box: bodies won&apos;t follow the relief.
				<TerrainBannerAction disabled={busy} onClick={() => void runTerrainHeaderAction(editor, () => setTerrainPhysicsShapeToMesh(editor, mesh))}>
					Use mesh shape
				</TerrainBannerAction>
			</TerrainBanner>
		);
	}

	const budget = plugin?.budgetInfo ?? info.budget;
	if (hasTerrainMaterial && budget && budget.dropped.length > 0) {
		const features = budget.dropped.map((feature) => TERRAIN_BUDGET_FEATURE_LABELS[feature] ?? feature).join(", ");

		banners.push(
			<TerrainBanner key="budget" error>
				GPU texture budget exceeded: {features} disabled ({budget.baseSamplers + budget.terrainSamplers}/{budget.budget || 16} textures).
			</TerrainBanner>
		);
	}

	const engine = scene.getEngine();
	if (hasTerrainMaterial && !engine.isWebGPU && engine.version < 2) {
		banners.push(<TerrainBanner key="webgl1">Terrain layers need WebGL2 or WebGPU.</TerrainBanner>);
	}

	const weightMapsState = plugin?.weightMapsState ?? info.weightMapsState;
	const layerTexturesState = plugin?.layerTexturesState ?? info.layerTexturesState;

	if (weightMapsState === "loading" || layerTexturesState === "loading") {
		banners.push(
			<TerrainBanner key="loading" icon={<LuLoader className="w-4 h-4 animate-spin" />}>
				Loading terrain textures…
			</TerrainBanner>
		);
	}

	if (plugin && (weightMapsState === "error" || warnings.includes("weights-error"))) {
		banners.push(
			<TerrainBanner key="weights-error" error>
				The painted layers couldn&apos;t be loaded ({plugin.lastError ?? "unknown error"}).
				<TerrainBannerAction onClick={() => void runTerrainHeaderAction(editor, () => plugin.reloadWeightMaps())}>Retry</TerrainBannerAction>
				<TerrainBannerAction disabled={busy} onClick={() => void runTerrainHeaderAction(editor, () => locateTerrainWeightMaps(editor, mesh, plugin))}>
					Locate…
				</TerrainBannerAction>
				<TerrainBannerAction
					disabled={busy || !plugin.data.layers.length}
					onClick={() => void runTerrainHeaderAction(editor, () => resetTerrainWeights(editor, mesh, plugin))}
				>
					Reset weights
				</TerrainBannerAction>
			</TerrainBanner>
		);
	}

	const missingSources = props.missingLayerSources ?? 0;
	if (plugin && hasTerrainMaterial && (layerTexturesState === "error" || warnings.includes("layers-error") || missingSources > 0)) {
		banners.push(
			<TerrainBanner key="layers-error" error>
				Some layer textures couldn&apos;t be loaded: {Math.max(1, missingSources)} file(s).
				<TerrainBannerAction
					onClick={() => void runTerrainHeaderAction(editor, () => (props.onRebuildLayerTextures ? props.onRebuildLayerTextures() : plugin.rebuildLayerTextures()))}
				>
					Rebuild
				</TerrainBannerAction>
			</TerrainBanner>
		);
	}

	if (warnings.includes("material-unassigned")) {
		const remembered = getTerrainRememberedMaterial(mesh);

		banners.push(
			<TerrainBanner key="material-unassigned">
				Terrain material “{remembered?.name ?? "terrain material"}” is no longer assigned: its painted layers are not shown.
				<TerrainBannerAction disabled={busy} onClick={() => void runTerrainHeaderAction(editor, () => restoreTerrainMaterial(editor, mesh))}>
					Restore
				</TerrainBannerAction>
			</TerrainBanner>
		);
	}

	return <>{banners.length > 0 && <div className="flex flex-col gap-1 w-full">{banners}</div>}</>;
}
