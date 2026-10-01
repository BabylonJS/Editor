import { evaluateTerrainFalloff } from "../falloff";
import type { ITerrainBrushShape, ITerrainGrid, ITerrainMetric, ITerrainRect, ITerrainSculptOptions } from "../types";

/** Ramp from A to B: local x, z and local heights (§4.14). */
export interface ITerrainRampSegment {
	ax: number;
	az: number;
	ah: number;
	bx: number;
	bz: number;
	bh: number;
}

/** Inputs of applyTerrainRamp. */
export interface ITerrainRampContext {
	/** (S+1)² local heights, row 0 = +Z edge. */
	heights: Float32Array;
	grid: ITerrainGrid;
	metric: ITerrainMetric;
	segment: ITerrainRampSegment;
	/** Radius of the ramp around the segment, world cm. */
	radius: number;
	/** Brush shape: its falloff is used across the ramp. */
	shape: ITerrainBrushShape;
	strength: number;
	options: ITerrainSculptOptions["ramp"];
	/** Height clamp in local units (every written vertex is clamped), null when disabled. */
	clampLocal: { min: number; max: number } | null;
}

/** Hardness range of the falloff curves (§4.2). */
const MAX_FALLOFF_HARDNESS = 0.95;

/**
 * Vertex rect the ramp can write: the segment's bounding box expanded by the radius (metric distance, so R / sx and R / sz in local units),
 * floored/ceiled to vertices and clamped to the grid ("segment bounds ⊕ R" of §7.1). Null when it misses the grid.
 * The stroke engine touches this rect in the journal before calling applyTerrainRamp, which never writes outside it.
 */
export function getTerrainRampRect(grid: ITerrainGrid, metric: ITerrainMetric, segment: ITerrainRampSegment, radius: number): ITerrainRect | null {
	if (!(radius > 0) || !Number.isFinite(radius)) {
		return null;
	}

	const halfWidth = grid.width * 0.5;
	const halfHeight = grid.height * 0.5;
	const reachX = radius / metric.sx;
	const reachZ = radius / metric.sz;

	const minX = Math.min(segment.ax, segment.bx) - reachX;
	const maxX = Math.max(segment.ax, segment.bx) + reachX;
	const minZ = Math.min(segment.az, segment.bz) - reachZ;
	const maxZ = Math.max(segment.az, segment.bz) + reachZ;

	const x0 = Math.max(0, Math.floor((minX + halfWidth) / grid.cellX));
	const x1 = Math.min(grid.columns - 1, Math.ceil((maxX + halfWidth) / grid.cellX));
	const y0 = Math.max(0, Math.floor((halfHeight - maxZ) / grid.cellZ));
	const y1 = Math.min(grid.rows - 1, Math.ceil((halfHeight - minZ) / grid.cellZ));

	if (!(x1 >= x0) || !(y1 >= y0)) {
		return null;
	}

	return { x0, y0, x1, y1 };
}

/**
 * Ramp (§4.14), applied once at the end of the stroke: every vertex within metric distance R of the segment AB moves towards
 * target = mix(ah, bh, t) (t = clamped projection on AB) by (target − h) × w × strength, w = f(dist / R) with the brush falloff
 * (shape.falloff) and hardness 1 − sideFalloff (clamped to 0.95). options.mode filters the changes ("raise" keeps rises, "lower" keeps
 * descents); the caller passes mode "lower" for an inverted stroke. Writes stay in getTerrainRampRect(); returns the rect written.
 */
export function applyTerrainRamp(context: ITerrainRampContext): ITerrainRect | null {
	const { heights, grid, metric, segment, radius, shape, strength, options, clampLocal } = context;

	const amount = strength > 0 ? Math.min(1, strength) : 0;
	const bounds = getTerrainRampRect(grid, metric, segment, radius);
	if (!bounds || !(amount > 0) || !Number.isFinite(segment.ah) || !Number.isFinite(segment.bh)) {
		return null;
	}

	const sideFalloff = Number.isFinite(options.sideFalloff) ? options.sideFalloff : 0;
	const hardness = Math.min(MAX_FALLOFF_HARDNESS, Math.max(0, 1 - sideFalloff));
	const raiseOnly = options.mode === "raise";
	const lowerOnly = options.mode === "lower";
	const lo = clampLocal ? Math.min(clampLocal.min, clampLocal.max) : -Infinity;
	const hi = clampLocal ? Math.max(clampLocal.min, clampLocal.max) : Infinity;

	const { sx, sz } = metric;
	const startX = segment.ax * sx;
	const startZ = segment.az * sz;
	const segmentX = segment.bx * sx - startX;
	const segmentZ = segment.bz * sz - startZ;
	const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
	const inverseRadius = 1 / radius;
	const columns = grid.columns;
	const halfWidth = grid.width * 0.5;
	const halfHeight = grid.height * 0.5;

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let y = bounds.y0; y <= bounds.y1; ++y) {
		const pointZ = (halfHeight - y * grid.cellZ) * sz - startZ;
		const heightRow = y * columns;
		let first = -1;
		let last = -1;

		for (let x = bounds.x0; x <= bounds.x1; ++x) {
			const pointX = (x * grid.cellX - halfWidth) * sx - startX;

			let t = lengthSquared > 0 ? (pointX * segmentX + pointZ * segmentZ) / lengthSquared : 0;
			t = t < 0 ? 0 : t > 1 ? 1 : t;

			const offsetX = pointX - segmentX * t;
			const offsetZ = pointZ - segmentZ * t;
			const distance = Math.sqrt(offsetX * offsetX + offsetZ * offsetZ) * inverseRadius;
			if (!(distance < 1)) {
				continue;
			}

			const w = evaluateTerrainFalloff(shape.falloff, hardness, distance);
			if (!(w > 0)) {
				continue;
			}

			const h = heights[heightRow + x];
			const delta = (segment.ah + (segment.bh - segment.ah) * t - h) * w * amount;
			if ((raiseOnly && !(delta > 0)) || (lowerOnly && !(delta < 0)) || delta === 0) {
				continue;
			}

			const value = h + delta;
			heights[heightRow + x] = value < lo ? lo : value > hi ? hi : value;

			if (first < 0) {
				first = x;
			}
			last = x;
		}

		if (first >= 0) {
			minX = Math.min(minX, first);
			maxX = Math.max(maxX, last);
			minY = Math.min(minY, y);
			maxY = y;
		}
	}

	return maxX < minX || maxY < minY ? null : { x0: minX, y0: minY, x1: maxX, y1: maxY };
}
