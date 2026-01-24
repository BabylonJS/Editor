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

		const nodeParticleSystemSet = editor.layout.preview.scene.meshes.find((m) => {
			return isNodeParticleSystemSetMesh(m) && m.nodeParticleSystemSet?.id === particlesData.id;
		}) as NodeParticleSystemSetMesh | undefined;

		if (nodeParticleSystemSet && nodeParticleSystemSet.nodeParticleSystemSet) {
			normalizeNodeParticleSystemSetUniqueIds(nodeParticleSystemSet.nodeParticleSystemSet, particlesData);
			await nodeParticleSystemSet.buildNodeParticleSystemSet(particlesData);
		}
	});
}
