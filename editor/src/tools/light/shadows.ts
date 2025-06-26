import { Light, RenderTargetTexture, Scene, Vector3 } from "babylonjs";

import { isPointLight, isSpotLight } from "../guards/nodes";

/**
 * Updates the shadow map render list predicate of the given point light.
 * Will basically filter out meshes that are too far from the light according to
 * the current light's `range` value.
 * @param light defines the reference to the point light to configure.
 */
export function updatePointLightShadowMapRenderListPredicate(light: Light): void {
	if (!isPointLight(light) && !isSpotLight(light)) {
		return;
	}

	const shadowMap = light.getShadowGenerator()?.getShadowMap();
	if (!shadowMap) {
		return;
	}

	shadowMap.renderListPredicate = (mesh) => {
		const distance = Vector3.Distance(mesh.getAbsolutePosition(), light.getAbsolutePosition());
		return distance <= light.range;
	};
}

/**
 * In case the light has a refresh rate of 0, let's update them to reset refresh rate to
 * 0 in order to re-trigger a render of the shadow map. This is typically used when a light is moved in the editor.
 * @param light defines the reference to the light to configure.
 */
export function updateLightShadowMapRefreshRate(light: Light): void {
	const shadowMap = light.getShadowGenerator()?.getShadowMap();
	if (!shadowMap) {
		return;
	}

	if (shadowMap.refreshRate === RenderTargetTexture.REFRESHRATE_RENDER_ONCE) {
		shadowMap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
	}
}

/**
 * Updates all the lights properties (shadow maps, list predicates etc.).
 * @param scene defines the reference to the scene that contains all lights to update.
 */
export function updateAllLights(scene: Scene) {
	scene.lights.forEach((light) => {
		updateLightShadowMapRefreshRate(light);
		updatePointLightShadowMapRenderListPredicate(light);
	});
}
