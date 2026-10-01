import { dirname, join } from "path/posix";
import { readJSON } from "fs-extra";

import { MeshBuilder, PhysicsShapeType, Vector3, type AbstractMesh, type Mesh, type Scene } from "babylonjs";

import { toast } from "sonner";

import type { Editor } from "../../../editor/main";
import { projectConfiguration } from "../../../project/configuration";
import { normalizedGlob } from "../../fs";
import { updateIblShadowsRenderPipeline } from "../../light/ibl";
import { updateAllLights } from "../../light/shadows";
import { getCollisionMeshFor } from "../../mesh/collision";
import { parsePhysicsAggregate, serializePhysicsAggregate } from "../../physics/serialization/aggregate";

import { createTerrainSnapshotPayload } from "../core/journal";
import { isTerrainRectEmpty } from "../core/rect";
import type { ITerrainGrid, TerrainRectsByKind } from "../core/types";

import { getTerrainSharedGeometryMeshes, getTerrainSharedMaterialMeshes } from "./eligibility";
import { notifyTerrainChanged } from "./events";
import { getTerrainUndoStore } from "./history";
import { assertTerrainMutationAllowed } from "./material";
import { getTerrainHeightView } from "./registry";
import { sampleTerrainSurface } from "./sampling";
import type { ITerrainDependentsStatus, TerrainChangeKind } from "./types";
import { TerrainWorkSlicer } from "./yield";

/** Delay of the shadow maps refresh (updateAllLights) after a heights/holes change (§6.13). */
export const TERRAIN_SHADOWS_REFRESH_DELAY_MS = 300;
/** Delay of the IBL shadows refresh after a heights/holes change (§6.13). */
export const TERRAIN_IBL_SHADOWS_REFRESH_DELAY_MS = 1000;
/** Delay of the automatic decal re-projection after the last heights change (§6.13). */
export const TERRAIN_DECALS_REPROJECT_DELAY_MS = 500;
/** Decals are re-projected automatically only on terrains up to this resolution (§6.13, R20). */
export const TERRAIN_DECALS_AUTO_REPROJECT_MAX_SUBDIVISIONS = 256;
/** Only decals whose stored normal is mostly vertical (|normal.y| >= 0.5) follow the surface height when re-projected (§6.13). */
export const TERRAIN_DECAL_VERTICAL_NORMAL_Y = 0.5;

/** Serialized physics aggregate (tools/physics/serialization/aggregate.ts). */
export type TerrainPhysicsAggregateData = ReturnType<typeof serializePhysicsAggregate>;

/** World XZ rectangle. */
interface ITerrainWorldArea {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
}

interface ITerrainSceneRefresh {
	lights: ReturnType<typeof setTimeout> | null;
	ibl: ReturnType<typeof setTimeout> | null;
}

/** Decals whose geometry doesn't follow the current heights anymore. */
const staleDecals = new WeakSet<AbstractMesh>();
/** Terrains whose collision proxy was built from older heights/holes. */
const staleCollisionProxies = new WeakSet<Mesh>();
/** Debounced shadow refreshes per scene (entries live until the scene is disposed). */
const sceneRefreshes = new Map<Scene, ITerrainSceneRefresh>();
/** Debounced automatic decal re-projections per terrain. */
const decalReprojections = new Map<Mesh, ReturnType<typeof setTimeout>>();

// Change tracking

/**
 * Records a change of the relief of a terrain (§6.13). The engine calls it after each finalize whose kinds include heights, holes or grid
 * (stroke end, undo/redo, operations; resizes call it themselves), with the changed rects when it has them:
 * - decals of the terrain whose world bounding box intersects the changed area (the whole terrain without rects) become stale;
 * - the collision proxy becomes stale;
 * - shadow maps are refreshed after 300 ms (updateAllLights) and IBL shadows after 1 s (debounced per scene);
 * - stale decals are re-projected after 500 ms (debounced per terrain) when the automatic re-projection is enabled and S <= 256.
 * Never throws (errors are logged).
 * @param mesh defines the terrain.
 * @param kinds defines the kinds of the change (ignored unless heights, holes or grid).
 * @param changed defines the changed rects (vertex rect for heights, quad rect for holes); omitted = the whole terrain.
 */
