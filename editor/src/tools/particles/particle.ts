import { NodeParticleSystemSet } from "babylonjs";

/**
 * Normalizes the unique IDs of the nodes in the given Node Particle System Set based on the provided node particle system set data.
 * This allows to get ids not modified after reloading the node particle system set to be git-compliant.
 */
export function normalizeNodeParticleSystemSetUniqueIds(nodeParticleSystem: NodeParticleSystemSet, nodeParticleSystemSetData: any) {
	nodeParticleSystem.editorData = nodeParticleSystemSetData.editorData;
	nodeParticleSystem.attachedBlocks.forEach((block, index) => {
		const oldUniqueId = block.uniqueId;
		const newUniqueId = nodeParticleSystemSetData.blocks[index].id;

		nodeParticleSystem.editorData?.locations?.forEach((location) => {
			if (location.blockId === oldUniqueId) {
				location.blockId = newUniqueId;
			}
		});

		for (const key in nodeParticleSystem.editorData?.map ?? {}) {
			if (!nodeParticleSystem.editorData?.map.hasOwnProperty(key)) {
				continue;
			}

			const value = nodeParticleSystem.editorData.map[key];
			if (value === oldUniqueId) {
				nodeParticleSystem.editorData.map[key] = newUniqueId;
			}
		}

		block.uniqueId = newUniqueId;
	});
}
