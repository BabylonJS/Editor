import { describe, expect, test } from "vitest";

import { AcesToneMapping, NeutralToneMapping } from "@babylonjs/lite";

import { _computeColorCurves, _getMaterialsToneMapping, IColorCurves } from "../../src/rendering/pipeline";
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
