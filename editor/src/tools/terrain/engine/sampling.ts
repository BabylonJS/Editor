import { Ray, Vector3, Mesh } from "babylonjs";
import { getTerrainMaterialPlugin } from "babylonjs-editor-tools";

import { isTerrainMesh } from "../../guards/nodes";

import { raycastTerrain } from "../core/raycast";
import { createTerrainFalloffLut } from "../core/falloff";
import { sampleTerrainTexelWeights } from "../core/weights";
import { evaluateTerrainBrushShape } from "../core/footprint";
import { sampleTerrainGradient, sampleTerrainHeight } from "../core/heightfield";
import { createTerrainFilterEvaluator, ITerrainFilterEvaluator } from "../core/filters";
import { ITerrainGrid, ITerrainStrokeRequest, ITerrainWeightMaps, TerrainFalloff } from "../core/types";

import { TerrainWeightsBinding } from "./weights-binding";
import { getTerrainHeightView, ITerrainHeightView } from "./registry";
import { ITerrainFootprint, ITerrainHeightPatch, ITerrainPick, ITerrainSurfaceSample } from "./types";
import { computeTerrainSlopeDegrees, createTerrainSurfaceSampler, TerrainTransform } from "./transform";

export interface ITerrainMeshPickOptions {
	/** Default false: hole quads are transparent to the ray. The Holes tool passes true. */
	solidHoles?: boolean;
	/** Default true: back faces are ignored (§4.8). */
	frontFacesOnly?: boolean;
}

/** Number of falloff LUTs kept (one per falloff/hardness pair used recently). */
const TERRAIN_FALLOFF_LUT_CACHE_SIZE = 32;

/** Relative tolerance of the "inside the terrain rectangle" tests on world → local conversions. */
const TERRAIN_INSIDE_EPSILON = 1e-6;

const falloffLuts = new Map<string, Float32Array>();

/**
 * Falloff LUT of a falloff/hardness pair (createTerrainFalloffLut, §4.2), cached for the cursor footprint and the strokes.
 * @param falloff defines the falloff curve.
 * @param hardness defines the hardness (0..0.95).
 */
export function getTerrainFalloffLut(falloff: TerrainFalloff, hardness: number): Float32Array {
	const key = `${falloff}|${hardness}`;

	let lut = falloffLuts.get(key);
	if (lut) {
		// Most recently used last.
		falloffLuts.delete(key);
		falloffLuts.set(key, lut);
		return lut;
	}

	lut = createTerrainFalloffLut(falloff, hardness);
	falloffLuts.set(key, lut);

	if (falloffLuts.size > TERRAIN_FALLOFF_LUT_CACHE_SIZE) {
		const oldest = falloffLuts.keys().next().value;
		if (oldest !== undefined) {
			falloffLuts.delete(oldest);
		}
	}

	return lut;
}

/**
 * Local point (x, z) of the terrain surface under the world vertical line through (worldX, worldZ): the inverse world transform for
 * terrains whose local Y axis is world-vertical, a downward heightfield ray-march for tilted terrains (null when it misses).
 * @param view defines the height view of the terrain.
 * @param transform defines the transform of the terrain.
 * @param worldX defines the world X.
 * @param worldZ defines the world Z.
 */
export function resolveTerrainLocalPoint(view: ITerrainHeightView, transform: TerrainTransform, worldX: number, worldZ: number): { x: number; z: number } | null {
	if (!transform.tilted) {
		return transform.worldXZToLocal(worldX, worldZ);
	}

	const { grid, heightRange } = view;
	const corner = new Vector3();

	let top = -Infinity;
	let bottom = Infinity;
	for (const x of [-grid.width * 0.5, grid.width * 0.5]) {
		for (const y of [heightRange.min, heightRange.max]) {
			for (const z of [-grid.height * 0.5, grid.height * 0.5]) {
				transform.localToWorldToRef(x, y, z, corner);
				top = Math.max(top, corner.y);
				bottom = Math.min(bottom, corner.y);
			}
		}
	}

	const margin = Math.max(1, (top - bottom) * 0.01);
	const ray = new Ray(new Vector3(worldX, top + margin, worldZ), new Vector3(0, -1, 0), top - bottom + margin * 2);
	const hit = raycastTerrain(view.heights, grid, transform.worldRayToLocal(ray), {
		minHeight: heightRange.min,
		maxHeight: heightRange.max,
		holes: null,
		maxT: ray.length,
		frontFacesOnly: false,
	});

	return hit ? { x: hit.x, z: hit.z } : null;
}

