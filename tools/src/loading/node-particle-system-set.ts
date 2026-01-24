import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";
import { NodeParticleSystemSet } from "@babylonjs/core/Particles/Node/nodeParticleSystemSet";

import { NodeParticleSystemMesh } from "../tools/particle";

let registered = false;

export function registerNodeParticleSystemSetParser() {
	if (registered) {
		return;
	}

	registered = true;

	AddParser("NodeParticleSystemSetEditorPlugin", (parsedData: any, scene: Scene, container: AssetContainer, _rootUrl: string) => {
		parsedData.meshes?.forEach((mesh: any) => {
			if (!mesh.isNodeParticleSystemMesh) {
				return;
			}

			const instance = container.meshes?.find((m) => m.id === mesh.id) as NodeParticleSystemMesh;
			if (!instance) {
				return;
			}

			instance.nodeParticleSystemSet = NodeParticleSystemSet.Parse(mesh.nodeParticleSystemSet);
			instance.nodeParticleSystemSet.id = mesh.nodeParticleSystemSet.id;
			instance.nodeParticleSystemSet.uniqueId = mesh.uniqueId;

			scene.addPendingData(mesh.id);
			instance.nodeParticleSystemSet.buildAsync(scene, false).then((particleSystemSet) => {
				scene.removePendingData(mesh.id);
				instance.particleSystemSet = particleSystemSet;

				particleSystemSet.emitterNode = instance;
				particleSystemSet.start();
			});
		});
	});
}
