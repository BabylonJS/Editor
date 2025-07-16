import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { RenderTargetTexture } from "@babylonjs/core/Materials/Textures/renderTargetTexture";

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