/**
 * Heightfield ray-march of one terrain mesh (§4.8, target-first picking): world ray → local ray (t stays the world parameter) → hit → world
 * point, world normal (normal matrix), local point, distance (t × |direction|) and fractional (col, row). Honours ray.length. Never binds
 * anything; null when the ray misses, the grid is invalid or the transform degenerate. Visibility and eligibility filtering is up to the caller.
 * @param mesh defines the reference to the terrain mesh.
 * @param ray defines the world ray.
 * @param options defines whether holes are solid and whether back faces are ignored.
 */
export function pickTerrainMesh(mesh: Mesh, ray: Ray, options: ITerrainMeshPickOptions = {}): ITerrainPick | null {
	const view = getTerrainHeightView(mesh);
	if (!view) {
		return null;
	}

	const transform = TerrainTransform.FromMesh(mesh);
	if (transform.degenerate) {
		return null;
	}

	const hit = raycastTerrain(view.heights, view.grid, transform.worldRayToLocal(ray), {
		minHeight: view.heightRange.min,
		maxHeight: view.heightRange.max,
		holes: options.solidHoles ? null : view.holes,
		maxT: Number.isFinite(ray.length) ? ray.length : undefined,
		frontFacesOnly: options.frontFacesOnly ?? true,
	});

	if (!hit) {
		return null;
	}

	return {
		mesh,
		worldPoint: transform.localToWorldToRef(hit.x, hit.y, hit.z, new Vector3()),
		worldNormal: transform.localNormalToWorldToRef(hit.nx, hit.ny, hit.nz, new Vector3()),
		localPoint: new Vector3(hit.x, hit.y, hit.z),
		distance: hit.t * ray.direction.length(),
		col: hit.col,
		row: hit.row,
	};
}

/**
 * Surface under the world point (worldX, worldZ) (sampleTerrainSurface: cursor ring, HUD, decals re-projection, MCP sample_terrain): world
 * height of the rendered surface (two-triangle rule of §4.1), world normal and slope from the local gradient (§4.10.5), local point and
 * whether the point lies over a hole quad. Null outside the terrain rectangle or when the mesh has no valid grid.
 * @param mesh defines the reference to the terrain mesh.
 * @param worldX defines the world X.
 * @param worldZ defines the world Z.
 */
export function sampleTerrainSurface(mesh: Mesh, worldX: number, worldZ: number): ITerrainSurfaceSample | null {
	const view = getTerrainHeightView(mesh);
	if (!view) {
		return null;
	}

	const transform = TerrainTransform.FromMesh(mesh);
	if (transform.degenerate) {
		return null;
	}

	const local = resolveTerrainLocalPoint(view, transform, worldX, worldZ);
	if (!local || !isInsideTerrain(view, local.x, local.z)) {
		return null;
	}

	const { grid, heights } = view;
	const x = clampToTerrain(local.x, grid.width);
	const z = clampToTerrain(local.z, grid.height);

	const h = sampleTerrainHeight(heights, grid, x, z);
	const gradient = sampleTerrainGradient(heights, grid, x, z);

	const normalWorld = transform.localNormalToWorldToRef(-gradient.dx, 1, -gradient.dz, new Vector3());
	const slopeDegrees = transform.tilted
		? (Math.acos(Math.min(1, Math.max(-1, normalWorld.y))) * 180) / Math.PI
		: computeTerrainSlopeDegrees(gradient.dx, gradient.dz, transform.metric);

	return {
		heightWorld: transform.localPointWorldY(x, h, z),
		normalWorld,
		slopeDegrees,
		localPoint: new Vector3(x, h, z),
		hole: view.holes[getQuadIndex(view.grid, x, z)] === 1,
	};
}

