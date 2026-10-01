import { Matrix, Vector3, type AbstractMesh, type Ray } from "babylonjs";

import { sampleTerrainGradient, sampleTerrainHeight } from "../core/heightfield";
import type { ITerrainGrid, ITerrainLocalRay, ITerrainMetric, ITerrainSurfaceSampler } from "../core/types";

/** A metric component (world length of a local unit axis) below this value makes a terrain ineligible: degenerate-transform (§4.1). */
export const TERRAIN_DEGENERATE_METRIC_EPSILON = 1e-6;

/** Tilt tolerance relative to sy (§6.7.1): the local Y axis is world-vertical when |m[4]| and |m[6]| are below 1e-3 × sy. */
export const TERRAIN_TILT_EPSILON = 1e-3;

/**
 * World length (cm) of the ground's local unit axes, read from the ROWS of Babylon's row-vector world matrix m (Matrix.m), exactly as
 * Matrix.decompose does: sx = |(m[0], m[1], m[2])|, sy = |(m[4], m[5], m[6])|, sz = |(m[8], m[9], m[10])| (§4.1).
 * Reading m[0], m[4], m[8] instead would mix the axes of Y-rotated, non-uniformly scaled terrains.
 * @param m defines the 16 values of the world matrix (Matrix.m).
 */
export function getTerrainMetricFromMatrix(m: ArrayLike<number>): ITerrainMetric {
	return {
		sx: Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]),
		sy: Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]),
		sz: Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10]),
	};
}

/**
 * Returns the metric (world lengths of the local unit axes) of the given mesh from its current world matrix (§4.1).
 * @param mesh defines the reference to the mesh (the world matrix is recomputed).
 */
export function getTerrainMetric(mesh: AbstractMesh): ITerrainMetric {
	return getTerrainMetricFromMatrix(mesh.computeWorldMatrix(true).m);
}

/**
 * Returns true when a component of the metric is below TERRAIN_DEGENERATE_METRIC_EPSILON (or not a number): heights would divide by zero.
 * @param metric defines the metric to check.
 */
export function isTerrainMetricDegenerate(metric: ITerrainMetric): boolean {
	return !(metric.sx >= TERRAIN_DEGENERATE_METRIC_EPSILON && metric.sy >= TERRAIN_DEGENERATE_METRIC_EPSILON && metric.sz >= TERRAIN_DEGENERATE_METRIC_EPSILON);
}

/**
 * Returns true when the local Y axis of the world matrix is not world-vertical (|m[4]| or |m[6]| >= 1e-3 × sy, §6.7.1) or points down
 * (m[5] <= 0, an upside-down ground). World heights are then measured along the local Y axis (warning "tilted").
 * @param m defines the 16 values of the world matrix (Matrix.m).
 */
export function isTerrainMatrixTilted(m: ArrayLike<number>): boolean {
	const sy = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]);
	const tolerance = TERRAIN_TILT_EPSILON * sy;

	return !(Math.abs(m[4]) < tolerance && Math.abs(m[6]) < tolerance && m[5] > 0);
}

/**
 * Slope in degrees (0 = flat) of a local height gradient measured in world units (§4.10.5): atan(sqrt((gx sy / sx)² + (gz sy / sz)²)).
 * @param gx defines the local dh/dx.
 * @param gz defines the local dh/dz.
 * @param metric defines the metric of the terrain.
 */
export function computeTerrainSlopeDegrees(gx: number, gz: number, metric: ITerrainMetric): number {
	const sx = gx * (metric.sy / metric.sx);
	const sz = gz * (metric.sy / metric.sz);

	return (Math.atan(Math.sqrt(sx * sx + sz * sz)) * 180) / Math.PI;
}

/**
 * Snapshot of a terrain's world transform: world ↔ local ↔ metric conversions, rays and world heights (§4.1).
 * Local heights convert with localToWorldHeight(h) = h sy + m[13] and worldToLocalHeight(Y) = (Y - m[13]) / sy: exact for terrains rotated
 * around Y only (tilted terrains get the "tilted" warning).
 */