export function markTerrainDependentsChanged(mesh: Mesh, kinds: readonly TerrainChangeKind[], changed?: TerrainRectsByKind | null): void {
	if (!kinds.some((kind) => kind === "heights" || kind === "holes" || kind === "grid")) {
		return;
	}

	try {
		if (mesh.isDisposed()) {
			return;
		}

		const grid = getTerrainHeightView(mesh)?.grid ?? null;
		const area = grid && changed && !kinds.includes("grid") ? getTerrainChangedWorldArea(mesh, grid, changed) : null;

		for (const decal of getTerrainDecals(mesh)) {
			if (!area || intersectsTerrainWorldAreas(getTerrainMeshWorldArea(decal), area)) {
				staleDecals.add(decal);
			}
		}

		if (getCollisionMeshFor(mesh)) {
			staleCollisionProxies.add(mesh);
		}

		scheduleTerrainSceneRefresh(mesh.getScene());

		if (grid && grid.subdivisions <= TERRAIN_DECALS_AUTO_REPROJECT_MAX_SUBDIVISIONS && getTerrainStaleDecalCount(mesh) > 0) {
			scheduleTerrainDecalsReprojection(mesh);
		}
	} catch (e) {
		reportDependentsError(e);
	}
}

/**
 * Cancels the pending debounced updates (shadows, IBL shadows, decal re-projections) of a scene, or of every scene.
 * @param scene defines the scene whose updates are cancelled (all scenes when omitted).
 */
export function cancelTerrainDependentsUpdates(scene?: Scene): void {
	for (const [key, refresh] of Array.from(sceneRefreshes.entries())) {
		if (scene && key !== scene) {
			continue;
		}

		clearTerrainTimer(refresh.lights);
		clearTerrainTimer(refresh.ibl);
		refresh.lights = null;
		refresh.ibl = null;
	}

	for (const [mesh, timer] of Array.from(decalReprojections.entries())) {
		if (scene && getMeshScene(mesh) !== scene) {
			continue;
		}

		clearTerrainTimer(timer);
		decalReprojections.delete(mesh);
	}
}

// Decals

/**
 * Editable decals of the terrain: meshes of the scene whose metadata.decal.meshId is the terrain's id (merged decals excluded).
 * @param mesh defines the terrain.
 */
export function getTerrainDecals(mesh: Mesh): Mesh[] {
	return mesh.getScene().meshes.filter((decal) => decal !== mesh && !decal.isDisposed() && decal.metadata?.decal?.meshId === mesh.id && !isTerrainMergedDecal(decal)) as Mesh[];
}

/**
 * Decals merged at save (saveMergedDecals: metadata.decal without configuration and metadata.mergedMeshesIds) that belong to the terrain:
 * they merge decals of the terrain, or lie over it. They can't be re-projected.
 * @param mesh defines the terrain.
 */
export function getTerrainMergedDecals(mesh: Mesh): AbstractMesh[] {
	const decalIds = new Set(getTerrainDecals(mesh).map((decal) => decal.id));
	const terrainArea = getTerrainMeshWorldArea(mesh);

	return mesh.getScene().meshes.filter((decal) => {
		if (decal === mesh || decal.isDisposed() || !isTerrainMergedDecal(decal)) {
			return false;
		}

		const ids: unknown[] = decal.metadata.mergedMeshesIds;
		return ids.some((id) => typeof id === "string" && decalIds.has(id)) || intersectsTerrainWorldAreas(getTerrainMeshWorldArea(decal), terrainArea);
	});
}

/**
 * Returns true when the decal was not re-projected since the terrain relief under it changed.
 * @param decal defines the decal mesh.
 */
export function isTerrainDecalStale(decal: AbstractMesh): boolean {
	return staleDecals.has(decal);
}