/**
 * count × count world heights (cm) of the surface over the whole terrain (getTerrainHeightSamples): row 0 = +Z edge, column 0 = -X edge,
 * samples on the rectangle edges included. Null when the mesh has no valid grid.
 * @param mesh defines the reference to the terrain mesh.
 * @param count defines the number of samples per side (clamped to 2..64).
 */
export function getTerrainHeightSamples(mesh: Mesh, count: number): number[][] | null {
	const view = getTerrainHeightView(mesh);
	if (!view) {
		return null;
	}

	const transform = TerrainTransform.FromMesh(mesh);
	const n = Math.min(64, Math.max(2, Math.round(count) || 2));
	const { grid, heights } = view;

	const rows: number[][] = [];
	for (let j = 0; j < n; ++j) {
		const z = grid.height * 0.5 - (grid.height * j) / (n - 1);
		const row: number[] = [];

		for (let i = 0; i < n; ++i) {
			const x = -grid.width * 0.5 + (grid.width * i) / (n - 1);
			row.push(transform.localPointWorldY(x, sampleTerrainHeight(heights, grid, x, z), z));
		}

		rows.push(row);
	}

	return rows;
}

/**
 * Layer weights 0..1 (one per layer, sum 1) of the texel nearest to the world point (§4.10.11, sampleTerrainLayerWeights: eyedropper,
 * HUD, MCP). Null without terrain material, layers or loaded weights, and outside the terrain rectangle.
 * @param mesh defines the reference to the terrain mesh.
 * @param worldX defines the world X.
 * @param worldZ defines the world Z.
 */
export function sampleTerrainLayerWeights(mesh: Mesh, worldX: number, worldZ: number): number[] | null {
	const { weights } = TerrainWeightsBinding.acquire(getTerrainMaterialPlugin(mesh.material as any));
	if (!weights) {
		return null;
	}

	const view = getTerrainHeightView(mesh);
	if (!view) {
		return null;
	}

	const transform = TerrainTransform.FromMesh(mesh);
	if (transform.degenerate) {
		return null;
	}

	const local = resolveTerrainLocalPoint(view, transform, worldX, worldZ);
	if (!local || !isInsideTerrain(view, local.x, local.z)) {
		return null;
	}

	const { grid } = view;
	const u = (clampToTerrain(local.x, grid.width) + grid.width * 0.5) / grid.width;
	const v = (clampToTerrain(local.z, grid.height) + grid.height * 0.5) / grid.height;

	const out = new Float32Array(8);
	sampleTerrainTexelWeights(weights.maps, u, v, out);

	return Array.from(out.subarray(0, weights.layerCount));
}

/**
 * Cursor footprint of a stroke request centred at a world point (§4.15, evaluateTerrainFootprint): gridSize² points of brush space (row j
 * along bv from -1 to +1, column i along bu from -1 to +1) rotated by `rotationRadians` in the metric-local plane, each with its world
 * position on the surface (clamped to the terrain, lifted by 0.5 % of the radius) and its filtered shape weight (0 outside the terrain).
 * Symmetry copies are not previewed. Null when the mesh is not a terrain or the centre is farther than the radius outside the terrain.
 * @param mesh defines the reference to the terrain mesh.
 * @param request defines the stroke request (shape, radius, falloff, hardness, filters).
 * @param worldCenter defines the world centre of the brush (on the terrain).
 * @param rotationRadians defines the rotation of the brush.
 * @param gridSize defines the number of points per side (33 for the cursor; clamped to 2..512).
 */
