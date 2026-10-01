import { readJSON } from "fs-extra";
import { join } from "path/posix";

import { toast } from "sonner";

import type { Mesh } from "babylonjs";
import type { ITerrainLayerData } from "babylonjs-editor-tools";

import type { Editor } from "../../../main";

import { getActiveTerrainTool } from "../../../../tools/terrain/core/settings";
import type { ITerrainDetectedLayerMaps } from "../../../../tools/terrain/core/layer-maps";

import { getTerrainMeshInfo } from "../../../../tools/terrain/engine/info";
import { createTerrainLayerFromMaterialData, addTerrainMaterialLayers, updateTerrainMaterialLayer } from "../../../../tools/terrain/engine/layers";
import { getTerrainRefusalMessage } from "../../../../tools/terrain/engine/stroke";
import { TerrainRefusedError } from "../../../../tools/terrain/engine/types";
import { isTerrainBusy } from "../../../../tools/terrain/engine/yield";

import { importTerrainLayerMask } from "../../../../tools/terrain/io/masks";
import { TERRAIN_BRUSH_EXR_MESSAGE } from "../../../../tools/terrain/io/brush-decode";
import { getProjectDirectory } from "../../../../tools/terrain/io/paths";
import { TerrainBrushLibrary, type ITerrainLibraryBrush } from "../../../../tools/terrain/io/brush-library";
import { expandTerrainDroppedPaths, importTerrainSourceFiles, readTerrainPathsFromDataTransfer } from "../../../../tools/terrain/io/sources";

import { setActiveTerrainLayerId, updateTerrainSettings } from "./settings";
import { getTerrainDropExtension, getTerrainDropUnusedPaths, type TerrainDropAction, type TerrainDropZone } from "./drop-routing";
import { formatTerrainFileNames, getTerrainFileBaseName, getTerrainFileName } from "./format";

import { openTerrainSplatImport } from "./dialogs/import-splat";

/** Maximum number of layers of a terrain material (§1.10). */
const TERRAIN_MAX_LAYERS = 8;

/** Errors of the Terrain tab are deduplicated per message for 5 s (§1.2). */
const TERRAIN_ERROR_TOAST_DEDUPLICATION_MS = 5000;
const lastTerrainErrorToasts = new Map<string, number>();

/**
 * Message of an unknown thrown value.
 * @param error defines the thrown value.
 */
export function getTerrainErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return typeof error === "string" ? error : String(error);
}

/**
 * Throws the "busy" refusal (§1.17) while a terrain busy scope is open, external ones included: the tab never starts a terrain edit in the
 * middle of an operation or of an agent editing through the MCP. The engine's own refusals ignore the external scopes (their MCP engine
 * calls run inside them), so the tab's entry points that are not disabled while busy (drops, the Apply of its dialogs) check it themselves.
 */
export function assertTerrainTabNotBusy(): void {
	if (isTerrainBusy()) {
		throw new TerrainRefusedError("busy", getTerrainRefusalMessage("busy"));
	}
}

/**
 * Reports an error of the Terrain tab (§1.2): editor console + a single `toast.error("Terrain tool error: <message>")` per message for 5 s.
 * Refusals (TerrainRefusedError) are expected: they show their §1.17 text as a warning instead.
 * @param editor defines the editor reference.
 * @param error defines the thrown value.
 */
export function reportTerrainTabError(editor: Editor | null | undefined, error: unknown): void {
	if (error instanceof TerrainRefusedError) {
		toast.warning(error.message);
		return;
	}

	const message = getTerrainErrorMessage(error);

	try {
		editor?.layout?.console?.error(`Terrain tool error: ${message}`);
	} catch {
		// The console may not exist yet (tests, early mount).
	}

	const now = Date.now();
	const last = lastTerrainErrorToasts.get(message);
	if (last !== undefined && now - last < TERRAIN_ERROR_TOAST_DEDUPLICATION_MS) {
		return;
	}

	lastTerrainErrorToasts.set(message, now);
	toast.error(`Terrain tool error: ${message}`);
}

function toTerrainSlashPath(path: string): string {
	return path.replace(/\\/g, "/");
}

/** Files of the current assets drag, predicted during dragover (predictTerrainDraggedPaths); reset at every drop. */
let terrainDragPrediction: { key: string; paths: string[] | null; pending: boolean } | null = null;

