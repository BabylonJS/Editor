import { Light, Vector3 } from "babylonjs";

import { isPointLight } from "../guards/nodes";

/**
 * Updates the shadow map render list predicate of the given point light.
 * Will basically filter out meshes that are too far from the light according to
 * the current light's `range` value.
 * @param light defines the reference to the point light to configure.
 */
export function updatePointLightShadowMapRenderListPredicate(light: Light): void {
    if (!isPointLight(light)) {
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
