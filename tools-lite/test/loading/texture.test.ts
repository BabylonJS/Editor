import { describe, expect, test } from "vitest";

import { srgbByteToLinear } from "@babylonjs/lite";

import { isSerializedTextureInGammaSpace, isSerializedTextureInSrgbBuffer } from "../../src/loading/texture";
import { getColorTextureRepack } from "../../src/loading/materials/repack";

/**
 * Returns the pixels (RGBA) containing every value in the red, green and blue channels.
 */
function createAllValuesPixels(): Uint8ClampedArray {
	const pixels = new Uint8ClampedArray(256 * 4);
	for (let i = 0; i < 256; ++i) {
		pixels.set([i, i, 255 - i, 255 - i], i * 4);
	}

	return pixels;
}

/**
 * Returns the linear value Babylon Lite reads from the given byte: decoded by the GPU for the sRGB textures, then by its
 * shaders with the approximated sRGB curve when they decode the texture.
 */
function readWithBabylonLite(value: number, srgb: boolean, shaderDecodesGamma: boolean): number {
	const decoded = srgb ? srgbByteToLinear(value) : value / 255;
	return shaderDecodesGamma ? Math.pow(decoded, 2.2) : decoded;
}

describe("loading/texture", () => {
	describe("color decoding", () => {
		test("should detect the textures Babylon.js loads in a sRGB buffer or decodes in its shaders", () => {
			expect(isSerializedTextureInSrgbBuffer({ gammaSpace: false, _useSRGBBuffer: true })).toBe(true);
			expect(isSerializedTextureInSrgbBuffer({ gammaSpace: true })).toBe(false);

			expect(isSerializedTextureInGammaSpace({ gammaSpace: true })).toBe(true);
			expect(isSerializedTextureInGammaSpace({})).toBe(true);
			expect(isSerializedTextureInGammaSpace({ gammaSpace: false })).toBe(false);
			// Babylon.js considers the textures loaded in a sRGB buffer in linear space.
			expect(isSerializedTextureInGammaSpace({ gammaSpace: true, _useSRGBBuffer: true })).toBe(false);
		});

		test("should repack the color textures so Babylon Lite decodes them as Babylon.js does", () => {
			const cases = [
				{ data: { gammaSpace: true }, decode: (value: number) => Math.pow(value / 255, 2.2) },
				{ data: { gammaSpace: false, _useSRGBBuffer: true }, decode: (value: number) => srgbByteToLinear(value) },
				{ data: { gammaSpace: false }, decode: (value: number) => value / 255 },
			];

			cases.forEach(({ data, decode }) => {
				[false, true].forEach((shaderDecodesGamma) => {
					const { repack, srgb } = getColorTextureRepack(data, shaderDecodesGamma);

					const pixels = createAllValuesPixels();
					repack?.(pixels, { scene: null!, width: 256, height: 1, rootUrl: "", quality: "high" });

					for (let i = 0; i < 256; ++i) {
						const stored = pixels[i * 4];
						const read = (value: number) => readWithBabylonLite(Math.max(0, Math.min(255, value)), srgb, shaderDecodesGamma);

						// Quantized to 8 bits in the repacked texture: within one step of the value Babylon.js decodes.
						const step = Math.max(read(stored + 1) - read(stored), read(stored) - read(stored - 1));
						expect(Math.abs(read(stored) - decode(i))).toBeLessThanOrEqual(step + 1e-7);
					}

					// The alpha channel is not a color.
					for (let i = 0; i < 256; ++i) {
						expect(pixels[i * 4 + 3]).toBe(255 - i);
					}
				});
			});
		});

		test("should use the textures as they are when Babylon Lite decodes them as Babylon.js does", () => {
			expect(getColorTextureRepack({ gammaSpace: true }, true)).toEqual({ repack: null, srgb: false });
			expect(getColorTextureRepack({ gammaSpace: false, _useSRGBBuffer: true }, false)).toEqual({ repack: null, srgb: true });
			expect(getColorTextureRepack({ gammaSpace: false }, false)).toEqual({ repack: null, srgb: false });
		});
	});
});
