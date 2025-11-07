import { Material, NodeMaterial } from "babylonjs";

import { isNodeMaterial, isPBRMaterial, isStandardMaterial } from "../guards/material";

/**
 * Configures the given material to receive up to 32 lights simultaneously.
 * @param material defines the reference to the material to configure.
 */
export function configureSimultaneousLightsForMaterial(material: Material) {
	if (isPBRMaterial(material) || isStandardMaterial(material) || isNodeMaterial(material)) {
		material.maxSimultaneousLights = 32;
	}
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
