import { join, basename, dirname } from "path/posix";
import { readJSON, writeJson, readdir, pathExists, remove } from "fs-extra";

import { projectConfiguration } from "../../project/configuration";

/**
 * Called on a scene has been renamed. This function will update all the references to the old scene
 * name to the new scene name. Especially the references in the meshes and lods geometry files.
 * @param oldAbsolutePath defines the old absolute path of the scene folder.
 * @param newAbsolutePath defines the new absolute path of the scene folder.
 */
export async function renameScene(oldAbsolutePath: string, newAbsolutePath: string) {
	const name = basename(oldAbsolutePath, ".scene");
	const newName = basename(newAbsolutePath);

	const [meshesFiles, lodsFiles] = await Promise.all([
		readdir(join(newAbsolutePath, "meshes")),
		readdir(join(newAbsolutePath, "lods")),
	]);

	await Promise.all([
		Promise.all(meshesFiles.map(async (file) => {
			const data = await readJSON(join(newAbsolutePath, "meshes", file));

			try {
				data.meshes.forEach((mesh) => {
					mesh.delayLoadingFile = mesh.delayLoadingFile.replace(`assets/${name}.scene/`, `assets/${newName}/`);
				});

				await writeJson(join(newAbsolutePath, "meshes", file), data, {
					spaces: 4
				});
			} catch (e) {
				// Catch silently.
			}
		})),
		Promise.all(lodsFiles.map(async (file) => {
			const data = await readJSON(join(newAbsolutePath, "lods", file));

			try {
				data.meshes.forEach((mesh) => {
					mesh.delayLoadingFile = mesh.delayLoadingFile.replace(`assets/${name}.scene/`, `assets/${newName}/`);
				});

				await writeJson(join(newAbsolutePath, "lods", file), data, {
					spaces: 4
				});
			} catch (e) {
				// Catch silently.
			}
		})),
	]);

	// Remove output if exists to keep clean public/scene folder.
	if (projectConfiguration.path) {
		const outputFolder = join(dirname(projectConfiguration.path), "public/scene");

		const outputSceneFilename = join(outputFolder, `${name}.babylon`);
		const geometryFoldername = join(outputFolder, name);

		if (await pathExists(outputSceneFilename)) {
			remove(outputSceneFilename);
		}

		if (await pathExists(geometryFoldername)) {
			remove(geometryFoldername);
		}
	}
}
