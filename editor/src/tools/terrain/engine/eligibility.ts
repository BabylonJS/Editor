import { AbstractMesh, PhysicsShapeType, VertexBuffer, type Geometry, type Mesh, type Node, type Scene } from "babylonjs";
import { getTerrainMaterialPlugin, TERRAIN_DATA_VERSION, TERRAIN_MAX_SUBDIVISIONS, TERRAIN_MIN_SUBDIVISIONS } from "babylonjs-editor-tools";

import { isFromSceneLink } from "../../scene/scene-link";
import { getCollisionMeshFor } from "../../mesh/collision";
import { isAbstractMesh, isCollisionInstancedMesh, isCollisionMesh, isInstancedMesh, isTerrainMesh } from "../../guards/nodes";

import { TerrainGrid } from "../core/grid";

import { getTerrainRememberedMaterial } from "./material";
import { getTerrainMetricFromMatrix, isTerrainMatrixTilted, isTerrainMetricDegenerate } from "./transform";
import type { ITerrainListItem, TerrainEligibility, TerrainIneligibilityReason, TerrainWarning } from "./types";

interface ITerrainGridCacheEntry {
	geometry: Geometry | null;
	geometryUniqueId: number;
	positions: VertexBuffer | null;
	width: number | undefined;
	height: number | undefined;
	version: number;
	grid: TerrainGrid | null;
}

const gridCache = new WeakMap<AbstractMesh, ITerrainGridCacheEntry>();
const eligibilityCache = new WeakMap<object, TerrainEligibility>();
const terrainVersions = new WeakMap<AbstractMesh, number>();

/**
 * Returns the terrain version counter of the mesh (bumped by creations and resizes).
 * @param mesh defines the reference to the mesh.
 */
export function getTerrainVersion(mesh: AbstractMesh): number {
	return terrainVersions.get(mesh) ?? 0;
}

/**
 * Bumps the terrain version counter of the mesh: the cached grid inference and eligibility of the mesh are recomputed at the next call.
 * Called by creations, resizes and new geometry bindings (§6.1).
 * @param mesh defines the reference to the mesh.
 */
export function bumpTerrainVersion(mesh: AbstractMesh): void {
	terrainVersions.set(mesh, getTerrainVersion(mesh) + 1);
}

/**
 * Infers the square vertex grid of a terrain from its positions (TerrainGrid.FromPositions, O(V), §4.1) with the GroundMesh sizes of the
 * TerrainMesh as hints. Cached per mesh with the key (geometry, geometry uniqueId, position VertexBuffer identity, hint values, terrain
 * version): hover, picking and the inspector's renders never re-run the inference while the geometry is unchanged.
 * Returns null when the mesh has no positions or they are not a valid (S+1)² grid.
 * @param mesh defines the reference to the terrain mesh.
 */
export function inferTerrainGrid(mesh: AbstractMesh): TerrainGrid | null {
	const geometry = (mesh as Mesh).geometry ?? null;
	const positions = mesh.getVertexBuffer(VertexBuffer.PositionKind) ?? null;

	const width = isTerrainMesh(mesh) ? getPositiveNumber(mesh._width) : undefined;
	const height = isTerrainMesh(mesh) ? getPositiveNumber(mesh._height) : undefined;
	const version = getTerrainVersion(mesh);

	const cached = gridCache.get(mesh);
	if (
		cached &&
		cached.geometry === geometry &&
		cached.geometryUniqueId === (geometry?.uniqueId ?? -1) &&
		cached.positions === positions &&
		cached.width === width &&
		cached.height === height &&
		cached.version === version
	) {
		return cached.grid;
	}

	let grid: TerrainGrid | null = null;

	const data = geometry && positions ? mesh.getVerticesData(VertexBuffer.PositionKind) : null;
	if (data && data.length >= 3) {
		grid = TerrainGrid.FromPositions(data, Math.floor(data.length / 3), { width, height });
	}

	gridCache.set(mesh, {
		geometry,
		geometryUniqueId: geometry?.uniqueId ?? -1,
		positions,
		width,
		height,
		version,
		grid,
	});

	return grid;
}

/**
 * Other meshes (instances excluded: they share the geometry legitimately) using the geometry of the given mesh.
 * @param mesh defines the reference to the mesh.
 */
export function getTerrainSharedGeometryMeshes(mesh: AbstractMesh): Mesh[] {
	const geometry = (mesh as Mesh).geometry;
	if (!geometry) {
		return [];
	}

	return geometry.meshes.filter((m) => m !== mesh && !isInstancedMesh(m));
}