/**
 * Paths of a drop (§1.9), read SYNCHRONOUSLY (the DataTransfer is unreadable once the event returns): the "assets" JSON payload of the
 * assets browser (expanded to the whole browser selection when the dragged path belongs to it: the payload only carries the files sharing
 * the dragged extension) or the OS files (webUtils.getPathForFile). "/" separators, duplicates removed. Folders are not expanded.
 * @param editor defines the editor reference.
 * @param dataTransfer defines the data transfer of the drop event.
 */
export function readTerrainDropPaths(editor: Editor, dataTransfer: DataTransfer): string[] {
	// The next drag predicts its files again (folders may have changed on disk).
	terrainDragPrediction = null;

	const paths = readTerrainPathsFromDataTransfer(dataTransfer).map((path) => toTerrainSlashPath(path));

	if (Array.from(dataTransfer.types ?? []).includes("assets")) {
		const selection = (editor.layout?.assets?.state?.selectedKeys ?? []).map((key) => toTerrainSlashPath(key));
		if (paths.some((path) => selection.includes(path))) {
			return Array.from(new Set([...paths, ...selection]));
		}
	}

	return Array.from(new Set(paths));
}

/**
 * Reads the paths of a drop synchronously (readTerrainDropPaths) and resolves them with the folders expanded (expandTerrainDroppedPaths:
 * recursive, max depth 8, max 512 files). Call it inside the drop event handler, before any await.
 * @param editor defines the editor reference.
 * @param dataTransfer defines the data transfer of the drop event.
 */
export function readTerrainDropPathsAsync(editor: Editor, dataTransfer: DataTransfer): Promise<string[]> {
	let paths: string[];
	try {
		paths = readTerrainDropPaths(editor, dataTransfer);
	} catch (e) {
		return Promise.reject(e);
	}

	return paths.length ? expandTerrainDroppedPaths(paths) : Promise.resolve([]);
}

/**
 * Files of the current drag when they can be known during `dragover` (§1.9 overlay): assets dragged from the assets browser are always part
 * of its selection (the browser selects the dragged item at drag start), so the selection is returned; selections containing folders are
 * expanded asynchronously once (null until the expansion resolved: the following dragover events get it). null for OS drags, whose file names
 * are not readable during dragover ("Drop to add…").
 * @param editor defines the editor reference.
 * @param dataTransfer defines the data transfer of the dragover event.
 */
export function predictTerrainDraggedPaths(editor: Editor, dataTransfer: DataTransfer): string[] | null {
	if (!Array.from(dataTransfer.types ?? []).includes("assets")) {
		return null;
	}

	const selection = (editor.layout?.assets?.state?.selectedKeys ?? []).map((key) => toTerrainSlashPath(key));
	if (!selection.length) {
		return null;
	}

	if (selection.every((path) => getTerrainDropExtension(path) !== "")) {
		return selection;
	}

	// Folders (paths without extension) are expanded once per selection.
	const key = selection.join("\n");
	if (terrainDragPrediction?.key === key) {
		return terrainDragPrediction.pending ? null : terrainDragPrediction.paths;
	}

	const prediction: { key: string; paths: string[] | null; pending: boolean } = { key, paths: null, pending: true };
	terrainDragPrediction = prediction;

	expandTerrainDroppedPaths(selection)
		.then((paths) => {
			prediction.paths = paths;
		})
		.catch(() => {
			prediction.paths = null;
		})
		.finally(() => {
			prediction.pending = false;
		});

	return null;
}

function isTerrainFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function clampTerrainValue(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Selects a brush of the library (§1.8): brush id of the settings and, when "Apply brush defaults" is on, the defaults stored with the brush
 * (radius, strength of the active tool, hardness, rotation, spacing, stamp height). External settings change (the fields re-key).
 * @param brush defines the brush to select.
 */
export function selectTerrainBrush(brush: ITerrainLibraryBrush): void {
	updateTerrainSettings(
		(settings) => {
			settings.brush.brushId = brush.id;

			const defaults = settings.brush.applyBrushDefaults ? brush.defaults : null;
			if (!defaults) {
				return;
			}

			if (isTerrainFiniteNumber(defaults.radius) && defaults.radius > 0) {
				settings.brush.radius = defaults.radius;
			}

			if (isTerrainFiniteNumber(defaults.strength)) {
				const tool = getActiveTerrainTool(settings) ?? settings.sculptTool;
				settings.strength[tool] = clampTerrainValue(defaults.strength, 0, 1);
			}

			if (isTerrainFiniteNumber(defaults.hardness)) {
				settings.brush.hardness = clampTerrainValue(defaults.hardness, 0, 0.95);
			}

			if (isTerrainFiniteNumber(defaults.rotation)) {
				settings.brush.rotation = clampTerrainValue(defaults.rotation, -180, 180);
			}

			if (isTerrainFiniteNumber(defaults.spacing)) {
				settings.brush.spacing = clampTerrainValue(defaults.spacing, 0.02, 2);
			}

			if (isTerrainFiniteNumber(defaults.stampHeight)) {
				settings.sculpt.stamp.heightWorld = defaults.stampHeight;
			}
		},
		["brush", "brush.brushId", "strength", "sculpt.stamp"]
	);
}

/**
 * Adds image files to the brush library (§1.9: drops and the import dialog) and reports the result: `toast.success("{n} brush(es) added")`,
 * `toast.info("“{name}” is already in the library.")` for duplicates, errors for rejected files (EXR: toast.brush-exr). The last added brush
 * (else the first duplicate) becomes selected.
 * @param absolutePaths defines the image files (absolute paths; folders already expanded).
 * @returns the selected brush, null when nothing was added or matched.
 */
export async function addTerrainBrushFiles(absolutePaths: string[]): Promise<ITerrainLibraryBrush | null> {
	const library = TerrainBrushLibrary.Get();
	const result = await library.addFiles(absolutePaths);

	if (result.added.length > 0) {
		toast.success(`${result.added.length} brush(es) added`);
	}

	for (const duplicate of result.duplicates) {
		toast.info(`“${duplicate.name}” is already in the library.`);
	}

	let exrReported = false;
	for (const rejected of result.rejected) {
		if (getTerrainDropExtension(rejected.path) === ".exr") {
			if (!exrReported) {
				exrReported = true;
				toast.error(TERRAIN_BRUSH_EXR_MESSAGE);
			}
			continue;
		}

		toast.error(rejected.reason || `Can't read ${getTerrainFileName(rejected.path)}`);
	}

	const selected = result.added[result.added.length - 1] ?? result.duplicates[0] ?? null;
	if (selected) {
		selectTerrainBrush(selected);
	}

	return selected;
}

/**
 * Copies the files that are outside `<project>/assets` into `assets/terrain-textures/` (importTerrainSourceFiles) and maps every input path to
 * its project-relative path (null when rejected). One call per file keeps an exact mapping.
 */
async function importTerrainDropSources(absolutePaths: readonly string[]): Promise<{ map: Map<string, string | null>; rejected: { path: string; reason: string }[] }> {
	const map = new Map<string, string | null>();
	const rejected: { path: string; reason: string }[] = [];

	for (const path of absolutePaths) {
		if (map.has(path)) {
			continue;
		}

		const result = await importTerrainSourceFiles([path]);
		map.set(path, result.imported[0] ?? null);
		rejected.push(...result.rejected);
	}

	return { map, rejected };
}

function reportTerrainRejectedFiles(rejected: readonly { path: string; reason: string }[]): void {
	for (const entry of rejected) {
		toast.error(`Can't use ${getTerrainFileName(entry.path)}: ${entry.reason}`);
	}
}

/** Layer data patch of detected maps; paths mapped to project-relative paths (unmapped paths are dropped). */
function createTerrainLayerPatchFromMaps(maps: Partial<ITerrainDetectedLayerMaps>, map: ReadonlyMap<string, string | null>): Partial<Omit<ITerrainLayerData, "id">> {
	const patch: Partial<Omit<ITerrainLayerData, "id">> = {};
	const resolve = (path: string | null | undefined): string | null => (path ? (map.get(path) ?? null) : null);

	const albedo = resolve(maps.albedo);
	if (albedo) {
		patch.albedo = albedo;
	}

	const normal = resolve(maps.normal);
	if (normal) {
		patch.normal = normal;
		if (maps.normalConvention) {
			patch.normalConvention = maps.normalConvention;
		}
	}

	const roughness = resolve(maps.roughnessMap);
	if (roughness) {
		patch.roughnessMap = roughness;
		if (maps.roughnessChannel) {
			patch.roughnessChannel = maps.roughnessChannel;
		}
		if (maps.roughnessInvert !== undefined) {
			patch.roughnessInvert = maps.roughnessInvert;
		}
	}

	const ao = resolve(maps.aoMap);
	if (ao) {
		patch.aoMap = ao;
		if (maps.aoChannel) {
			patch.aoChannel = maps.aoChannel;
		}
	}

	const height = resolve(maps.heightMap);
	if (height) {
		patch.heightMap = height;
		if (maps.heightChannel) {
			patch.heightChannel = maps.heightChannel;
		}
	}

	return patch;
}

function collectTerrainMapPaths(maps: Partial<ITerrainDetectedLayerMaps>): string[] {
	return [maps.albedo, maps.normal, maps.roughnessMap, maps.aoMap, maps.heightMap].filter((path): path is string => !!path);
}

function getTerrainDropLayerCount(mesh: Mesh): number {
	try {
		return getTerrainMeshInfo(mesh).layers.length;
	} catch {
		return 0;
	}
}

function selectTerrainDropLayer(mesh: Mesh, layerId: string | undefined): void {
	if (!layerId || !mesh.material) {
		return;
	}

	try {
		setActiveTerrainLayerId(mesh.material, layerId);
	} catch (e) {
		console.error(e);
	}
}

async function addTerrainDroppedLayers(editor: Editor, mesh: Mesh, groups: readonly ITerrainDetectedLayerMaps[]): Promise<boolean> {
	const available = Math.max(0, TERRAIN_MAX_LAYERS - getTerrainDropLayerCount(mesh));
	if (available === 0) {
		toast.warning("8 layers maximum (2 weight maps)");
		return false;
	}

	const kept = groups.slice(0, available);
	const { map, rejected } = await importTerrainDropSources(kept.flatMap((group) => collectTerrainMapPaths(group)));
	reportTerrainRejectedFiles(rejected);

	const layers: Partial<ITerrainLayerData>[] = [];
	for (const group of kept) {
		const patch = createTerrainLayerPatchFromMaps(group, map);
		if (Object.keys(patch).length > 0) {
			layers.push({ name: group.name, ...patch });
		}
	}

	if (!layers.length) {
		return false;
	}

	// addTerrainMaterialLayers caps at 8 layers too (enabling texture painting first may add layer 1): it returns the ids actually added.
	const ids = await addTerrainMaterialLayers(editor, mesh, layers);
	selectTerrainDropLayer(mesh, ids[0]);

	if (ids.length < groups.length) {
		toast.warning(`Only ${ids.length} layers were added (8 max)`);
	}

	return ids.length > 0;
}

async function applyTerrainDroppedMaterial(editor: Editor, mesh: Mesh, path: string, layerId: string | null): Promise<boolean> {
	const info = getTerrainMeshInfo(mesh);
	const layer = createTerrainLayerFromMaterialData(await readJSON(path), { width: info.width, height: info.height });

	if (!layer) {
		toast.warning(`“${getTerrainFileBaseName(path)}” is not a PBR or Standard material.`);
		return false;
	}

	if (layerId === null) {
		if (info.layers.length >= TERRAIN_MAX_LAYERS) {
			toast.warning("8 layers maximum (2 weight maps)");
			return false;
		}

		const ids = await addTerrainMaterialLayers(editor, mesh, [{ ...layer, name: layer.name || getTerrainFileBaseName(path) }]);
		selectTerrainDropLayer(mesh, ids[0]);
		return ids.length > 0;
	}

	// A material dropped on a row replaces that layer's maps (§1.10): the name and the other settings of the layer are kept.
	const patch: Partial<Omit<ITerrainLayerData, "id">> = {
		albedo: layer.albedo ?? null,
		normal: layer.normal ?? null,
		roughnessMap: layer.roughnessMap ?? null,
		aoMap: layer.aoMap ?? null,
		heightMap: layer.heightMap ?? null,
	};

	for (const key of ["normalConvention", "roughnessChannel", "roughnessInvert", "aoChannel", "heightChannel"] as const) {
		if (layer[key] !== undefined) {
			(patch as any)[key] = layer[key];
		}
	}

	updateTerrainMaterialLayer(mesh, layerId, patch, { undo: true });
	return true;
}

async function assignTerrainDroppedMaps(mesh: Mesh, layerId: string, maps: Partial<ITerrainDetectedLayerMaps>): Promise<boolean> {
	const { map, rejected } = await importTerrainDropSources(collectTerrainMapPaths(maps));
	reportTerrainRejectedFiles(rejected);

	const patch = createTerrainLayerPatchFromMaps(maps, map);
	if (!Object.keys(patch).length) {
		return false;
	}

	updateTerrainMaterialLayer(mesh, layerId, patch, { undo: true });
	return true;
}

async function setTerrainDroppedMask(editor: Editor, mesh: Mesh, layerId: string, path: string): Promise<boolean> {
	const { map, rejected } = await importTerrainDropSources([path]);
	reportTerrainRejectedFiles(rejected);

	const relativePath = map.get(path);
	const projectDirectory = getProjectDirectory();
	if (!relativePath || !projectDirectory) {
		return false;
	}

	await importTerrainLayerMask(editor, mesh, layerId, join(projectDirectory, relativePath));
	return true;
}

export interface ITerrainDropExecuteOptions {
	/** Every dropped file (folders expanded): the files the action doesn't read are reported with toast.drop-nothing. */
	paths?: readonly string[];
	/** Zone of the drop: EXR files dropped on brush zones are reported with toast.brush-exr. */
	zone?: TerrainDropZone;
}

function reportTerrainUnusedDropFiles(action: TerrainDropAction, options: ITerrainDropExecuteOptions | undefined): void {
	const unused = getTerrainDropUnusedPaths(action, options?.paths ?? []);
	if (!unused.length) {
		return;
	}

	const brushes = action.type === "add-brushes" || options?.zone === "brush-section";
	const exrs = brushes ? unused.filter((path) => getTerrainDropExtension(path) === ".exr") : [];
	const others = unused.filter((path) => !exrs.includes(path));

	if (exrs.length) {
		toast.error(TERRAIN_BRUSH_EXR_MESSAGE);
	}

	if (others.length) {
		toast.warning(`These files can't be used here: ${formatTerrainFileNames(others)}`, action.type === "none" ? { description: action.reason } : undefined);
	}
}

/**
 * Runs a routed drop action (§4.19) for the drop zones of the tab: brushes go to the library (OS files copied by the
 * library), layer sources and masks outside the project are copied first (importTerrainSourceFiles), splat maps are read in place by
 * their dialog. Unusable files are reported with toast.drop-nothing; layers beyond 8 are truncated with a warning.
 * Errors are reported (reportTerrainTabError), never thrown.
 * @param editor defines the editor reference.
 * @param mesh defines the target terrain (null: only brushes can be added).
 * @param action defines the routed action.
 * @param options defines the dropped files (to report the unused ones) and the zone.
 * @returns true when the action ran.
 */
export async function executeTerrainDropAction(editor: Editor, mesh: Mesh | null, action: TerrainDropAction, options?: ITerrainDropExecuteOptions): Promise<boolean> {
	reportTerrainUnusedDropFiles(action, options);

	try {
		switch (action.type) {
			case "none":
				return false;

			case "add-brushes":
				return (await addTerrainBrushFiles(action.paths)) !== null;
		}

		if (!mesh) {
			toast.warning("Create a terrain first.");
			return false;
		}

		assertTerrainTabNotBusy();

		switch (action.type) {
			case "add-layers":
				return await addTerrainDroppedLayers(editor, mesh, action.groups);

			case "layer-from-material":
				return await applyTerrainDroppedMaterial(editor, mesh, action.path, action.layerId);

			case "assign-maps":
				return await assignTerrainDroppedMaps(mesh, action.layerId, action.maps);

			case "layer-mask":
				return await setTerrainDroppedMask(editor, mesh, action.layerId, action.path);

			case "import-splat":
				return await openTerrainSplatImport(editor, mesh, action.paths);
		}
	} catch (e) {
		reportTerrainTabError(editor, e);
	}

	return false;
}
