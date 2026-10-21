import { describe, expect, test } from "vitest";

import { createFreeCamera, getViewProjectionMatrix, SceneNode } from "@babylonjs/lite";

import { getSceneData } from "../../src/tools/scene";
import { parseLight } from "../../src/loading/light";

import { buildWGSLEffectShader, preprocessWGSL } from "../../src/rendering/wgsl";
import {
	buildVolumetricLightingBlurShaderWGSL,
	buildVolumetricLightingComposeShaderWGSL,
	buildVolumetricLightingScatteringShaderWGSL,
	buildVolumetricLightingTemporalShaderWGSL,
} from "../../src/rendering/volumetric/shaders";
import { computeVolumetricBudget, getVolumetricLightScaledIntensity, selectVolumetricLights } from "../../src/rendering/volumetric/selector";
import { getDefaultVolumetricLightingConfiguration, maxVolumetricShadowSlots, normalizeVolumetricLightingConfiguration } from "../../src/rendering/volumetric/types";

import { createTestScene } from "../helpers";

const scatteringDefines = {
	VOL_STEPS: 8,
	VOL_LIGHT_STEPS: 4,
	VOL_LOCAL_MAX_STEPS: 8,
	VOL_DISTRIBUTION: 1,
	VOL_DITHER: 2,
	VOL_PCF_TAPS: 4,
	VOL_FOG_MODE: 0,
	VOL_TRANSMITTANCE: 0,
	VOL_OPTICAL_DEPTH: true,
	VOL_TRANSMITTANCE_SAMPLES: 32,
	VOL_DEBUG: 0,
	VOL_MAX_ARRAY_LIGHTS: 128,
	VOL_DIRECTIONAL_LIGHT_COUNT: 1,
	VOL_LOCAL_ARRAY_LIGHTS: 1,
	VOL_SHADOW_SLOT_COUNT: 2,
	VOL_GLOBAL_LIGHT_COUNT: 3,
	VOL_TEMPORAL_ACCUMULATION: true,
	VOL_LIGHT_EXTINCTION: true,
	VOL_SCREEN_SHADOWS: true,
	VOL_SCREEN_SHADOW_STEPS: 6,
	VOL_SHADOW_KIND0: 1,
	VOL_SHADOW_MODE0: 0,
	VOL_SHADOW_LOCAL0: 1,
	VOL_SHADOW_KIND1: 0,
	VOL_SHADOW_MODE1: 1,
	VOL_SHADOW_LOCAL1: 0,
	VOL_CSM: true,
	VOL_CSM_CASCADES: 4,
};

function createVolumetricLight(data: any) {
	return parseLight({ name: "light", id: data.name, uniqueId: data.uniqueId, metadata: { volumetricLighting: { enabled: true } }, ...data })!;
}