/**
 * Other meshes of scene.meshes bound to the material of the given mesh. Instances, LOD levels of the mesh and collision proxies are ignored
 * (they render with the mesh's material legitimately).
 * @param mesh defines the reference to the mesh.
 */
export function getTerrainSharedMaterialMeshes(mesh: AbstractMesh): AbstractMesh[] {
	const material = mesh.material;
	if (!material) {
		return [];
	}

	return mesh.getScene().meshes.filter((m) => m !== mesh && m.material === material && !isInstancedMesh(m) && !isCollisionMesh(m) && (m as Mesh)._masterMesh !== mesh);
}

/**
 * Eligibility of an object for the terrain tools (§1.3, D2): only terrains (class TerrainMesh, not an instance, collision proxy or LOD level,
 * unlocked, not from a scene link, no skeleton or morph targets, one sub-mesh, non-degenerate transform, valid (S+1)² grid with S >= 1).
 * Eligible results carry the warnings of the terrain (§1.5).
 *
 * Cheap in render(): the O(V) grid inference is cached (inferTerrainGrid) and, when nothing changed, the previously returned object is
 * returned again (stable identity).
 * @param object defines the edited object (any value).
 */
export function getTerrainEligibility(object: unknown): TerrainEligibility {
	const result = computeTerrainEligibility(object);

	if (object && typeof object === "object") {
		const cached = eligibilityCache.get(object);
		if (cached && isSameTerrainEligibility(cached, result)) {
			return cached;
		}

		eligibilityCache.set(object, result);
	}

	return result;
}

/**
 * Eligible terrains of the scene, in scene order.
 * @param scene defines the reference to the scene.
 */
export function listTerrainMeshes(scene: Scene): ITerrainListItem[] {
	const items: ITerrainListItem[] = [];

	for (const mesh of scene.meshes) {
		if (!isTerrainMesh(mesh)) {
			continue;
		}

		const eligibility = getTerrainEligibility(mesh);
		if (eligibility.eligible) {
			items.push({ mesh: eligibility.mesh, name: eligibility.mesh.name, subdivisions: eligibility.subdivisions });
		}
	}

	return items;
}

function computeTerrainEligibility(object: unknown): TerrainEligibility {
	if (!isMeshObject(object)) {
		return createIneligibility("not-a-mesh", `“${getObjectName(object)}” is not a mesh.`, null, null);
	}

	const mesh = object;

	if (isCollisionMesh(mesh) || isCollisionInstancedMesh(mesh)) {
		return createIneligibility("collision-proxy", "Collision meshes can't be sculpted.", mesh, null);
	}

	if (isInstancedMesh(mesh)) {
		const source = mesh.sourceMesh;
		if (isTerrainMesh(source)) {
			return createIneligibility("instance", `“${mesh.name}” is an instance of “${source.name}”. Sculpt the source terrain instead.`, mesh, source);
		}

		return createNotATerrainIneligibility(mesh);
	}

	const master = (mesh as Mesh)._masterMesh;
	if (master && isTerrainMesh(master)) {
		return createIneligibility("lod-child", `“${mesh.name}” is a LOD level of “${master.name}”.`, mesh, master);
	}

	if (!isTerrainMesh(mesh)) {
		return createNotATerrainIneligibility(mesh);
	}

	if (mesh.metadata?.isLocked) {
		return createIneligibility("locked", "This terrain is locked. Unlock it in the scene graph to edit it.", mesh, null);
	}

	if (isFromSceneLink(mesh)) {
		return createIneligibility("scene-link", "This terrain belongs to a linked scene. Open that scene to edit it.", mesh, null);
	}

	if (!mesh.geometry || !mesh.isVerticesDataPresent(VertexBuffer.PositionKind) || mesh.getTotalVertices() <= 0) {
		return createIneligibility("no-geometry", "This terrain has no geometry.", mesh, null);
	}

	if (mesh.skeleton || mesh.morphTargetManager) {
		return createIneligibility("skeleton-or-morph", "Terrains with bones or morph targets can't be sculpted.", mesh, null);
	}

	if ((mesh.subMeshes?.length ?? 0) > 1) {
		return createIneligibility("multiple-submeshes", "This terrain has several sub-meshes (optimized or multi-material) and can't be sculpted.", mesh, null);
	}

	const world = mesh.computeWorldMatrix(true).m;
	if (isTerrainMetricDegenerate(getTerrainMetricFromMatrix(world))) {
		return createIneligibility("degenerate-transform", `“${mesh.name}” is scaled to zero along an axis and can't be sculpted.`, mesh, mesh);
	}

	const grid = inferTerrainGrid(mesh);
	if (!grid) {
		return createIneligibility("invalid-grid", "The geometry of this terrain is no longer a regular grid.", mesh, mesh);
	}

	const warnings = computeTerrainWarnings(mesh, grid, isTerrainMatrixTilted(world));

	return {
		eligible: true,
		mesh,
		subdivisions: grid.subdivisions,
		readOnly: warnings.includes("newer-version") || warnings.includes("unsupported-resolution"),
		warnings,
	};
}

