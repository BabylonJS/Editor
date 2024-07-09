import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

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