export class TerrainTransform {
	/** Copy of the world matrix at creation. */
	public readonly world: Matrix;
	/** Inverse of the world matrix. */
	public readonly inverse: Matrix;
	/** World lengths of the local unit axes (matrix rows). */
	public readonly metric: ITerrainMetric;
	/** True when the local Y axis is not world-vertical (§6.7.1). */
	public readonly tilted: boolean;
	/** True when a metric component is below TERRAIN_DEGENERATE_METRIC_EPSILON: the terrain can't be edited. */
	public readonly degenerate: boolean;

	/**
	 * Constructor.
	 * @param world defines the world matrix of the terrain (copied).
	 */
	public constructor(world: Matrix) {
		this.world = world.clone();
		this.inverse = this.world.invertToRef(new Matrix());
		this.metric = getTerrainMetricFromMatrix(this.world.m);
		this.tilted = isTerrainMatrixTilted(this.world.m);
		this.degenerate = isTerrainMetricDegenerate(this.metric);
	}

	/**
	 * Creates the transform of the given mesh from its world matrix (recomputed first, so changes made since the last render are seen).
	 * @param mesh defines the reference to the terrain mesh.
	 */
	public static FromMesh(mesh: AbstractMesh): TerrainTransform {
		return new TerrainTransform(mesh.computeWorldMatrix(true));
	}

	/**
	 * World height (cm) of a local height: h sy + m[13] (§4.1).
	 * @param localY defines the local height.
	 */
	public localToWorldHeight(localY: number): number {
		return localY * this.metric.sy + this.world.m[13];
	}

	/**
	 * Local height of a world height (cm): (Y - m[13]) / sy (§4.1).
	 * @param worldY defines the world height.
	 */
	public worldToLocalHeight(worldY: number): number {
		return (worldY - this.world.m[13]) / this.metric.sy;
	}

	/**
	 * Converts a world ray to the terrain's local space: the origin is transformed as a point, the direction as a vector and NOT normalized,
	 * so the local parameter t equals the world ray parameter (§4.8).
	 * @param ray defines the world ray.
	 * @param result defines the optional object receiving the local ray.
	 */
	public worldRayToLocal(ray: Ray, result?: ITerrainLocalRay): ITerrainLocalRay {
		const m = this.inverse.m;
		const o = ray.origin;
		const d = ray.direction;

		const local = result ?? { ox: 0, oy: 0, oz: 0, dx: 0, dy: 0, dz: 0 };
		local.ox = o.x * m[0] + o.y * m[4] + o.z * m[8] + m[12];
		local.oy = o.x * m[1] + o.y * m[5] + o.z * m[9] + m[13];
		local.oz = o.x * m[2] + o.y * m[6] + o.z * m[10] + m[14];
		local.dx = d.x * m[0] + d.y * m[4] + d.z * m[8];
		local.dy = d.x * m[1] + d.y * m[5] + d.z * m[9];
		local.dz = d.x * m[2] + d.y * m[6] + d.z * m[10];

		return local;
	}

	/**
	 * Transforms a world point to the terrain's local space.
	 * @param x defines the world X.
	 * @param y defines the world Y.
	 * @param z defines the world Z.
	 * @param result defines the vector receiving the local point.
	 */
	public worldToLocalToRef(x: number, y: number, z: number, result: Vector3): Vector3 {
		const m = this.inverse.m;
		return result.set(x * m[0] + y * m[4] + z * m[8] + m[12], x * m[1] + y * m[5] + z * m[9] + m[13], x * m[2] + y * m[6] + z * m[10] + m[14]);
	}

	/**
	 * Transforms a local point of the terrain to world space.
	 * @param x defines the local X.
	 * @param y defines the local Y.
	 * @param z defines the local Z.
	 * @param result defines the vector receiving the world point.
	 */
	public localToWorldToRef(x: number, y: number, z: number, result: Vector3): Vector3 {
		const m = this.world.m;
		return result.set(x * m[0] + y * m[4] + z * m[8] + m[12], x * m[1] + y * m[5] + z * m[9] + m[13], x * m[2] + y * m[6] + z * m[10] + m[14]);
	}

