import { Mesh, rebuildSceneRenderables, removeFromScene, SceneContext, ShadowGenerator } from "@babylonjs/lite";

import { SceneLoaderQualitySelector } from "../loading/loader";
import { getSkyMaterialData } from "../loading/material";
import { isPbrSkyboxMaterial } from "../loading/materials/pbr";
import { createShadowGenerator, getShadowGeneratorInfo, getShadowMapSizeForQuality, setShadowGeneratorCasters } from "../loading/shadows";

import { Observer } from "./observable";
import { getSceneData } from "./scene";
import { isGaussianSplattingMesh } from "./guards";
import { distanceVec3, getAbsolutePosition } from "./maths";

/**
 * Defines how many frames apart the meshes casting shadows are evaluated again.
 */
const shadowCastersUpdateInterval = 10;

const shadowCastersObservers = new WeakMap<SceneContext, Observer<SceneContext>>();
const shadowGeneratorsCasters = new WeakMap<ShadowGenerator, readonly Mesh[]>();

function haveSameMeshes(a: readonly Mesh[], b: readonly Mesh[]): boolean {
	if (a.length !== b.length) {
		return false;
	}

	for (let i = 0, count = a.length; i < count; ++i) {
		if (a[i] !== b[i]) {
			return false;
		}
	}

	return true;
}

/**
 * Returns wether or not the given mesh can cast shadows. The skyboxes (meshes using a sky material or a PBR skybox
 * material) are excluded: in Babylon.js their faces are seen from the inside and are culled when rendered from the
 * light, while in Babylon Lite their huge bounds would break the fitting of the cascaded shadow maps.
 */
export function isShadowCasterCandidate(mesh: Mesh): boolean {
	return !isGaussianSplattingMesh(mesh) && !(mesh.material && (getSkyMaterialData(mesh.material) || isPbrSkyboxMaterial(mesh.material)));
}

function updateShadowCasters(scene: SceneContext): void {
	for (const light of scene.lights) {
		const shadowGenerator = light.shadowGenerator;
		if (!shadowGenerator) {
			continue;
		}

		const range = (light as { range?: number }).range ?? Number.MAX_VALUE;
		const lightPosition = getAbsolutePosition(light);

		const casters: Mesh[] = [];
		for (const mesh of scene.meshes) {
			if (!isShadowCasterCandidate(mesh)) {
				continue;
			}

			if (range !== Number.MAX_VALUE && distanceVec3(getAbsolutePosition(mesh), lightPosition) > range) {
				continue;
			}

			casters.push(mesh);
		}

		const currentCasters = shadowGeneratorsCasters.get(shadowGenerator) ?? getShadowGeneratorInfo(shadowGenerator)?.casters;
		if (currentCasters && haveSameMeshes(currentCasters, casters)) {
			continue;
		}

		shadowGeneratorsCasters.set(shadowGenerator, casters);
		setShadowGeneratorCasters(shadowGenerator, casters);
	}
}

/**
 * Configures the meshes casting shadows the same way the Babylon.js version of the tools does with a render list
 * predicate: all the meshes of the scene within the range of the light cast shadows (the render list saved in the
 * editor is replaced). Babylon.js evaluates the predicate each time the shadow map is rendered: the tools evaluate it
 * every few frames and give the new list of casters to Babylon Lite only when it changed.
 * @param scene defines the reference to the scene.
 */
export function configureShadowMapRenderListPredicate(scene: SceneContext) {
	shadowCastersObservers.get(scene)?.remove();

	updateShadowCasters(scene);

	let frame = 0;
	const observer = getSceneData(scene).onBeforeRenderObservable.add(() => {
		if (++frame % shadowCastersUpdateInterval === 0) {
			updateShadowCasters(scene);
		}
	});

	shadowCastersObservers.set(scene, observer);
}

/**
 * Babylon Lite renders the shadow maps only when the casters or the lights move: the refresh rate configured in the
 * editor is not used. This function is kept for compatibility with the Babylon.js version of the tools and does nothing.
 * @param scene defines the reference to the scene.
 */
export async function configureShadowMapRefreshRate(scene: SceneContext) {
	void scene;
}

/**
 * Updates the map size of the shadow generators in the scene to match the given quality when possible.
 * Babylon Lite shadow maps can't be resized: the shadow generators which map size changes are created again and
 * the scene renderables are rebuilt.
 * @param quality defines the quality to apply to the shadow generators.
 * @param scene defines the scene to update the shadows in.
 * @see `SceneLoaderQualitySelector` for more information on the available quality levels.
 */
export async function applyShadowsQuality(quality: SceneLoaderQualitySelector, scene: SceneContext) {
	let changed = false;

	getSceneData(scene).lights.forEach((light: any) => {
		const shadowGenerator = light.shadowGenerator;
		const info = shadowGenerator ? getShadowGeneratorInfo(shadowGenerator) : null;

		if (!info || getShadowMapSizeForQuality(info.originalMapSize, quality) === info.mapSize) {
			return;
		}

		const newShadowGenerator = createShadowGenerator(scene, info.light, info.data, quality);
		if (!newShadowGenerator) {
			return;
		}

		removeFromScene(scene, shadowGenerator);

		light.shadowGenerator = newShadowGenerator;
		setShadowGeneratorCasters(newShadowGenerator, info.casters);

		changed = true;
	});

	scene.loadingShadowsQuality = quality;

	if (changed) {
		await rebuildSceneRenderables(scene);
	}
}
