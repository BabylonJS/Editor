import { describe, expect, test } from "vitest";

import { _getPbrTransparencyMode, isPbrSkyboxData, isPbrSkyboxMaterial, parsePbrMaterial } from "../../src/loading/materials/pbr";

import { createTestScene } from "../helpers";

describe("loading/materials/pbr", () => {
	describe("specular-glossiness workflow", () => {
		test("should create a mirror for the default PBR materials of the editor (white reflectivity, micro surface 1)", () => {
			const { scene } = createTestScene();
			const { material } = parsePbrMaterial(scene, "", { name: "default" });

			expect(material.metallicFactor).toBe(0);
			expect(material.roughnessFactor).toBe(0);
			expect(material.reflectance).toBe(1);
		});

		test("should use the gray reflectivity as reflectance and the micro surface as glossiness", () => {
			const { scene } = createTestScene();
			const { material } = parsePbrMaterial(scene, "", { name: "gray", reflectivity: [0.5, 0.5, 0.5], microSurface: 0.6 });

			expect(material.metallicFactor).toBe(0);
			expect(material.roughnessFactor).toBeCloseTo(0.4, 6);
			expect(material.reflectance).toBe(0.5);
		});

		test("should keep the metallic workflow when the metallic or roughness values are set", () => {
			const { scene } = createTestScene();
			const { material } = parsePbrMaterial(scene, "", { name: "metallic", metallic: 0.3, roughness: 0.6, reflectivity: [0.5, 0.5, 0.5] });

			expect(material.metallicFactor).toBe(0.3);
			expect(material.roughnessFactor).toBe(0.6);
			expect(material.reflectance).toBeUndefined();
		});
	});

	describe("_getPbrTransparencyMode", () => {
		test("should return the transparency mode saved with the material", () => {
			expect(_getPbrTransparencyMode({ transparencyMode: 0, alpha: 0.5 })).toBe(0);
			expect(_getPbrTransparencyMode({ transparencyMode: 2 })).toBe(2);
		});

		test("should compute the transparency mode as Babylon.js does when no mode is saved", () => {
			expect(_getPbrTransparencyMode({})).toBe(0);
			expect(_getPbrTransparencyMode({ alpha: 0.5 })).toBe(2);
			expect(_getPbrTransparencyMode({ albedoTexture: { hasAlpha: true } })).toBe(1);
			// No alpha test when the material is blended.
			expect(_getPbrTransparencyMode({ albedoTexture: { hasAlpha: true }, useAlphaFromAlbedoTexture: true })).toBe(2);
			expect(_getPbrTransparencyMode({ albedoTexture: { hasAlpha: true }, alpha: 0.5 })).toBe(2);
			expect(_getPbrTransparencyMode({ opacityTexture: { name: "opacity.png" } })).toBe(2);
		});
	});

	describe("lighting", () => {
		test("should only disable the lights (not the image based lighting) of the materials with disabled lighting", () => {
			const { scene } = createTestScene();
			const { material } = parsePbrMaterial(scene, "", { name: "no-lights", metallic: 0, roughness: 1, disableLighting: true });

			expect(material.directIntensity).toBe(0);
			expect((material as { _unlit?: boolean })._unlit).toBeUndefined();
		});

		test("should make the unlit materials unlit", () => {
			const { scene } = createTestScene();
			const { material } = parsePbrMaterial(scene, "", { name: "unlit", metallic: 0, roughness: 1, unlit: true });

			expect((material as { _unlit?: boolean })._unlit).toBe(true);
		});
	});

	describe("image processing", () => {
		const parseImageProcessing = (configuration?: any) => {
			const { scene } = createTestScene();
			const { material } = parsePbrMaterial(scene, "", { name: "ip", metallic: 0, roughness: 1, _imageProcessingConfiguration: configuration });

			return material.plugins?.find((plugin) => plugin.name === "EditorMaterialImageProcessing") ?? null;
		};

		test("should use the image processing of the scene for the materials without their own configuration", () => {
			expect(parseImageProcessing()).toBeNull();
		});

		test("should apply the image processing configuration of the materials as Babylon.js does", () => {
			// Mode (0 by a post-process, 1 by the material, 2 disabled), exposure, contrast and "TONEMAPPING" define.
			const readMaterialUniforms = (configuration: any) => {
				const plugin = parseImageProcessing(configuration)!;
				const fields = plugin.getUniforms!().ubo!;
				const offsets = new Map(fields.map((field, index) => [field.name, index * 16]));
				const data = new Float32Array(fields.length * 4);

				plugin.writeUbo!(data, offsets);

				const offset = offsets.get("editorIpMaterial")! / 4;
				return Array.from(data.subarray(offset, offset + 4));
			};

			expect(readMaterialUniforms({ _isEnabled: true, _applyByPostProcess: false, _exposure: 1.25, _contrast: 1.5, _toneMappingEnabled: true, _toneMappingType: 1 })).toEqual(
				[1, 1.25, 1.5, 2]
			);
			expect(readMaterialUniforms({ _isEnabled: true, _applyByPostProcess: true, _exposure: 1, _contrast: 1 })).toEqual([0, 1, 1, 0]);
			expect(readMaterialUniforms({ _isEnabled: false })).toEqual([2, 1, 1, 0]);
		});

		test("should capture the linear color of the material before the image processing of Babylon Lite", () => {
			const code = parseImageProcessing({ _applyByPostProcess: false })!.getCustomCode!("fragment")!;

			expect(code.CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION).toBe("editorIpLinearColor = color;");
			expect(code.CUSTOM_FRAGMENT_DEFINITIONS).toContain("fn editorIpInverseScene(");
			expect(code.CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR).toContain("editorIpApplyFog(editorIpLinearColor, input.worldPos)");
		});
	});

	describe("skybox", () => {
		test("should detect the skybox materials created by scene.createDefaultSkybox", () => {
			expect(isPbrSkyboxData({ reflectionTexture: { isCube: true, coordinatesMode: 5 } })).toBe(true);
			expect(isPbrSkyboxData({ reflectionTexture: { isCube: true, coordinatesMode: 3 } })).toBe(false);
			expect(isPbrSkyboxData({})).toBe(false);

			const { scene } = createTestScene();
			const { material } = parsePbrMaterial(scene, "", {
				name: "skyBox",
				microSurface: 0.7,
				disableLighting: true,
				backFaceCulling: false,
				reflectionTexture: { name: "assets/environment.env", isCube: true, coordinatesMode: 5 },
			});

			expect(isPbrSkyboxMaterial(material)).toBe(true);
			expect(material.roughnessFactor).toBeCloseTo(0.3, 6);
			expect(material.reflectance).toBe(1);
		});
	});
});
