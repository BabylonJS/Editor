import { ipcRenderer } from "electron";

import { isNodeParticleSystemMesh } from "../../../../tools/guards/particles";
import { normalizeNodeParticleSystemSetUniqueIds } from "../../../../tools/particles/particle";

import { NodeParticleSystemMesh } from "../../../nodes/node-particle-system";

import { Editor } from "../../../main";

export function listenParticleAssetsEvents(editor: Editor) {
	ipcRenderer.on("editor:asset-updated", async (_, type, particlesData) => {
		if (type !== "particle-system") {
			return;
		}

		const nodeParticleSystemSet = editor.layout.preview.scene.meshes.find((m) => {
			return isNodeParticleSystemMesh(m) && m.nodeParticleSystemSet?.id === particlesData.id;
		}) as NodeParticleSystemMesh | undefined;

		if (nodeParticleSystemSet && nodeParticleSystemSet.nodeParticleSystemSet) {
			normalizeNodeParticleSystemSetUniqueIds(nodeParticleSystemSet.nodeParticleSystemSet, particlesData);
			await nodeParticleSystemSet.buildNodeParticleSystemSet(particlesData);
		}
	});
}
