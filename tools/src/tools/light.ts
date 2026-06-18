import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";

import { SceneLoaderQualitySelector } from "../loading/loader";

import { getPowerOfTwoUntil } from "./scalar";

declare module "@babylonjs/core/Lights/Shadows/shadowGenerator" {
	export interface IShadowGenerator {
		originalMapSize?: number;
	}
}

export function configureShadowMapRenderListPredicate(scene: Scene) {
	scene.lights.forEach((light) => {
		const shadowMap = light.getShadowGenerator()?.getShadowMap();
		if (!shadowMap) {
			return;
		}

		shadowMap.renderListPredicate = (mesh) => {
			const distance = Vector3.Distance(mesh.getAbsolutePosition(), light.getAbsolutePosition());
			return distance <= light.range;
		};
	});
}

export async function configureShadowMapRefreshRate(scene: Scene) {
	scene.executeWhenReady(() => {
		scene.lights.forEach((light) => {
			const shadowMap = light.getShadowGenerator()?.getShadowMap();
			if (shadowMap) {
				shadowMap.refreshRate = light.metadata?.refreshRate ?? RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
			}
		});
	});
}

/**
 * Updates the map size of the shadow generators in the scene to match the given quality when possible.
 * @param quality defines the quality to apply to the shadow generators.
 * @param scene defines the scene to update the shadows in.
 * @see `SceneLoaderQualitySelector` for more information on the available quality levels.
 */
export function applyShadowsQuality(quality: SceneLoaderQualitySelector, scene: Scene) {
	scene.lights.forEach((light) => {
		const shadowGenerator = light.getShadowGenerator();
		const shadowMap = shadowGenerator?.getShadowMap();

		if (shadowGenerator?.originalMapSize) {
			let newMapSize = shadowGenerator.originalMapSize;

			switch (quality) {
				case "medium":
					newMapSize = newMapSize * 0.5;
					break;

				case "low":
					newMapSize = newMapSize * 0.25;
					break;

				case "very-low":
					newMapSize = newMapSize * 0.125;
					break;
			}

			newMapSize = Math.max(128, getPowerOfTwoUntil(newMapSize));

			if (shadowMap?.getSize().width !== newMapSize) {
				shadowMap!.resize(newMapSize);
			}
		}
	});

	configureShadowMapRefreshRate(scene);
}