/**
 * Number of stale decals of the terrain (ITerrainStrokeResult.staleDecals).
 * @param mesh defines the terrain.
 */
export function getTerrainStaleDecalCount(mesh: Mesh): number {
	return getTerrainDecals(mesh).filter((decal) => staleDecals.has(decal)).length;
}

/**
 * Re-projects the decals of the terrain (only the stale ones with onlyStale), in slices (yieldTerrainWork).
 * Decals whose stored normal has |normal.y| >= 0.5 get their position.y and normal re-sampled on the surface first; the geometry is then
 * rebuilt like MeshDecalInspector does. Not undoable (undo changes the heights, which re-projects again). Toasts
 * toast.decals-reprojected unless silent. Returns the number of re-projected decals.
 * @param mesh defines the terrain.
 * @param options defines whether only stale decals are re-projected and whether the toast is skipped (automatic re-projection).
 */
export async function reprojectTerrainDecals(mesh: Mesh, options: { onlyStale?: boolean; silent?: boolean } = {}): Promise<number> {
	const decals = getTerrainDecals(mesh).filter((decal) => !options.onlyStale || staleDecals.has(decal));
	const slicer = new TerrainWorkSlicer();

	let count = 0;
	for (const decal of decals) {
		if (mesh.isDisposed()) {
			break;
		}

		if (decal.isDisposed()) {
			continue;
		}

		try {
			if (reprojectTerrainDecal(mesh, decal)) {
				staleDecals.delete(decal);
				++count;
			}
		} catch (e) {
			reportDependentsError(e);
		}

		await slicer.maybeYield();
	}

	if (!options.silent && count > 0) {
		toast.success(`${count} decal(s) re-projected`);
	}

	return count;
}

/**
 * Re-projects one decal on the terrain (§6.13): for a mostly vertical stored normal (|y| >= 0.5), position.y and the normal of the decal
 * configuration are re-sampled with the terrain surface under position.x/z; then the geometry is rebuilt exactly like
 * MeshDecalInspector._handleUpdateCurrentDecalMesh (CreateDecal in local mode, geometry applied to the decal, temporary decal disposed).
 * The previous geometry of the decal is disposed when nothing uses it anymore. Returns false when the decal has no configuration.
 * @param terrain defines the terrain.
 * @param decal defines the decal mesh (metadata.decal = { meshId, position, normal, angle, sizeX, sizeY, sizeZ }).
 */
export function reprojectTerrainDecal(terrain: Mesh, decal: Mesh): boolean {
	const configuration = decal.metadata?.decal;
	if (!configuration || !isVector3Array(configuration.position)) {
		return false;
	}

	const position = Vector3.FromArray(configuration.position);
	let normal = isVector3Array(configuration.normal) ? Vector3.FromArray(configuration.normal) : null;

	if (normal && Math.abs(normal.y) >= TERRAIN_DECAL_VERTICAL_NORMAL_Y) {
		const sample = sampleTerrainSurface(terrain, position.x, position.z);
		if (sample) {
			position.y = sample.heightWorld;
			normal = sample.normalWorld.clone();

			configuration.position = position.asArray();
			configuration.normal = normal.asArray();
		}
	}

	const temporary = MeshBuilder.CreateDecal("decal", terrain, {
		localMode: true,
		angle: typeof configuration.angle === "number" ? configuration.angle : 0,
		size: new Vector3(getDecalSize(configuration.sizeX), getDecalSize(configuration.sizeY), getDecalSize(configuration.sizeZ)),
		position,
		normal: normal ?? undefined,
	});

	const previousGeometry = decal.geometry;
	previousGeometry?.releaseForMesh(decal);

	temporary.geometry?.applyToMesh(decal);
	temporary.dispose(false, false);

	if (previousGeometry && previousGeometry !== decal.geometry && previousGeometry.meshes.length === 0) {
		previousGeometry.dispose();
	}

	decal.refreshBoundingInfo();

	return true;
}

