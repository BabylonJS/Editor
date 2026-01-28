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

		const nodeParticleSystemSets = editor.layout.preview.scene.meshes.filter((m) => {
			return isNodeParticleSystemSetMesh(m) && m.nodeParticleSystemSet?.id === particlesData.id;
		}) as NodeParticleSystemSetMesh[];

		await Promise.all(
			nodeParticleSystemSets?.map(async (nodeParticleSystemSet) => {
				await nodeParticleSystemSet.buildNodeParticleSystemSet(particlesData);
				if (nodeParticleSystemSet.nodeParticleSystemSet) {
					normalizeNodeParticleSystemSetUniqueIds(nodeParticleSystemSet.nodeParticleSystemSet, particlesData);
				}
			})
		);
	});
}
