import { readJSON } from "fs-extra";

import { Scene, ParticleSystemSet, AbstractMesh, NodeParticleSystemSet, Tools } from "babylonjs";

import { UniqueNumber } from "../../../../tools/tools";

export async function loadImportedParticleSystemFile(scene: Scene, targetMesh: AbstractMesh, absolutePath: string): Promise<ParticleSystemSet | null> {
	const data = await readJSON(absolutePath);
	const npe = NodeParticleSystemSet.Parse(data);

	const particleSystemSet = await npe.buildAsync(scene, false);
	particleSystemSet.emitterNode = targetMesh;
	particleSystemSet.systems.forEach((particleSystem) => {
		particleSystem.id = Tools.RandomId();
		particleSystem.uniqueId = UniqueNumber.Get();
		particleSystem.sourceParticleSystemSetId = data.id;
	});
	particleSystemSet.start();

	return particleSystemSet;
}