// Physics

/**
 * Physics state of the terrain: no aggregate, MESH shape, BOX shape or another shape.
 * @param mesh defines the terrain.
 */
export function getTerrainPhysicsStatus(mesh: AbstractMesh): ITerrainDependentsStatus["physics"] {
	const aggregate = mesh.physicsAggregate;
	if (!aggregate) {
		return "none";
	}

	try {
		const type = aggregate.shape.type;
		if (type === PhysicsShapeType.MESH) {
			return "mesh";
		}

		return type === PhysicsShapeType.BOX ? "box" : "other";
	} catch (e) {
		return "other";
	}
}

/**
 * Serialized physics aggregate of the mesh (null without aggregate), for undo payloads.
 * @param mesh defines the mesh.
 */
export function captureTerrainPhysicsAggregate(mesh: AbstractMesh): TerrainPhysicsAggregateData | null {
	return mesh.physicsAggregate ? serializePhysicsAggregate(mesh.physicsAggregate) : null;
}

/**
 * Replaces the physics aggregate of the mesh: the current one is disposed and a new one is parsed from `data` (none when null).
 * @param mesh defines the mesh.
 * @param data defines the serialized aggregate to create.
 */
export function replaceTerrainPhysicsAggregate(mesh: Mesh, data: TerrainPhysicsAggregateData | null): void {
	mesh.physicsAggregate?.dispose();
	mesh.physicsAggregate = data ? parsePhysicsAggregate(mesh, data) : null;
}

/**
 * Rebuilds the physics aggregate of the mesh with a MESH shape (every other setting kept); no-op without aggregate or with a MESH shape.
 * Returns true when it changed.
 * @param mesh defines the mesh.
 */
export function rebuildTerrainPhysicsAsMesh(mesh: Mesh): boolean {
	const data = captureTerrainPhysicsAggregate(mesh);
	if (!data || getTerrainPhysicsStatus(mesh) === "mesh") {
		return false;
	}

	replaceTerrainPhysicsAggregate(mesh, { ...data, shape: { ...data.shape, type: PhysicsShapeType.MESH } });
	return true;
}

/**
 * The aggregate is serialized, disposed and parsed back with a MESH shape; one undo
 * entry swapping the serialized aggregates. No-op without aggregate or when the shape is already MESH.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 */
export function setTerrainPhysicsShapeToMesh(editor: Editor, mesh: Mesh): void {
	const before = captureTerrainPhysicsAggregate(mesh);
	if (!before || getTerrainPhysicsStatus(mesh) === "mesh") {
		return;
	}

	assertTerrainMutationAllowed(editor, mesh, { skipEligibility: true });

	rebuildTerrainPhysicsAsMesh(mesh);

	const payload = createTerrainSnapshotPayload<TerrainPhysicsAggregateData | null>({
		state: before,
		byteLength: 0,
		signature: "",
		exchange: (state) => {
			const previous = captureTerrainPhysicsAggregate(mesh);
			replaceTerrainPhysicsAggregate(mesh, state);
			return { previous, changed: {} };
		},
	});

	getTerrainUndoStore().register(mesh, payload, "Use mesh physics shape", { snapshot: true, kinds: ["node"] });
	notifyTerrainChanged(mesh, ["node"], "settings");
}

// Navmeshes, collision proxy

/**
 * Project-relative paths of the .navmesh folders (assets/**\/*.navmesh/config.json) whose staticMeshes contain { id: terrain.id, enabled: true }:
 * they must be rebaked in the Navigation editor (nothing is rebuilt automatically, §6.13). Read-only discovery.
 * @param mesh defines the terrain.
 */
