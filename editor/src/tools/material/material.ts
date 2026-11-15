import { Material, NodeMaterial, Scene } from "babylonjs";

import { isInstancedMesh } from "../guards/nodes";
import { isNodeMaterial, isPBRMaterial, isStandardMaterial } from "../guards/material";

/**
 * Configures the given material to receive up to 32 lights simultaneously.
 * @param material defines the reference to the material to configure.
 */
export function configureSimultaneousLightsForMaterial(material: Material) {
	if (isPBRMaterial(material) || isStandardMaterial(material) || isNodeMaterial(material)) {
		material.maxSimultaneousLights = 8;
	}
}

/**
 * Force compile all materials of the given scene.
 * This is useful to ensure that all materials are compiled and ready to use to avoid lag in the editor.
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

					try {
						await material.forceCompilationAsync(mesh, {
							clipPlane: !!scene.clipPlane,
							useInstances: mesh.hasInstances,
						});
					} catch (e) {
						console.error(`Failed to force compile material ${material.name} for mesh ${mesh.name}:`, e);
					}
				})
			);
		})
	);
}

/**
 * Normalizes the unique IDs of the nodes in the given Node Material based on the provided material data.
 * This allows to get ids not modified after reloading the material to be git-compliant.
 */
export function normalizeNodeMaterialUniqueIds(material: NodeMaterial, materialData: any) {
	material.editorData = materialData.editorData;
	material.attachedBlocks.forEach((block, index) => {
		const oldUniqueId = block.uniqueId;
		const newUniqueId = materialData.blocks[index].id;

		material.editorData?.locations?.forEach((location) => {
			if (location.blockId === oldUniqueId) {
				location.blockId = newUniqueId;
			}
		});

		for (const key in material.editorData?.map ?? {}) {
			if (!material.editorData?.map.hasOwnProperty(key)) {
				continue;
			}

			const value = material.editorData.map[key];
			if (value === oldUniqueId) {
				material.editorData.map[key] = newUniqueId;
			}
		}

		block.uniqueId = newUniqueId;
	});
}
