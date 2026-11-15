import { describe, expect, test } from "vitest";

import { _convert2DLookupTable, _parse3dlLookupTable } from "../../src/rendering/color-grading";

function getTexel(data: Uint8Array, size: number, red: number, green: number, blue: number): number[] {
	const index = (red + green * size + blue * size * size) * 4;
	return Array.from(data.slice(index, index + 4));
}

describe("rendering/color-grading", () => {
	describe("_parse3dlLookupTable", () => {
		test("should lay out the colors as Babylon.js ColorGradingTexture does (blue changing first, normalized by the maximum value)", () => {
			const lines = ["# comment", "0 1023"];
			for (let red = 0; red < 2; ++red) {
				for (let green = 0; green < 2; ++green) {
					for (let blue = 0; blue < 2; ++blue) {
						lines.push(`${red * 4095} ${green * 2000} ${blue * 1000}`);
					}
				}
			}

			const table = _parse3dlLookupTable(lines.join("\r\n"))!;
			expect(table.size).toBe(2);

			expect(getTexel(table.data, 2, 0, 0, 0)).toEqual([0, 0, 0, 255]);
			expect(getTexel(table.data, 2, 1, 0, 0)).toEqual([255, 0, 0, 255]);
			expect(getTexel(table.data, 2, 0, 1, 0)).toEqual([0, Math.floor((2000 / 4095) * 255), 0, 255]);
			expect(getTexel(table.data, 2, 0, 0, 1)).toEqual([0, 0, Math.floor((1000 / 4095) * 255), 255]);
			expect(getTexel(table.data, 2, 1, 1, 1)).toEqual([255, Math.floor((2000 / 4095) * 255), Math.floor((1000 / 4095) * 255), 255]);
		});

		test("should return null when the file contains no lookup table", () => {
			expect(_parse3dlLookupTable("# only a comment\n\n")).toBeNull();
		});
	});

	describe("_convert2DLookupTable", () => {
		// 2D lookup texture of size 2 (4 x 2 pixels): each pixel stores its coordinates.
		const size = 2;
		const pixels = new Uint8ClampedArray(size * size * size * 4);
		for (let y = 0; y < size; ++y) {
			for (let x = 0; x < size * size; ++x) {
				pixels.set([x * 10, y * 10, 7, 255], (y * size * size + x) * 4);
			}
		}

		test("should read the slices selected by the green channel from the bottom of the inverted image", () => {
			const table = _convert2DLookupTable(pixels, size, true, true, true);

			for (let blue = 0; blue < size; ++blue) {
				for (let green = 0; green < size; ++green) {
					for (let red = 0; red < size; ++red) {
						expect(getTexel(table.data, size, red, green, blue)).toEqual([(green * size + red) * 10, (size - 1 - blue) * 10, 7, 255]);
					}
				}
			}
		});

		test("should read the slices selected by the blue channel and swap the channels when not stored as RGB", () => {
			const table = _convert2DLookupTable(pixels, size, false, false, false);

			for (let blue = 0; blue < size; ++blue) {
				for (let green = 0; green < size; ++green) {
					for (let red = 0; red < size; ++red) {
						expect(getTexel(table.data, size, red, green, blue)).toEqual([7, green * 10, (blue * size + red) * 10, 255]);
					}
				}
			}
		});
	});
});
