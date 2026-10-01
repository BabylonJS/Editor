import { basename, join } from "node:path/posix";

import fs from "fs-extra";

export interface IExtractTerrainWeightMapsOptions {
	sceneFile: string;
	sceneName: string;
	publicDir: string;
}

/**
 * Copies the weight maps of the given terrain material next to the geometries of the packed scene and makes the material reference them.
 * Weight maps are files of the "terrainData" folder of the ".scene" folder, which is not packed with the assets.
 * @returns the paths of the copied files, relative to the public directory.
 */
export async function extractTerrainWeightMaps(materialData: any, options: IExtractTerrainWeightMapsOptions) {
	const weightMaps = materialData.plugins?.TerrainMaterialPlugin?.weightMaps;
	const relativePaths: string[] = [];

	if (!weightMaps) {
		return relativePaths;
	}

	for (let index = 0; index < weightMaps.length; ++index) {
		if (!weightMaps[index]) {
			continue;
		}

		const fileName = basename(weightMaps[index]);
		const source = join(options.sceneFile, "terrainData", fileName);

		if (!(await fs.pathExists(source))) {
			console.warn(`Terrain weight map "${fileName}" not found in scene "${options.sceneName}": not packed.`);
			weightMaps[index] = null;
			continue;
		}

		const relativePath = join(options.sceneName, fileName);
		await fs.copy(source, join(options.publicDir, relativePath));

		weightMaps[index] = relativePath;
		relativePaths.push(relativePath);
	}

	return relativePaths;
}
