import type { ITerrainBrushMask } from "./types";

/**
 * Bilinear sample at brush coordinates bu, bv in [-1, 1] (bv = +1 is the image top); 0 outside (§4.3.3).
 * Corner-aligned: bu = -1 is the centre of column 0 and bu = +1 the centre of the last column ((bu + 1) / 2 × (width - 1));
 * bv = +1 is the centre of row 0 (image top) and bv = -1 the centre of the last row ((1 - bv) / 2 × (height - 1)).
 */
export function sampleTerrainBrushMask(mask: ITerrainBrushMask, bu: number, bv: number): number {
	// Written with negated comparisons so NaN coordinates fall outside.
	if (!(bu >= -1 && bu <= 1 && bv >= -1 && bv <= 1)) {
		return 0;
	}

	const width = mask.width;
	const height = mask.height;
	const data = mask.data;
	if (width < 1 || height < 1 || data.length < width * height) {
		return 0;
	}

	const fx = (bu + 1) * 0.5 * (width - 1);
	const fy = (1 - bv) * 0.5 * (height - 1);

	const x0 = Math.min(Math.floor(fx), width - 1);
	const y0 = Math.min(Math.floor(fy), height - 1);
	const x1 = Math.min(x0 + 1, width - 1);
	const y1 = Math.min(y0 + 1, height - 1);
	const tx = fx - x0;
	const ty = fy - y0;

	const row0 = y0 * width;
	const row1 = y1 * width;
	const top = data[row0 + x0] + (data[row0 + x1] - data[row0 + x0]) * tx;
	const bottom = data[row1 + x0] + (data[row1 + x1] - data[row1 + x0]) * tx;

	return top + (bottom - top) * ty;
}
