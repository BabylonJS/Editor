import type { ITerrainGrid, ITerrainImage } from "./types";

/**
 * Bilinear sampling of an image (image order: row 0 = top = local +Z edge = vertex row 0) onto the grid (§4.12): vertex (c, r) samples
 * the image at px = c / S × (w - 1), py = r / S × (h - 1); the value v maps to value = minLocal + v (maxLocal - minLocal). Modes:
 * replace → out = value; add → out = current + value (callers pass the world range divided by sy, without the translation: h += Y / sy);
 * max / min → out = max / min(current, value). Returns the (S+1)² heights in a new array (current is not changed). An empty image reads as
 * 0 everywhere.
 */
export function terrainImageToHeights(
	image: ITerrainImage,
	grid: ITerrainGrid,
	minLocal: number,
	maxLocal: number,
	mode: "replace" | "add" | "max" | "min",
	current: Float32Array
): Float32Array {
	const subdivisions = grid.subdivisions;
	const columns = subdivisions + 1;
	const range = maxLocal - minLocal;
	const out = new Float32Array(columns * columns);

	const width = image.width;
	const height = image.height;
	const data = image.data;
	const hasImage = width >= 1 && height >= 1 && data.length >= width * height;
	const scaleX = subdivisions > 0 ? (width - 1) / subdivisions : 0;
	const scaleY = subdivisions > 0 ? (height - 1) / subdivisions : 0;

	for (let row = 0; row < columns; ++row) {
		let y0 = 0;
		let y1 = 0;
		let ty = 0;
		if (hasImage) {
			const py = row * scaleY;
			y0 = Math.min(Math.floor(py), height - 1);
			y1 = Math.min(y0 + 1, height - 1);
			ty = py - y0;
		}

		for (let col = 0; col < columns; ++col) {
			const index = row * columns + col;

			let v = 0;
			if (hasImage) {
				const px = col * scaleX;
				const x0 = Math.min(Math.floor(px), width - 1);
				const x1 = Math.min(x0 + 1, width - 1);
				const tx = px - x0;

				const top = data[y0 * width + x0] + (data[y0 * width + x1] - data[y0 * width + x0]) * tx;
				const bottom = data[y1 * width + x0] + (data[y1 * width + x1] - data[y1 * width + x0]) * tx;
				v = top + (bottom - top) * ty;
			}

			const value = minLocal + v * range;
			switch (mode) {
				case "add":
					out[index] = current[index] + value;
					break;
				case "max":
					out[index] = Math.max(current[index], value);
					break;
				case "min":
					out[index] = Math.min(current[index], value);
					break;
				default:
					out[index] = value;
					break;
			}
		}
	}

	return out;
}

/** (S+1) x (S+1) image, image order (row 0 = +Z edge = vertex row 0), v = (h - minLocal) / (maxLocal - minLocal) clamped to 0..1 (0 when the range is empty). */
export function terrainHeightsToImage(heights: Float32Array, grid: ITerrainGrid, minLocal: number, maxLocal: number): ITerrainImage {
	const columns = grid.subdivisions + 1;
	const count = columns * columns;
	const data = new Float32Array(count);

	const range = maxLocal - minLocal;
	if (range > 0) {
		const invRange = 1 / range;
		for (let i = 0; i < count; ++i) {
			const v = (heights[i] - minLocal) * invRange;
			data[i] = v > 0 ? (v < 1 ? v : 1) : 0;
		}
	}

	return { width: columns, height: columns, data };
}

/** New image with the rows in reverse order (image order ↔ texture order, flipY imports). */
export function flipTerrainImageRows(image: ITerrainImage): ITerrainImage {
	const width = image.width;
	const height = image.height;
	const data = new Float32Array(width * height);

	for (let row = 0; row < height; ++row) {
		const sourceStart = (height - 1 - row) * width;
		data.set(image.data.subarray(sourceStart, sourceStart + width), row * width);
	}

	return { width, height, data };
}
