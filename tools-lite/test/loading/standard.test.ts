import { describe, expect, test } from "vitest";

import { _getStandardTransparencyMode, parseStandardMaterial } from "../../src/loading/materials/standard";

import { createTestScene } from "../helpers";

describe("loading/materials/standard", () => {
	describe("_getStandardTransparencyMode", () => {
		test("should return the transparency mode saved with the material", () => {
			expect(_getStandardTransparencyMode({ transparencyMode: 0, alpha: 0.5 })).toBe(0);
			expect(_getStandardTransparencyMode({ transparencyMode: 3 })).toBe(3);
		});

		test("should compute the transparency mode as Babylon.js does when no mode is saved", () => {
			expect(_getStandardTransparencyMode({})).toBe(0);
			expect(_getStandardTransparencyMode({ alpha: 0.5 })).toBe(2);
			expect(_getStandardTransparencyMode({ diffuseTexture: { hasAlpha: true } })).toBe(1);
			// No alpha test when the material is blended.
			expect(_getStandardTransparencyMode({ diffuseTexture: { hasAlpha: true }, useAlphaFromDiffuseTexture: true })).toBe(2);
			expect(_getStandardTransparencyMode({ opacityTexture: { name: "opacity.png" } })).toBe(2);
		});
	});

	describe("parseStandardMaterial", () => {
		test("should not blend the materials which transparency mode is opaque", () => {
			const { scene } = createTestScene();

			expect(parseStandardMaterial(scene, "", { transparencyMode: 0, alpha: 0.5 }, [0, 0, 0]).material.alpha).toBe(1);
			expect(parseStandardMaterial(scene, "", { alpha: 0.5 }, [0, 0, 0]).material.alpha).toBe(0.5);
		});

		test("should output the same color as Babylon.js when the lighting is disabled", () => {
			const { scene } = createTestScene();
			const { material } = parseStandardMaterial(scene, "", { diffuse: [0.2, 0, 0], emissive: [0.9, 0.5, 0.1], ambient: [1, 1, 1], disableLighting: true }, [0.1, 0.1, 0.1]);

			// Babylon.js: clamp(diffuse + emissive + ambient), Babylon Lite: clamp(emissive * diffuse).
			expect(material.diffuseColor[0]).toBeCloseTo(1, 6);
			expect(material.diffuseColor[1]).toBeCloseTo(0.6, 6);
			expect(material.diffuseColor[2]).toBeCloseTo(0.2, 6);
			expect(material.emissiveColor).toEqual([1, 1, 1]);
		});
	});
});
