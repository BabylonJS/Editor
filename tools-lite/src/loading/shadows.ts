import {
	createCsmDirectionalShadowGenerator,
	createEsmDirectionalShadowGenerator,
	createPcfDirectionalShadowGenerator,
	createPcfSpotlightShadowGenerator,
	DirectionalLight,
	LightBase,
	Mesh,
	SceneContext,
	setShadowTaskCasterMeshes,
	ShadowGenerator,
	SpotLight,
} from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";
import { getPowerOfTwoUntil } from "../tools/scalar";
import { isDirectionalLight, isSpotLight, setClassName } from "../tools/guards";

import type { SceneLoaderQualitySelector } from "./loader";

/**
 * Defines the data kept for each shadow generator created from the editor scenes, so it can be created again with
 * another map size when the quality of the shadows changes.
 */
export interface IShadowGeneratorInfo {
	/**
	 * Defines the serialized shadow generator.
	 */
	data: any;
	/**
	 * Defines the map size of the shadow generator as set in the editor.
	 */
	originalMapSize: number;
	/**
	 * Defines the map size of the shadow generator currently used (according to the quality of the shadows).
	 */
	mapSize: number;
	/**
	 * Defines the light casting the shadows.
	 */
	light: LightBase;
	/**
	 * Defines the list of meshes casting shadows.
	 */
	casters: Mesh[];
}

const shadowGeneratorsInfos = new WeakMap<ShadowGenerator, IShadowGeneratorInfo>();

/**
 * Returns the information kept for the given shadow generator created from the editor scenes.
 * @param shadowGenerator defines the reference to the shadow generator.
 */
export function getShadowGeneratorInfo(shadowGenerator: ShadowGenerator): IShadowGeneratorInfo | null {
	return shadowGeneratorsInfos.get(shadowGenerator) ?? null;
}

/**
 * Returns the map size of the shadows for the given quality, the same way the Babylon.js version of the tools does.
 * @param mapSize defines the map size set in the editor.
 * @param quality defines the quality of the shadows.
 */
export function getShadowMapSizeForQuality(mapSize: number, quality: SceneLoaderQualitySelector): number {
	if (quality === "high") {
		return mapSize;
	}

	switch (quality) {
		case "medium":
			mapSize = mapSize * 0.5;
			break;

		case "low":
			mapSize = mapSize * 0.25;
			break;

		case "very-low":
			mapSize = mapSize * 0.125;
			break;
	}

	return Math.max(128, getPowerOfTwoUntil(mapSize));
}

/**
 * Creates the Babylon Lite shadow generator equivalent to the given serialized Babylon.js shadow generator:
 * - cascaded shadow generators of directional lights are created as cascaded shadow maps (CSM).
 * - shadow generators of directional lights are created as exponential shadow maps when they use one of the
 *   exponential modes, or as PCF shadow maps otherwise.
 * - shadow generators of spot lights are created as PCF shadow maps.
 * Babylon Lite doesn't support the shadows of point lights.
 * @param scene defines the reference to the scene where the shadows are.
 * @param light defines the light casting the shadows.
 * @param data defines the serialized shadow generator.
 * @param quality defines the quality of the shadows.
 * @returns the created shadow generator or null if the configuration is not supported.
 */
export function createShadowGenerator(scene: SceneContext, light: LightBase, data: any, quality: SceneLoaderQualitySelector): ShadowGenerator | null {
	const engine = scene.surface.engine;
	const mapSize = getShadowMapSizeForQuality(data.mapSize ?? 1024, quality);

	let shadowGenerator: ShadowGenerator | null = null;

	if (isDirectionalLight(light)) {
		const directionalLight = light as DirectionalLight;

		if (data.className === "CascadedShadowGenerator") {
			shadowGenerator = createCsmDirectionalShadowGenerator(engine, directionalLight, {
				mapSize,
				numCascades: data.numCascades ?? 4,
				lambda: data.lambda ?? 0.5,
				cascadeBlendPercentage: data.cascadeBlendPercentage ?? 0.1,
				stabilizeCascades: data.stabilizeCascades ?? false,
				shadowMaxZ: data.shadowMaxZ ?? undefined,
				bias: data.bias ?? 0.00005,
				darkness: data.darkness ?? 0,
				frustumEdgeFalloff: data.frustumEdgeFalloff ?? 0,
			});
			setClassName(shadowGenerator, "CascadedShadowGenerator");
		} else if (data.useExponentialShadowMap || data.useBlurExponentialShadowMap || data.useCloseExponentialShadowMap || data.useBlurCloseExponentialShadowMap) {
			shadowGenerator = createEsmDirectionalShadowGenerator(engine, directionalLight, {
				mapSize,
				depthScale: data.depthScale ?? 50,
				bias: data.bias ?? 0.00005,
				blurKernel: data.blurKernel ?? 1,
				blurScale: data.blurScale ?? 2,
				darkness: data.darkness ?? 0,
				frustumEdgeFalloff: data.frustumEdgeFalloff ?? 0,
			});
			setClassName(shadowGenerator, "ShadowGenerator");
		} else {
			shadowGenerator = createPcfDirectionalShadowGenerator(engine, directionalLight, {
				mapSize,
				bias: data.bias ?? 0.00005,
				normalBias: data.normalBias ?? 0,
				darkness: data.darkness ?? 0,
			});
			setClassName(shadowGenerator, "ShadowGenerator");
		}
	} else if (isSpotLight(light)) {
		shadowGenerator = createPcfSpotlightShadowGenerator(engine, light as SpotLight, {
			mapSize,
			bias: data.bias ?? 0.00005,
			normalBias: data.normalBias ?? 0,
			darkness: data.darkness ?? 0,
		});
		setClassName(shadowGenerator, "ShadowGenerator");
	} else {
		warnOnce(`light-shadows-${light.name}`, `the shadows of the light "${light.name}" are not supported by Babylon Lite (only directional and spot lights cast shadows).`);
		return null;
	}

	shadowGeneratorsInfos.set(shadowGenerator, {
		data,
		light,
		mapSize,
		casters: [],
		originalMapSize: data.mapSize ?? 1024,
	});

	return shadowGenerator;
}

/**
 * Sets the list of meshes casting shadows for the given shadow generator.
 * @param shadowGenerator defines the reference to the shadow generator.
 * @param casters defines the list of meshes casting shadows.
 */
export function setShadowGeneratorCasters(shadowGenerator: ShadowGenerator, casters: Mesh[]): void {
	const info = shadowGeneratorsInfos.get(shadowGenerator);
	if (info) {
		info.casters = casters.slice();
	}

	setShadowTaskCasterMeshes(shadowGenerator, casters);
}
