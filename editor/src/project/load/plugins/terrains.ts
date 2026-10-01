import { basename, join } from "path/posix";
import { pathExists } from "fs-extra";

import { Material } from "babylonjs";
import { getTerrainMaterialPlugin } from "babylonjs-editor-tools";

import { getTerrainDataFolder, TERRAIN_DATA_FOLDER_NAME, toTerrainSlashPath } from "../../../tools/terrain/io/paths";

import { ISceneLoaderPluginOptions } from "../scene";

/**
 * Terrain data is per scene: the weight maps of a scene are the files of its "terrainData" folder. A duplicated or renamed scene still
 * references the weight maps of the scene it comes from: the weight maps found (by file name) in the terrain data folder of the loaded scene
 * are used from there, so a duplicated scene is a real clone. The next save of the scene stores the new paths.
 * @param materials defines the materials created by the load of the scene (not the ones of the scenes loaded before, that a scene link may share).
 * @param options defines the options of the scene being loaded.
 */
export async function relocateTerrainWeightMaps(materials: Material[], options: ISceneLoaderPluginOptions): Promise<void> {
	const dataFolder = getTerrainDataFolder(options.relativeScenePath);

	for (const material of materials) {
		const plugin = getTerrainMaterialPlugin(material as any);
		if (!plugin) {
			continue;
		}

		let relocated = false;
		const paths: [string | null, string | null] = [plugin.data.weightMaps[0] ?? null, plugin.data.weightMaps[1] ?? null];

		for (const index of [0, 1] as const) {
			const fileName = paths[index] ? basename(toTerrainSlashPath(paths[index])) : null;
			if (!fileName || paths[index] === `${dataFolder}/${fileName}`) {
				continue;
			}

			if (await pathExists(join(options.scenePath, TERRAIN_DATA_FOLDER_NAME, fileName))) {
				paths[index] = `${dataFolder}/${fileName}`;
				relocated = true;
			}
		}

		if (relocated) {
			plugin.setWeightMapPaths(paths);

			// Loaded (or loading) from the previous paths: loaded again from the files of this scene.
			if (plugin.weightMapsState !== "idle") {
				plugin.reloadWeightMaps();
			}
		}
	}
}