export async function findTerrainNavmeshes(mesh: Mesh): Promise<string[]> {
	const projectPath = projectConfiguration.path;
	if (!projectPath) {
		return [];
	}

	const projectDirectory = dirname(projectPath.replace(/\\/g, "/"));

	let files: string[];
	try {
		files = await normalizedGlob(join(projectDirectory, "assets/**/*.navmesh/config.json"), { nodir: true });
	} catch (e) {
		reportDependentsError(e);
		return [];
	}

	const result: string[] = [];

	for (const file of files) {
		try {
			const configuration = await readJSON(file);
			const staticMeshes: unknown = configuration?.staticMeshes;
			if (Array.isArray(staticMeshes) && staticMeshes.some((item) => item?.id === mesh.id && item?.enabled === true)) {
				result.push(dirname(file).replace(join(projectDirectory, "/"), ""));
			}
		} catch (e) {
			// Unreadable configuration: not listed.
		}
	}

	return result.sort();
}

/**
 * State of the collision proxy of the terrain (getCollisionMeshFor): none, up to date, or stale since a heights/holes change.
 * @param mesh defines the terrain.
 */
export function getTerrainCollisionProxyStatus(mesh: Mesh): ITerrainDependentsStatus["collisionProxy"] {
	if (!getCollisionMeshFor(mesh)) {
		return "none";
	}

	return staleCollisionProxies.has(mesh) ? "stale" : "up-to-date";
}

/**
 * Returns the dependents of the terrain: physics body, decals, navmeshes, LODs, collision proxy and the meshes sharing its data.
 * @param mesh defines the terrain.
 */
export async function getTerrainDependents(mesh: Mesh): Promise<ITerrainDependentsStatus> {
	const physics = getTerrainPhysicsStatus(mesh);
	const decals = getTerrainDecals(mesh);

	return {
		physics,
		physicsTriangles: physics === "mesh" ? Math.floor(mesh.getTotalIndices() / 3) : 0,
		decals: {
			total: decals.length,
			stale: decals.filter((decal) => staleDecals.has(decal)).length,
			merged: getTerrainMergedDecals(mesh).length,
		},
		navmeshes: await findTerrainNavmeshes(mesh),
		lods: mesh.getLODLevels().length,
		collisionProxy: getTerrainCollisionProxyStatus(mesh),
		sharedGeometry: getTerrainSharedGeometryMeshes(mesh).length,
		sharedMaterial: getTerrainSharedMaterialMeshes(mesh).length,
		instances: mesh.instances.length,
	};
}

// Internals

function scheduleTerrainSceneRefresh(scene: Scene): void {
	let refresh = sceneRefreshes.get(scene);
	if (!refresh) {
		const created: ITerrainSceneRefresh = { lights: null, ibl: null };
		sceneRefreshes.set(scene, created);
		scene.onDisposeObservable.addOnce(() => {
			try {
				cancelTerrainDependentsUpdates(scene);
				sceneRefreshes.delete(scene);
			} catch (e) {
				reportDependentsError(e);
			}
		});

		refresh = created;
	}

	const entry = refresh;

	clearTerrainTimer(entry.lights);
	entry.lights = setTimeout(() => {
		entry.lights = null;
		runTerrainSceneRefresh(scene, () => updateAllLights(scene));
	}, TERRAIN_SHADOWS_REFRESH_DELAY_MS);

	clearTerrainTimer(entry.ibl);
	entry.ibl = setTimeout(() => {
		entry.ibl = null;
		// No-op when IBL shadows are disabled (no pipeline).
		runTerrainSceneRefresh(scene, () => updateIblShadowsRenderPipeline(scene, true));
	}, TERRAIN_IBL_SHADOWS_REFRESH_DELAY_MS);
}

function runTerrainSceneRefresh(scene: Scene, refresh: () => void): void {
	if (scene.isDisposed) {
		return;
	}

	try {
		refresh();
	} catch (e) {
		reportDependentsError(e);
	}
}

function scheduleTerrainDecalsReprojection(mesh: Mesh): void {
	clearTerrainTimer(decalReprojections.get(mesh) ?? null);

	decalReprojections.set(
		mesh,
		setTimeout(() => {
			decalReprojections.delete(mesh);
			if (mesh.isDisposed()) {
				return;
			}

			reprojectTerrainDecals(mesh, { onlyStale: true, silent: true }).catch((e) => reportDependentsError(e));
		}, TERRAIN_DECALS_REPROJECT_DELAY_MS)
	);
}