export function evaluateTerrainFootprint(mesh: Mesh, request: ITerrainStrokeRequest, worldCenter: Vector3, rotationRadians: number, gridSize: number): ITerrainFootprint | null {
	const context = createBrushSpaceContext(mesh, request.brush.radius, worldCenter, gridSize, 512);
	if (!context) {
		return null;
	}

	const { view, transform, n, radius, cmx, cmz } = context;
	const { grid, heights } = view;
	const { sx, sy, sz } = transform.metric;
	const halfWidth = grid.width * 0.5;
	const halfHeight = grid.height * 0.5;

	const lut = getTerrainFalloffLut(request.shape.falloff, request.shape.hardness);
	const filters = createFootprintFilters(mesh, view, transform, request);

	const cos = Math.cos(rotationRadians);
	const sin = Math.sin(rotationRadians);
	const lift = (0.005 * radius) / sy;

	const m = transform.world.m;
	const positions = new Float32Array(n * n * 3);
	const weights = new Float32Array(n * n);

	for (let j = 0; j < n; ++j) {
		const bv = -1 + (2 * j) / (n - 1);

		for (let i = 0; i < n; ++i) {
			const bu = -1 + (2 * i) / (n - 1);

			const x = (cmx + radius * (cos * bu - sin * bv)) / sx;
			const z = (cmz + radius * (sin * bu + cos * bv)) / sz;

			const index = j * n + i;
			if (Math.abs(x) <= halfWidth && Math.abs(z) <= halfHeight) {
				weights[index] = evaluateTerrainBrushShape(request.shape, lut, bu, bv) * (filters ? filters.evaluate(x, z) : 1);
			}

			const cx = Math.min(halfWidth, Math.max(-halfWidth, x));
			const cz = Math.min(halfHeight, Math.max(-halfHeight, z));
			const y = sampleTerrainHeight(heights, grid, cx, cz) + lift;

			positions[index * 3] = cx * m[0] + y * m[4] + cz * m[8] + m[12];
			positions[index * 3 + 1] = cx * m[1] + y * m[5] + cz * m[9] + m[13];
			positions[index * 3 + 2] = cx * m[2] + y * m[6] + cz * m[10] + m[14];
		}
	}

	return { size: n, positions, weights };
}

/**
 * Heights under a rotated square of half-size `radius` (world cm) centred at a world point, resolution × resolution, normalized 0..1 between
 * their min and max, IMAGE ORDER (row 0 = brush bv = +1; brush capture, §4.16, getTerrainHeightPatch), with that min and max (world cm).
 * Same brush-space grid as the footprint (§4.15), points clamped to the terrain. Null when the mesh is not a terrain or the centre is farther
 * than the radius outside it.
 * @param mesh defines the reference to the terrain mesh.
 * @param worldCenter defines the world centre of the patch.
 * @param radius defines the half-size of the patch (world cm).
 * @param rotationRadians defines the rotation of the brush.
 * @param resolution defines the number of samples per side (256 for captures; clamped to 2..4096).
 */
export function getTerrainHeightPatch(mesh: Mesh, worldCenter: Vector3, radius: number, rotationRadians: number, resolution: number): ITerrainHeightPatch | null {
	const context = createBrushSpaceContext(mesh, radius, worldCenter, resolution, 4096);
	if (!context) {
		return null;
	}

	const { view, transform, n, cmx, cmz } = context;
	const { grid, heights } = view;
	const { sx, sz } = transform.metric;
	const halfWidth = grid.width * 0.5;
	const halfHeight = grid.height * 0.5;

	const cos = Math.cos(rotationRadians);
	const sin = Math.sin(rotationRadians);

	const values = new Float32Array(n * n);
	let min = Infinity;
	let max = -Infinity;

	for (let j = 0; j < n; ++j) {
		const bv = -1 + (2 * j) / (n - 1);

		for (let i = 0; i < n; ++i) {
			const bu = -1 + (2 * i) / (n - 1);

			const x = Math.min(halfWidth, Math.max(-halfWidth, (cmx + context.radius * (cos * bu - sin * bv)) / sx));
			const z = Math.min(halfHeight, Math.max(-halfHeight, (cmz + context.radius * (sin * bu + cos * bv)) / sz));

			const worldY = transform.localToWorldHeight(sampleTerrainHeight(heights, grid, x, z));
			values[j * n + i] = worldY;

			min = Math.min(min, worldY);
			max = Math.max(max, worldY);
		}
	}

	const data = new Float32Array(n * n);
	const range = max - min;

	for (let j = 0; j < n; ++j) {
		for (let i = 0; i < n; ++i) {
			data[(n - 1 - j) * n + i] = range > 0 ? (values[j * n + i] - min) / range : 0;
		}
	}

	return { width: n, height: n, data, minHeight: min, maxHeight: max };
}

