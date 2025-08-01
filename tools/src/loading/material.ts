import { Scene } from "@babylonjs/core/scene";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Material } from "@babylonjs/core/Materials/material";

import { isInstancedMesh } from "../tools/guards";

/**
 * Loads the file located at `rootUrl + relativePath` and creates a new material from it.
 * @param rootUrl defines the absolute root url for the assets. (generally "/scene/")
 * @param relativePath defines the path relative to `rootUrl` for the material file
 * @param scene defines the reference to the scene where to add the loaded material.
 * @returns the reference to the created material.
 * @example await loadMaterialFromFile<PBRMaterial>("/scene/", "assets/floor.material", scene);
 */
export async function loadMaterialFromFile<T extends Material>(rootUrl: string, relativePath: string, scene: Scene): Promise<T> {
	const response = await fetch(rootUrl + relativePath);
	const data = await response.json();

	const ctor = Tools.Instantiate(data.customType);
	const material = ctor.Parse(data, scene, rootUrl);

	material.id = data.id;
	material.uniqueId = data.uniqueId;

	return material;
}

/**
 * Force compile all materials of the given scene.
 * This is useful to ensure that all materials are compiled and ready to use to avoid lag.
 * @param scene The scene to force compile all materials
 */
export function forceCompileAllSceneMaterials(scene: Scene) {
	return Promise.all(
		scene.materials.map(async (material) => {
			const meshes = material.getBindedMeshes();

			await Promise.all(
				meshes.map(async (mesh) => {
					if (isInstancedMesh(mesh)) {
						return;
					}

					await material.forceCompilationAsync(mesh, {
						clipPlane: !!scene.clipPlane,
						useInstances: mesh.hasInstances,
					});
				})
			);
		})
	);
}