/** World XZ area of changed heights (vertex rect expanded by one cell: normals change around it) and holes (quad rect). Null when empty. */
function getTerrainChangedWorldArea(mesh: Mesh, grid: ITerrainGrid, changed: TerrainRectsByKind): ITerrainWorldArea | null {
	let minCol = Infinity;
	let maxCol = -Infinity;
	let minRow = Infinity;
	let maxRow = -Infinity;

	const heights = changed.heights;
	if (heights && !isTerrainRectEmpty(heights)) {
		minCol = Math.min(minCol, heights.x0 - 1);
		maxCol = Math.max(maxCol, heights.x1 + 1);
		minRow = Math.min(minRow, heights.y0 - 1);
		maxRow = Math.max(maxRow, heights.y1 + 1);
	}

	const holes = changed.holes;
	if (holes && !isTerrainRectEmpty(holes)) {
		minCol = Math.min(minCol, holes.x0);
		maxCol = Math.max(maxCol, holes.x1 + 1);
		minRow = Math.min(minRow, holes.y0);
		maxRow = Math.max(maxRow, holes.y1 + 1);
	}

	if (minCol > maxCol || minRow > maxRow) {
		return null;
	}

	const s = grid.subdivisions;
	const x0 = grid.localX(Math.max(0, Math.min(s, minCol)));
	const x1 = grid.localX(Math.max(0, Math.min(s, maxCol)));
	// Rows grow towards -Z.
	const z0 = grid.localZ(Math.max(0, Math.min(s, maxRow)));
	const z1 = grid.localZ(Math.max(0, Math.min(s, minRow)));

	const range = getTerrainHeightView(mesh)?.heightRange;
	const y0 = Number.isFinite(range?.min) ? range!.min : 0;
	const y1 = Number.isFinite(range?.max) ? range!.max : 0;

	const world = mesh.computeWorldMatrix(true);
	const area: ITerrainWorldArea = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
	const corner = new Vector3();

	for (const x of [x0, x1]) {
		for (const y of [y0, y1]) {
			for (const z of [z0, z1]) {
				Vector3.TransformCoordinatesFromFloatsToRef(x, y, z, world, corner);
				area.minX = Math.min(area.minX, corner.x);
				area.maxX = Math.max(area.maxX, corner.x);
				area.minZ = Math.min(area.minZ, corner.z);
				area.maxZ = Math.max(area.maxZ, corner.z);
			}
		}
	}

	return area;
}

function getTerrainMeshWorldArea(mesh: AbstractMesh): ITerrainWorldArea {
	mesh.computeWorldMatrix(true);

	const box = mesh.getBoundingInfo().boundingBox;
	return {
		minX: box.minimumWorld.x,
		maxX: box.maximumWorld.x,
		minZ: box.minimumWorld.z,
		maxZ: box.maximumWorld.z,
	};
}

function intersectsTerrainWorldAreas(a: ITerrainWorldArea, b: ITerrainWorldArea): boolean {
	return a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

function isTerrainMergedDecal(mesh: AbstractMesh): boolean {
	return !!mesh.metadata?.decal && Array.isArray(mesh.metadata.mergedMeshesIds);
}

function isVector3Array(value: unknown): value is number[] {
	return Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every((component) => typeof component === "number" && Number.isFinite(component));
}

function getDecalSize(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 1;
}

function getMeshScene(mesh: Mesh): Scene | null {
	try {
		return mesh.getScene();
	} catch (e) {
		return null;
	}
}

function clearTerrainTimer(timer: ReturnType<typeof setTimeout> | null): void {
	if (timer !== null) {
		clearTimeout(timer);
	}
}

function reportDependentsError(error: unknown): void {
	console.error(`[Terrain] ${error instanceof Error ? error.message : String(error)}`);
}
