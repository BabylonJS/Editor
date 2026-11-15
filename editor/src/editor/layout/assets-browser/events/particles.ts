import { ipcRenderer } from "electron";

import { isNodeParticleSystemSetMesh } from "../../../../tools/guards/particles";
import { normalizeNodeParticleSystemSetUniqueIds } from "../../../../tools/particles/particle";

import { NodeParticleSystemSetMesh } from "../../../nodes/node-particle-system";

import { Editor } from "../../../main";

export function listenParticleAssetsEvents(editor: Editor) {
	ipcRenderer.on("editor:asset-updated", async (_, type, particlesData) => {
		if (type !== "particle-system") {
			return;
		}

		await reloadNodeParticleSystemSets(editor, particlesData);
	});
}

/**
 * Rebuilds every node particle system set of the scene created from the given serialized node particle system
 * set, matched by its id.
 * @param editor defines the reference to the editor.
 * @param particlesData defines the content of the node particle system set asset (.npss).
 * @returns the number of node particle system sets rebuilt.
 */
export async function reloadNodeParticleSystemSets(editor: Editor, particlesData: any): Promise<number> {
	const nodeParticleSystemSets = editor.layout.preview.scene.meshes.filter((m) => {
		return isNodeParticleSystemSetMesh(m) && m.nodeParticleSystemSet?.id === particlesData.id;
	}) as NodeParticleSystemSetMesh[];

	await Promise.all(
		nodeParticleSystemSets.map(async (nodeParticleSystemSet) => {
			await nodeParticleSystemSet.buildNodeParticleSystemSet(particlesData);
			if (nodeParticleSystemSet.nodeParticleSystemSet) {
				normalizeNodeParticleSystemSetUniqueIds(nodeParticleSystemSet.nodeParticleSystemSet, particlesData);
			}
		})
	);

	return nodeParticleSystemSets.length;
}
