import { describe, expect, test } from "vitest";

import { AcesToneMapping, NeutralToneMapping } from "@babylonjs/lite";

import { _applyImageProcessingToColor, _computeColorCurves, _getMaterialsToneMapping, IColorCurves } from "../../src/rendering/pipeline";
import { getSkySunPosition, ISkyMaterialProperties } from "../../src/loading/materials/sky";

import { createTestScene } from "../helpers";

const defaultCurves: IColorCurves = {
	globalHue: 30,
	globalDensity: 0,
	globalExposure: 0,
	globalSaturation: 0,
	highlightsHue: 30,
	highlightsDensity: 0,
	highlightsExposure: 0,
	highlightsSaturation: 0,
	midtonesHue: 30,
	midtonesDensity: 0,
	midtonesExposure: 0,
	midtonesSaturation: 0,
	shadowsHue: 30,
	shadowsDensity: 0,
	shadowsExposure: 0,
	shadowsSaturation: 0,
};

describe("rendering/pipeline", () => {
	describe("_getMaterialsToneMapping", () => {
		test("should return the value of the TONEMAPPING define of Babylon.js for the tone mapping of the materials", () => {
			const { scene } = createTestScene();
			expect(_getMaterialsToneMapping(scene)).toBe(0);

			scene.imageProcessing.toneMappingEnabled = true;
			expect(_getMaterialsToneMapping(scene)).toBe(1);

			scene.imageProcessing.toneMapping = AcesToneMapping;
			expect(_getMaterialsToneMapping(scene)).toBe(2);

			scene.imageProcessing.toneMapping = NeutralToneMapping;
			expect(_getMaterialsToneMapping(scene)).toBe(3);
		});
	});

	describe("_computeColorCurves", () => {
		test("should compute neutral curves for the default values (same as Babylon.js ColorCurves)", () => {
			const curves = _computeColorCurves(defaultCurves);

			curves.neutral.forEach((value) => expect(value).toBeCloseTo(1, 5));
			curves.positive.forEach((value) => expect(value).toBeCloseTo(0, 5));
			curves.negative.forEach((value) => expect(value).toBeCloseTo(0, 5));
		});

		test("should tint the highlights", () => {
			const curves = _computeColorCurves({ ...defaultCurves, highlightsHue: 0, highlightsDensity: 100 });

			// Red highlights: the highlights curve is (1, 0.5, 0.5, 1), the positive curve removes green and blue.
			expect(curves.positive[0]).toBeCloseTo(0, 5);
			expect(curves.positive[1]).toBeCloseTo(-0.5, 5);
			expect(curves.positive[2]).toBeCloseTo(-0.5, 5);
			expect(curves.positive[3]).toBeCloseTo(0, 5);
		});
	});

	describe("_applyImageProcessingToColor", () => {
		const identity = { exposure: 1, contrast: 1, toneMappingEnabled: false, toneMappingType: 0 };

		test("should only convert the color to gamma space when the image processing has no effect", () => {
			const color = _applyImageProcessingToColor([0.2, 0.5, 1], identity);

			expect(color[0]).toBeCloseTo(Math.pow(0.2, 1 / 2.2), 6);
			expect(color[1]).toBeCloseTo(Math.pow(0.5, 1 / 2.2), 6);
			expect(color[2]).toBeCloseTo(1, 6);
		});

		test("should apply the exposure and the contrast as Babylon.js does", () => {
			const exposed = _applyImageProcessingToColor([0.1, 0.1, 0.1], { ...identity, exposure: 2 });
			expect(exposed[0]).toBeCloseTo(Math.pow(0.2, 1 / 2.2), 6);

			const gamma = Math.pow(0.2, 1 / 2.2);

			const highContrast = _applyImageProcessingToColor([0.2, 0.2, 0.2], { ...identity, contrast: 1.5 });
			expect(highContrast[0]).toBeCloseTo(gamma + (gamma * gamma * (3 - 2 * gamma) - gamma) * 0.5, 6);

			const lowContrast = _applyImageProcessingToColor([0.2, 0.2, 0.2], { ...identity, contrast: 0.5 });
			expect(lowContrast[0]).toBeCloseTo(0.5 + (gamma - 0.5) * 0.5, 6);
		});

		test("should apply the tone mappings of Babylon.js", () => {
			// Standard: 1 - 2^(-1.590579 * x).
			const standard = _applyImageProcessingToColor([1, 1, 1], { ...identity, toneMappingEnabled: true, toneMappingType: 0 });
			expect(standard[0]).toBeCloseTo(Math.pow(1 - Math.pow(2, -1.590579), 1 / 2.2), 6);

			// ACES and neutral keep black and saturate the bright colors.
			const acesBlack = _applyImageProcessingToColor([0, 0, 0], { ...identity, toneMappingEnabled: true, toneMappingType: 1 });
			acesBlack.forEach((value) => expect(value).toBeCloseTo(0, 6));

			const acesBright = _applyImageProcessingToColor([100, 100, 100], { ...identity, toneMappingEnabled: true, toneMappingType: 1 });
			acesBright.forEach((value) => expect(value).toBeCloseTo(1, 2));

			const neutralDark = _applyImageProcessingToColor([0.5, 0.5, 0.5], { ...identity, toneMappingEnabled: true, toneMappingType: 2 });
			neutralDark.forEach((value) => expect(value).toBeCloseTo(Math.pow(0.5 - 0.04, 1 / 2.2), 6));
		});
	});

	describe("getSkySunPosition", () => {
		test("should compute the position of the sun the same way Babylon.js SkyMaterial does", () => {
			const properties: ISkyMaterialProperties = {
				luminance: 1,
				turbidity: 10,
				rayleigh: 2,
				mieCoefficient: 0.005,
				mieDirectionalG: 0.8,
				distance: 500,
				inclination: 0.2,
				azimuth: 0.25,
				useSunPosition: false,
				sunPosition: { x: 0, y: 100, z: 0 },
				cameraOffset: { x: 0, y: 0, z: 0 },
				up: { x: 0, y: 1, z: 0 },
				cloudiness: 0,
			};

			// Value saved by Babylon.js in the scene files for these parameters.
			const position = getSkySunPosition(properties);
			expect(position[0]).toBeCloseTo(0, 4);
			expect(position[1]).toBeCloseTo(404.5084971874737, 4);
			expect(position[2]).toBeCloseTo(-293.8926261462366, 4);

			expect(getSkySunPosition({ ...properties, useSunPosition: true, sunPosition: { x: 1, y: 2, z: 3 } })).toEqual([1, 2, 3]);
		});
	});
});