	/**
	 * World Y of the local surface point (x, h, z): the point is transformed by the world matrix, so the X/Z terms of a sheared matrix
	 * are included (§6.7.1). Equals localToWorldHeight(h) for terrains rotated around Y only.
	 * @param x defines the local X.
	 * @param h defines the local height.
	 * @param z defines the local Z.
	 */
	public localPointWorldY(x: number, h: number, z: number): number {
		const m = this.world.m;
		return x * m[1] + h * m[5] + z * m[9] + m[13];
	}

	/**
	 * Transforms a local normal to a normalized world normal with the normal matrix (inverse transpose of the world matrix).
	 * @param nx defines the local normal X.
	 * @param ny defines the local normal Y.
	 * @param nz defines the local normal Z.
	 * @param result defines the vector receiving the world normal.
	 */
	public localNormalToWorldToRef(nx: number, ny: number, nz: number, result: Vector3): Vector3 {
		const m = this.inverse.m;

		const x = nx * m[0] + ny * m[1] + nz * m[2];
		const y = nx * m[4] + ny * m[5] + nz * m[6];
		const z = nx * m[8] + ny * m[9] + nz * m[10];

		const length = Math.sqrt(x * x + y * y + z * z);
		if (length > 0) {
			return result.set(x / length, y / length, z / length);
		}

		return result.set(0, 1, 0);
	}

	/**
	 * Local (x, z) of the world vertical line through (worldX, worldZ) for a terrain whose local Y axis is world-vertical (not tilted):
	 * the world point (worldX, 0, worldZ) transformed by the inverse world matrix. Tilted terrains need a ray-march instead.
	 * @param worldX defines the world X.
	 * @param worldZ defines the world Z.
	 */
	public worldXZToLocal(worldX: number, worldZ: number): { x: number; z: number } {
		const m = this.inverse.m;
		return {
			x: worldX * m[0] + worldZ * m[8] + m[12],
			z: worldX * m[2] + worldZ * m[10] + m[14],
		};
	}

	/**
	 * Metric-local coordinates (local x/z multiplied by sx/sz, §4.1) of a local point.
	 * @param x defines the local X.
	 * @param z defines the local Z.
	 */
	public localToMetric(x: number, z: number): { mx: number; mz: number } {
		return {
			mx: x * this.metric.sx,
			mz: z * this.metric.sz,
		};
	}

	/**
	 * Local coordinates of a metric-local point (§4.1).
	 * @param mx defines the metric-local X.
	 * @param mz defines the metric-local Z.
	 */
	public metricToLocal(mx: number, mz: number): { x: number; z: number } {
		return {
			x: mx / this.metric.sx,
			z: mz / this.metric.sz,
		};
	}
}

/**
 * Returns the transform of the given mesh (world matrix recomputed).
 * @param mesh defines the reference to the terrain mesh.
 */
export function getTerrainTransform(mesh: AbstractMesh): TerrainTransform {
	return TerrainTransform.FromMesh(mesh);
}

/**
 * Surface sampler of a heightfield (filters): world height and slope in degrees at local points, with the world-height
 * convention of the stroke target (localToWorldHeight) and the slope formula of §4.10.5.
 * @param heights defines the (S+1)² local heights (live array: later edits are seen).
 * @param grid defines the grid of the terrain.
 * @param transform defines the transform of the terrain.
 */
export function createTerrainSurfaceSampler(heights: Float32Array, grid: ITerrainGrid, transform: TerrainTransform): ITerrainSurfaceSampler {
	return {
		heightWorldAt: (x: number, z: number) => {
			return transform.localToWorldHeight(sampleTerrainHeight(heights, grid, x, z));
		},
		slopeDegreesAt: (x: number, z: number) => {
			const gradient = sampleTerrainGradient(heights, grid, x, z);
			return computeTerrainSlopeDegrees(gradient.dx, gradient.dz, transform.metric);
		},
	};
}
