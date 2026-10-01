import { sampleTerrainBrushMask } from "./brush-mask";
import { TERRAIN_FALLOFF_LUT_SIZE } from "./falloff";
import type { ITerrainFilterEvaluator } from "./filters";
import type { ITerrainBrushShape, ITerrainDab, ITerrainDabWeights, ITerrainGrid, ITerrainMetric } from "./types";

export type TerrainResourceSpaceKind = "vertices" | "quads" | "texels";

/** Element (i, j) centre in metric-local space: mx = ax * i + bx, mz = az * j + bz. */
export interface ITerrainResourceSpace {
	readonly kind: TerrainResourceSpaceKind;
	readonly width: number;
	readonly height: number;
	readonly ax: number;
	readonly bx: number;
	readonly az: number;
	readonly bz: number;
	/** Metric scale of the space: local x = mx / sx, local z = mz / sz. */
	readonly sx: number;
	readonly sz: number;
}

/**
 * Resource spaces of §4.3.3 (element centres in metric-local space):
 * - vertices (S+1)²: mx = (c cellX - W/2) sx, mz = (H/2 - r cellZ) sz (row 0 = +Z edge);
 * - quads S²: centre of quad (qc + 0.5, qr + 0.5) with the same axes;
 * - texels N² (textureSize required): mx = ((tx + 0.5)/N - 0.5) W sx, mz = ((ty + 0.5)/N - 0.5) H sz (texture order, row 0 = -Z edge).
 */
export function createTerrainResourceSpace(kind: TerrainResourceSpaceKind, grid: ITerrainGrid, metric: ITerrainMetric, textureSize?: number): ITerrainResourceSpace {
	const width = grid.width;
	const height = grid.height;
	const subdivisions = grid.subdivisions;

	switch (kind) {
		case "vertices":
			return {
				kind,
				width: subdivisions + 1,
				height: subdivisions + 1,
				ax: grid.cellX * metric.sx,
				bx: -0.5 * width * metric.sx,
				az: -grid.cellZ * metric.sz,
				bz: 0.5 * height * metric.sz,
				sx: metric.sx,
				sz: metric.sz,
			};

		case "quads":
			return {
				kind,
				width: subdivisions,
				height: subdivisions,
				ax: grid.cellX * metric.sx,
				bx: (0.5 * grid.cellX - 0.5 * width) * metric.sx,
				az: -grid.cellZ * metric.sz,
				bz: (0.5 * height - 0.5 * grid.cellZ) * metric.sz,
				sx: metric.sx,
				sz: metric.sz,
			};

		case "texels": {
			const size = textureSize ?? 0;
			if (!(size >= 1) || !Number.isInteger(size)) {
				throw new Error(`terrain: createTerrainResourceSpace("texels") needs a positive integer texture size (got ${textureSize})`);
			}

			// b = (0.5 / N - 0.5) × W sx, written as half a texel minus half the terrain (exact when both are).
			const ax = (width * metric.sx) / size;
			const az = (height * metric.sz) / size;
			return {
				kind,
				width: size,
				height: size,
				ax,
				bx: 0.5 * ax - 0.5 * width * metric.sx,
				az,
				bz: 0.5 * az - 0.5 * height * metric.sz,
				sx: metric.sx,
				sz: metric.sz,
			};
		}

		default:
			throw new Error(`terrain: unknown resource space kind "${kind}"`);
	}
}

/**
 * Shape weight 0..1 at brush coordinates (bu, bv) of §4.1 (mirroring already applied by the caller): round/square/image rules of §4.3.3, filters excluded.
 * - round: d² < 1 ? lut[floor(d² × 1024)] : 0;
 * - square: d = max(|bu|, |bv|) (Chebyshev), d < 1 ? f(d) : 0;
 * - image: bilinear mask sample × (edgeFalloff ? round weight : 1). An image shape without a mask falls back to the round rule.
 */
export function evaluateTerrainBrushShape(shape: ITerrainBrushShape, lut: Float32Array, bu: number, bv: number): number {
	const d2 = bu * bu + bv * bv;

	switch (shape.kind) {
		case "square": {
			const d = Math.max(Math.abs(bu), Math.abs(bv));
			return d < 1 ? lut[(d * d * TERRAIN_FALLOFF_LUT_SIZE) | 0] : 0;
		}

		case "image": {
			if (!shape.mask) {
				return d2 < 1 ? lut[(d2 * TERRAIN_FALLOFF_LUT_SIZE) | 0] : 0;
			}

			const value = sampleTerrainBrushMask(shape.mask, bu, bv);
			if (!shape.edgeFalloff) {
				return value;
			}

			return d2 < 1 ? value * lut[(d2 * TERRAIN_FALLOFF_LUT_SIZE) | 0] : 0;
		}

		default:
			return d2 < 1 ? lut[(d2 * TERRAIN_FALLOFF_LUT_SIZE) | 0] : 0;
	}
}

