import { readJSON } from "fs-extra";
import { basename } from "path/posix";

import { Scene, AbstractMesh, Tools } from "babylonjs";

import { UniqueNumber } from "../../../../tools/tools";

import { NodeParticleSystemMesh } from "../../../nodes/node-particle-system";

export async function loadImportedParticleSystemFile(scene: Scene, targetMesh: AbstractMesh, absolutePath: string) {
	const data = await readJSON(absolutePath);

	const node = new NodeParticleSystemMesh(basename(absolutePath, ".npss"), scene);
	node.id = Tools.RandomId();
	node.uniqueId = UniqueNumber.Get();
	node.parent = targetMesh;

	await node.buildNodeParticleSystemSet(data);

	return node;
}