describe("rendering/volumetric", () => {
	describe("shaders", () => {
		test("should build every pass for the defines the pipeline uses", () => {
			const scattering = buildWGSLEffectShader(preprocessWGSL(buildVolumetricLightingScatteringShaderWGSL(maxVolumetricShadowSlots), scatteringDefines));

			expect(scattering.fragmentWGSL).not.toMatch(/^\s*#/m);
			expect(scattering.fragmentWGSL).toContain("fn effectFragment(input: VertexOutput)");
			expect(scattering.fragmentWGSL).toContain("volLightData: array<vec4f,128>,");
			expect(scattering.bindings.map((binding) => binding.name)).toEqual([
				"uniforms",
				"volLinearDepthTexture",
				"volCsmSampler",
				"volShadowSampler0",
				"volShadowSampler1",
				"volCsmSamplerSampler",
				"volShadowSampler0Sampler",
				"volShadowSampler1Sampler",
			]);

			expect(scattering.bindings.find((binding) => binding.name === "volShadowSampler0")?.textureSampleType).toBe("depth");
			expect(scattering.bindings.find((binding) => binding.name === "volShadowSampler1")?.textureSampleType).toBe("float");
			expect(scattering.bindings.find((binding) => binding.name === "volCsmSampler")?.viewDimension).toBe("2d-array");

			[buildVolumetricLightingTemporalShaderWGSL(), buildVolumetricLightingBlurShaderWGSL(), buildVolumetricLightingComposeShaderWGSL()].forEach((source) => {
				[0, 1, 2, 3].forEach((toneMapping) => {
					const shader = buildWGSLEffectShader(preprocessWGSL(source, { VOL_BLUR_RADIUS: 3, VOL_DEBUG: 0, VOL_TONEMAPPING: toneMapping }));

					expect(shader.fragmentWGSL).not.toMatch(/^\s*#/m);
					expect(shader.uniforms).not.toBeNull();
				});
			});
		});

		test("should build the scattering pass without any light", () => {
			const shader = buildWGSLEffectShader(
				preprocessWGSL(buildVolumetricLightingScatteringShaderWGSL(maxVolumetricShadowSlots), {
					...scatteringDefines,
					VOL_MAX_ARRAY_LIGHTS: 0,
					VOL_DIRECTIONAL_LIGHT_COUNT: 0,
					VOL_LOCAL_ARRAY_LIGHTS: 0,
					VOL_SHADOW_SLOT_COUNT: 0,
					VOL_GLOBAL_LIGHT_COUNT: 0,
					VOL_CSM: false,
				})
			);

			expect(shader.bindings.map((binding) => binding.name)).toEqual(["uniforms", "volLinearDepthTexture"]);
			expect(shader.uniforms!.fields.has("volLightData")).toBe(false);
		});
	});

	describe("selector", () => {
		test("should scale the intensity of the lights as Babylon.js does", () => {
			expect(getVolumetricLightScaledIntensity(createVolumetricLight({ type: 0, intensity: 2 }))).toBe(2);
			expect(getVolumetricLightScaledIntensity(createVolumetricLight({ type: 0, intensity: 2, intensityMode: 1 }))).toBeCloseTo(2 / (4 * Math.PI), 6);
			expect(getVolumetricLightScaledIntensity(createVolumetricLight({ type: 2, intensity: 2, intensityMode: 4, radius: 3 }))).toBe(18);
			expect(getVolumetricLightScaledIntensity(createVolumetricLight({ type: 0, intensity: 2, intensityMode: 3 }))).toBe(0);
			expect(getVolumetricLightScaledIntensity(createVolumetricLight({ type: 1, intensity: 2, direction: [0, -1, 0] }))).toBe(2);
		});

		test("should compute the budget from the configuration", () => {
			const configuration = getDefaultVolumetricLightingConfiguration();
			const budget = computeVolumetricBudget(null, configuration);

			expect(budget.maxShadowSlots).toBe(configuration.maxShadowedLights);
			expect(budget.maxArrayLights).toBe(configuration.maxLights);
			expect(budget.allowCsm).toBe(true);
		});

		test("should select the lights visible by the camera and explain why the others are not", () => {
			const { scene } = createTestScene();

			const camera = createFreeCamera({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
			camera.nearPlane = 0.1;
			camera.farPlane = 1000;

			const visible = createVolumetricLight({ name: "visible", uniqueId: 1, type: 0, position: [0, 0, 50], range: 10 });
			const behind = createVolumetricLight({ name: "behind", uniqueId: 2, type: 0, position: [0, 0, -50], range: 10 });
			const disabled = createVolumetricLight({ name: "disabled", uniqueId: 3, type: 0, position: [0, 0, 50], intensity: 0 });
			const notVolumetric = parseLight({ name: "regular", id: "regular", uniqueId: 4, type: 0, position: [0, 0, 50] })!;

			getSceneData(scene).lights.push(visible as SceneNode, behind as SceneNode, disabled as SceneNode, notVolumetric as SceneNode);

			const configuration = normalizeVolumetricLightingConfiguration({});
			const budget = computeVolumetricBudget(null, configuration);
			const selection = selectVolumetricLights(scene, camera, getViewProjectionMatrix(camera, 1), configuration, budget, null);

			expect(selection.unshadowed.map((candidate) => candidate.light)).toEqual([visible]);
			expect(selection.shadowed).toEqual([]);
			expect(selection.stats.candidateCount).toBe(3);
			expect(selection.stats.perLight.get(2)?.state).toBe("culled");
			expect(selection.stats.perLight.get(3)?.state).toBe("disabled");
			expect(selection.stats.perLight.has(4)).toBe(false);
		});
	});
});