interface ITerrainBrushSpaceContext {
	view: ITerrainHeightView;
	transform: TerrainTransform;
	n: number;
	radius: number;
	/** Metric-local centre. */
	cmx: number;
	cmz: number;
}

function createBrushSpaceContext(mesh: Mesh, radius: number, worldCenter: Vector3, gridSize: number, maxGridSize: number): ITerrainBrushSpaceContext | null {
	if (!isTerrainMesh(mesh) || !(radius > 0)) {
		return null;
	}

	const view = getTerrainHeightView(mesh);
	if (!view) {
		return null;
	}

	const transform = TerrainTransform.FromMesh(mesh);
	if (transform.degenerate) {
		return null;
	}

	const center = transform.worldToLocalToRef(worldCenter.x, worldCenter.y, worldCenter.z, new Vector3());
	const { sx, sz } = transform.metric;

	const outsideX = Math.max(0, Math.abs(center.x) - view.grid.width * 0.5) * sx;
	const outsideZ = Math.max(0, Math.abs(center.z) - view.grid.height * 0.5) * sz;
	if (outsideX * outsideX + outsideZ * outsideZ > radius * radius) {
		return null;
	}

	return {
		view,
		transform,
		n: Math.min(maxGridSize, Math.max(2, Math.round(gridSize) || 2)),
		radius,
		cmx: center.x * sx,
		cmz: center.z * sz,
	};
}

function createFootprintFilters(mesh: Mesh, view: ITerrainHeightView, transform: TerrainTransform, request: ITerrainStrokeRequest): ITerrainFilterEvaluator | null {
	let weights: ITerrainWeightMaps | null = null;
	let filterLayerIndex = -1;

	const layerFilter = request.filters.layer;
	if (layerFilter.enabled && layerFilter.layerId) {
		const plugin = getTerrainMaterialPlugin(mesh.material as any);
		if (plugin) {
			filterLayerIndex = plugin.data.layers.findIndex((layer) => layer.id === layerFilter.layerId);
			weights = TerrainWeightsBinding.acquire(plugin).weights?.maps ?? null;
		}
	}

	return createTerrainFilterEvaluator(request.filters, createTerrainSurfaceSampler(view.heights, view.grid, transform), weights, view.grid, filterLayerIndex);
}

function isInsideTerrain(view: ITerrainHeightView, x: number, z: number): boolean {
	const halfWidth = view.grid.width * 0.5;
	const halfHeight = view.grid.height * 0.5;

	return Math.abs(x) <= halfWidth * (1 + TERRAIN_INSIDE_EPSILON) && Math.abs(z) <= halfHeight * (1 + TERRAIN_INSIDE_EPSILON);
}

function clampToTerrain(value: number, size: number): number {
	return Math.min(size * 0.5, Math.max(-size * 0.5, value));
}

function getQuadIndex(grid: ITerrainGrid, x: number, z: number): number {
	const last = grid.subdivisions - 1;
	const quadCol = Math.min(last, Math.max(0, Math.floor(grid.colOf(x))));
	const quadRow = Math.min(last, Math.max(0, Math.floor(grid.rowOf(z))));

	return quadRow * grid.subdivisions + quadCol;
}