/**
 * Rasterizes one dab over a resource space (§4.3.3). Fills out (reusing out.weights when large enough, out.rect is a new object):
 * weights[(j - rect.y0) * stride + (i - rect.x0)] = shape weight × filters, in [0, 1] (0 for every element of the rect outside the shape).
 * The candidate rect covers [cx - E, cx + E] × [cz - E, cz + E] (E = R for round shapes, R√2 for square and image shapes, any rotation), clamped
 * to the resource; it is then shrunk to the rows and columns holding weights > 0 (the disc or square itself for unfiltered analytic shapes,
 * whose falloff is > 0 inside). Returns false when the dab misses the resource or every weight is 0. Cost at 100 elements of radius:
 * ≈ 0.05 ms round, 0.15 ms square, 0.6 ms image (M1 Max, Node).
 */
export function rasterizeTerrainDab(
	dab: ITerrainDab,
	shape: ITerrainBrushShape,
	lut: Float32Array,
	space: ITerrainResourceSpace,
	filters: ITerrainFilterEvaluator | null,
	out: ITerrainDabWeights
): boolean {
	const radius = dab.radius;
	if (!(radius > 0) || space.width < 1 || space.height < 1) {
		return false;
	}

	const extent = shape.kind === "round" ? radius : radius * Math.SQRT2;
	const cx = dab.mx;
	const cz = dab.mz;

	const ia = (cx - extent - space.bx) / space.ax;
	const ib = (cx + extent - space.bx) / space.ax;
	const ja = (cz - extent - space.bz) / space.az;
	const jb = (cz + extent - space.bz) / space.az;

	const x0 = Math.max(0, Math.ceil(Math.min(ia, ib)));
	const x1 = Math.min(space.width - 1, Math.floor(Math.max(ia, ib)));
	const y0 = Math.max(0, Math.ceil(Math.min(ja, jb)));
	const y1 = Math.min(space.height - 1, Math.floor(Math.max(ja, jb)));

	// Negated comparisons: NaN bounds (degenerate spaces or dabs) miss.
	if (!(x0 <= x1 && y0 <= y1)) {
		return false;
	}

	const stride = x1 - x0 + 1;
	const count = stride * (y1 - y0 + 1);
	const weights = out.weights.length >= count ? out.weights : new Float32Array(count);
	weights.fill(0, 0, count);

	const ax = space.ax;
	const bx = space.bx;
	const invSx = 1 / space.sx;
	const invSz = 1 / space.sz;

	let minX = x1 + 1;
	let maxX = x0 - 1;
	let minY = y1 + 1;
	let maxY = y0 - 1;

	if (shape.kind === "round") {
		// Rotation and mirroring don't change a round weight: d² = (du² + dz²) / R². Each row only visits the elements of the disc chord
		// (d² < 1, found exactly from a chord with one element of slack on each side), in a branch-free loop when there is no filter.
		// scale = 1024 / R² is exact (power-of-two scaling), so the LUT index is floor(d² × 1024) as for evaluateTerrainBrushShape.
		const radius2 = radius * radius;
		const scale = (1 / radius2) * TERRAIN_FALLOFF_LUT_SIZE;

		for (let j = y0; j <= y1; ++j) {
			const mz = space.az * j + space.bz;
			const dz = mz - cz;
			const dz2 = dz * dz;
			const chord2 = radius2 - dz2;
			if (!(chord2 > 0)) {
				continue;
			}

			const chord = Math.sqrt(chord2);
			const ca = (cx - chord - bx) / ax;
			const cb = (cx + chord - bx) / ax;
			let i0 = Math.max(x0, Math.ceil(Math.min(ca, cb)) - 1);
			let i1 = Math.min(x1, Math.floor(Math.max(ca, cb)) + 1);
			for (; i0 <= i1; ++i0) {
				const du = ax * i0 + bx - cx;
				if ((du * du + dz2) * scale < TERRAIN_FALLOFF_LUT_SIZE) {
					break;
				}
			}
			for (; i1 >= i0; --i1) {
				const du = ax * i1 + bx - cx;
				if ((du * du + dz2) * scale < TERRAIN_FALLOFF_LUT_SIZE) {
					break;
				}
			}
			if (i0 > i1) {
				continue;
			}

			const row = (j - y0) * stride - x0;
			let first = i0;
			let last = i1;

			if (filters) {
				first = -1;
				for (let i = i0; i <= i1; ++i) {
					const mx = ax * i + bx;
					const du = mx - cx;
					const w = lut[((du * du + dz2) * scale) | 0] * filters.evaluate(mx * invSx, mz * invSz);
					if (w > 0) {
						weights[row + i] = w;
						if (first < 0) {
							first = i;
						}
						last = i;
					}
				}

				if (first < 0) {
					continue;
				}
			} else {
				for (let i = i0; i <= i1; ++i) {
					const du = ax * i + bx - cx;
					weights[row + i] = lut[((du * du + dz2) * scale) | 0];
				}
			}

			minX = Math.min(minX, first);
			maxX = Math.max(maxX, last);
			minY = Math.min(minY, j);
			maxY = j;
		}
	} else {
		const invRadius = 1 / radius;
		const cu = Math.cos(dab.rotation) * invRadius;
		const su = Math.sin(dab.rotation) * invRadius;
		const mirror = dab.mirrored ? -1 : 1;
		const square = shape.kind === "square";

		for (let j = y0; j <= y1; ++j) {
			const mz = space.az * j + space.bz;
			const dz = mz - cz;
			const buZ = su * dz;
			const bvZ = cu * dz;

			// Square and image shapes are 0 outside the brush square |bu| <= 1, |bv| <= 1: bound du on this row
			// (bu = ±(cu du + buZ), bv = bvZ - su du), with one element of slack on each side.
			const range = getTerrainSquareRowRange(cu, su, buZ, bvZ);
			if (!range) {
				continue;
			}

			const ra = (range.min + cx - bx) / ax;
			const rb = (range.max + cx - bx) / ax;
			let i0 = Math.max(x0, Math.ceil(Math.min(ra, rb)) - 1);
			let i1 = Math.min(x1, Math.floor(Math.max(ra, rb)) + 1);
			const row = (j - y0) * stride - x0;

			let first = -1;
			let last = -1;

			if (square && !filters) {
				// The row crosses the square along one segment (d < 1 inside): exact ends, then a branch-free loop.
				for (; i0 <= i1; ++i0) {
					const du = ax * i0 + bx - cx;
					if (Math.max(Math.abs((cu * du + buZ) * mirror), Math.abs(bvZ - su * du)) < 1) {
						break;
					}
				}
				for (; i1 >= i0; --i1) {
					const du = ax * i1 + bx - cx;
					if (Math.max(Math.abs((cu * du + buZ) * mirror), Math.abs(bvZ - su * du)) < 1) {
						break;
					}
				}

				for (let i = i0; i <= i1; ++i) {
					const du = ax * i + bx - cx;
					const d = Math.max(Math.abs((cu * du + buZ) * mirror), Math.abs(bvZ - su * du));
					weights[row + i] = lut[(d * d * TERRAIN_FALLOFF_LUT_SIZE) | 0];
				}

				if (i0 <= i1) {
					first = i0;
					last = i1;
				}
			} else {
				for (let i = i0; i <= i1; ++i) {
					const mx = ax * i + bx;
					const du = mx - cx;
					const bu = (cu * du + buZ) * mirror;
					const bv = bvZ - su * du;

					let w = evaluateTerrainBrushShape(shape, lut, bu, bv);
					if (w > 0 && filters) {
						w *= filters.evaluate(mx * invSx, mz * invSz);
					}

					if (w > 0) {
						weights[row + i] = w;
						if (first < 0) {
							first = i;
						}
						last = i;
					}
				}
			}

			if (first >= 0) {
				minX = Math.min(minX, first);
				maxX = Math.max(maxX, last);
				minY = Math.min(minY, j);
				maxY = j;
			}
		}
	}

	if (maxX < minX || maxY < minY) {
		return false;
	}

	// Shrink to the non-zero elements (filtered dabs can be much smaller): a forward in-place copy is safe because every
	// element moves to a lower or equal index.
	let finalStride = stride;
	if (minX !== x0 || maxX !== x1 || minY !== y0 || maxY !== y1) {
		finalStride = maxX - minX + 1;
		let write = 0;
		for (let j = minY; j <= maxY; ++j) {
			let read = (j - y0) * stride + (minX - x0);
			for (let i = minX; i <= maxX; ++i) {
				weights[write++] = weights[read++];
			}
		}
	}

	out.rect = { x0: minX, y0: minY, x1: maxX, y1: maxY };
	out.stride = finalStride;
	out.weights = weights;

	return true;
}

/** du interval of a row where |cu du + buZ| <= 1 and |bvZ - su du| <= 1 (the brush square), null when the row misses it. */
function getTerrainSquareRowRange(cu: number, su: number, buZ: number, bvZ: number): { min: number; max: number } | null {
	let min = Number.NEGATIVE_INFINITY;
	let max = Number.POSITIVE_INFINITY;

	if (Math.abs(cu) > 1e-12) {
		const a = (-1 - buZ) / cu;
		const b = (1 - buZ) / cu;
		min = Math.max(min, Math.min(a, b));
		max = Math.min(max, Math.max(a, b));
	} else if (!(Math.abs(buZ) <= 1)) {
		return null;
	}

	if (Math.abs(su) > 1e-12) {
		const a = (bvZ - 1) / su;
		const b = (bvZ + 1) / su;
		min = Math.max(min, Math.min(a, b));
		max = Math.min(max, Math.max(a, b));
	} else if (!(Math.abs(bvZ) <= 1)) {
		return null;
	}

	return min <= max ? { min, max } : null;
}
