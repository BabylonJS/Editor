import { join } from "node:path/posix";
import { readdir } from "node:fs/promises";

import fs from "fs-extra";

export async function ensureSceneDirectories(scenePath: string) {
	await Promise.all([
		fs.ensureDir(join(scenePath, "nodes")),
		fs.ensureDir(join(scenePath, "meshes")),
		fs.ensureDir(join(scenePath, "lods")),
		fs.ensureDir(join(scenePath, "lights")),
		fs.ensureDir(join(scenePath, "cameras")),
		fs.ensureDir(join(scenePath, "geometries")),
		fs.ensureDir(join(scenePath, "skeletons")),
		fs.ensureDir(join(scenePath, "shadowGenerators")),
		fs.ensureDir(join(scenePath, "sceneLinks")),
		fs.ensureDir(join(scenePath, "gui")),
		fs.ensureDir(join(scenePath, "sounds")),
		fs.ensureDir(join(scenePath, "particleSystems")),
		fs.ensureDir(join(scenePath, "morphTargetManagers")),
		fs.ensureDir(join(scenePath, "morphTargets")),
		fs.ensureDir(join(scenePath, "animationGroups")),
		fs.ensureDir(join(scenePath, "sprite-maps")),
		fs.ensureDir(join(scenePath, "sprite-managers")),
		fs.ensureDir(join(scenePath, "nodeParticleSystemSets")),
	]);
}

export async function readSceneDirectories(scenePath: string) {
	const [
		nodesFiles,
		meshesFiles,
		lodsFiles,
		lightsFiles,
		cameraFiles,
		skeletonFiles,
		shadowGeneratorFiles,
		sceneLinkFiles,
		guiFiles,
		soundFiles,
		particleSystemFiles,
		morphTargetManagerFiles,
		morphTargetFiles,
		animationGroupFiles,
		spriteMapFiles,
		spriteManagerFiles,
		geometryFiles,
		nodeParticleSystemSetFiles,
	] = await Promise.all([
		readdir(join(scenePath, "nodes")),
		readdir(join(scenePath, "meshes")),
		readdir(join(scenePath, "lods")),
		readdir(join(scenePath, "lights")),
		readdir(join(scenePath, "cameras")),
		readdir(join(scenePath, "skeletons")),
		readdir(join(scenePath, "shadowGenerators")),
		readdir(join(scenePath, "sceneLinks")),
		readdir(join(scenePath, "gui")),
		readdir(join(scenePath, "sounds")),
		readdir(join(scenePath, "particleSystems")),
		readdir(join(scenePath, "morphTargetManagers")),
		readdir(join(scenePath, "morphTargets")),
		readdir(join(scenePath, "animationGroups")),
		readdir(join(scenePath, "sprite-maps")),
		readdir(join(scenePath, "sprite-managers")),
		readdir(join(scenePath, "geometries")),
		readdir(join(scenePath, "nodeParticleSystemSets")),
	]);

	return {
		nodesFiles,
		meshesFiles,
		lodsFiles,
		lightsFiles,
		cameraFiles,
		skeletonFiles,
		shadowGeneratorFiles,
		sceneLinkFiles,
		guiFiles,
		soundFiles,
		particleSystemFiles,
		morphTargetManagerFiles,
		morphTargetFiles,
		animationGroupFiles,
		spriteMapFiles,
		spriteManagerFiles,
		geometryFiles,
		nodeParticleSystemSetFiles,
	};
}