function computeTerrainWarnings(mesh: Mesh, grid: TerrainGrid, tilted: boolean): TerrainWarning[] {
	const warnings: TerrainWarning[] = [];
	const plugin = getTerrainMaterialPlugin(mesh.material as any);

	if (getTerrainSharedGeometryMeshes(mesh).length > 0) {
		warnings.push("shared-geometry");
	}

	if (plugin && getTerrainSharedMaterialMeshes(mesh).length > 0) {
		warnings.push("shared-material");
	}

	if (mesh.instances.length > 0) {
		warnings.push("has-instances");
	}

	if (mesh.getLODLevels().length > 0) {
		warnings.push("has-lods");
	}

	if (tilted) {
		warnings.push("tilted");
	}

	if (getCollisionMeshFor(mesh)) {
		warnings.push("collision-proxy");
	}

	if (hasNonMeshPhysicsShape(mesh)) {
		warnings.push("box-physics");
	}

	const dataVersion = plugin?.data.version;
	if (typeof dataVersion === "number" && dataVersion > TERRAIN_DATA_VERSION) {
		warnings.push("newer-version");
	}

	if (grid.subdivisions < TERRAIN_MIN_SUBDIVISIONS || grid.subdivisions > TERRAIN_MAX_SUBDIVISIONS) {
		warnings.push("unsupported-resolution");
	}

	if (!mesh.isEnabled() || !mesh.isVisible) {
		warnings.push("hidden");
	}

	if (!plugin) {
		warnings.push("no-terrain-material");
	}

	const remembered = getTerrainRememberedMaterial(mesh);
	if (remembered && remembered !== mesh.material) {
		warnings.push("material-unassigned");
	}

	if (plugin?.weightMapsState === "error") {
		warnings.push("weights-error");
	}

	if (plugin?.layerTexturesState === "error") {
		warnings.push("layers-error");
	}

	return warnings;
}

function hasNonMeshPhysicsShape(mesh: Mesh): boolean {
	const aggregate = mesh.physicsAggregate;
	if (!aggregate) {
		return false;
	}

	try {
		return aggregate.shape.type !== PhysicsShapeType.MESH;
	} catch {
		return false;
	}
}

function createNotATerrainIneligibility(mesh: AbstractMesh): TerrainEligibility {
	return createIneligibility("not-a-terrain", `Only terrains can be sculpted and painted. “${mesh.name}” is not a terrain: create one with New terrain.`, mesh, null);
}

function createIneligibility(reason: TerrainIneligibilityReason, message: string, mesh: AbstractMesh | null, fixTarget: Node | null): TerrainEligibility {
	return { eligible: false, reason, message, mesh, fixTarget };
}

function isSameTerrainEligibility(a: TerrainEligibility, b: TerrainEligibility): boolean {
	if (a.eligible && b.eligible) {
		return (
			a.mesh === b.mesh &&
			a.subdivisions === b.subdivisions &&
			a.readOnly === b.readOnly &&
			a.warnings.length === b.warnings.length &&
			a.warnings.every((warning, index) => warning === b.warnings[index])
		);
	}

	if (!a.eligible && !b.eligible) {
		return a.reason === b.reason && a.message === b.message && a.mesh === b.mesh && a.fixTarget === b.fixTarget;
	}

	return false;
}

function isMeshObject(object: unknown): object is AbstractMesh {
	if (!object || typeof object !== "object") {
		return false;
	}

	return isAbstractMesh(object) || isCollisionMesh(object) || object instanceof AbstractMesh;
}

function getObjectName(object: unknown): string {
	const name = (object as any)?.name;
	if (typeof name === "string" && name) {
		return name;
	}

	const className = (object as any)?.getClassName?.();
	if (typeof className === "string" && className) {
		return className;
	}

	return object === null || object === undefined ? "Nothing" : String(object);
}

function getPositiveNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
