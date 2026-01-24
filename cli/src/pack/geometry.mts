import { join } from "node:path/posix";

import fs from "fs-extra";

import { readSceneDirectories } from "../tools/scene.mjs";

export interface ICreateGeometryFilesOptions {
	sceneFile: string;
	sceneName: string;
	publicDir: string;
	babylonjsEditorToolsVersion: string;

	directories: Awaited<ReturnType<typeof readSceneDirectories>>;
}

export async function createGeometryFiles(options: ICreateGeometryFilesOptions) {
	await fs.ensureDir(join(options.publicDir, options.sceneName));
	await fs.ensureDir(join(options.publicDir, options.sceneName, "morphTargets"));

	await Promise.all(
		options.directories.geometryFiles.map(async (file) => {
			await fs.copyFile(join(options.sceneFile, "geometries", file), join(options.publicDir, options.sceneName, file));
		})
	);

	if (options.babylonjsEditorToolsVersion >= "5.2.6") {
		await Promise.all(
			options.directories.morphTargetFiles.map(async (file) => {
				await fs.copyFile(join(options.sceneFile, "morphTargets", file), join(options.publicDir, options.sceneName, "morphTargets", file));
			})
		);
	}
}
