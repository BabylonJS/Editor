import type { ITerrainDabWeights, ITerrainRect } from "../types";

/**
 * dabWeights in quads space; quads whose weight >= threshold become holes (fill = false) or solid (fill = true) (§4.4).
 * `holes` is the S² quad mask (1 = hole) of a square grid; quads with a zero weight are never changed whatever the threshold.
 * Returns the rect of the quads whose state changed, null when none did.
 */
export function applyTerrainHoles(holes: Uint8Array, dabWeights: ITerrainDabWeights, fill: boolean, threshold: number): ITerrainRect | null {
	const size = Math.round(Math.sqrt(holes.length));
	if (size * size !== holes.length) {
		throw new RangeError(`terrain: the hole mask of ${holes.length} quads is not square`);
	}

	const { rect, stride, weights } = dabWeights;
	const x0 = Math.max(rect.x0, 0);
	const y0 = Math.max(rect.y0, 0);
	const x1 = Math.min(rect.x1, size - 1);
	const y1 = Math.min(rect.y1, size - 1);
	const value = fill ? 0 : 1;
	const minimum = Number.isFinite(threshold) ? threshold : 0.5;

	let minX = Infinity;
	let maxX = -1;
	let minY = Infinity;
	let maxY = -1;

	for (let y = y0; y <= y1; ++y) {
		const weightRow = (y - rect.y0) * stride - rect.x0;
		const holeRow = y * size;

		for (let x = x0; x <= x1; ++x) {
			const w = weights[weightRow + x];
			if (!(w > 0) || w < minimum || holes[holeRow + x] === value) {
				continue;
			}

			holes[holeRow + x] = value;
			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
	}

	return maxX < minX ? null : { x0: minX, y0: minY, x1: maxX, y1: maxY };
}
