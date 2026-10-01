import { join } from "path/posix";
import { copyFile, pathExists } from "fs-extra";

import { getTerrainMaterialPlugin, getTerrainWeightMapCount, TERRAIN_LAYERS_PER_WEIGHT_MAP, TERRAIN_MATERIAL_PLUGIN_CLASS_NAME } from "babylonjs-editor-tools";

import { Editor } from "../../editor/main";

import { TERRAIN_LAYER_PATH_KEYS } from "./engine/material";
import { isTerrainWeightMapDirty } from "./engine/weights-binding";

import { clampTerrainUsedChannels, writeTerrainWeightMapFile } from "./io/weights-png";
import { getTerrainWeightMapFileName, resolveRenamedAssetPath, toTerrainAbsolutePath } from "./io/paths";

export interface IExtractTerrainWeightMapsOptions {
	materialData: any;
	sceneName: string;
	scenePath: string;
}

/**
 * Writes the weight maps of the given serialized material next to the geometries of the exported scene and makes the material reference them.
 * Weight maps are files of the ".scene" folder, which is not copied with the assets, and only exist in memory when painted since the last save.
 * @returns the names of the files written in the folder of the exported scene.
 */
export async function extractTerrainWeightMaps(editor: Editor, options: IExtractTerrainWeightMapsOptions) {
	const fileNames: string[] = [];

	const pluginData = options.materialData.plugins?.[TERRAIN_MATERIAL_PLUGIN_CLASS_NAME];
	const plugin = getTerrainMaterialPlugin(editor.layout.preview.scene.getMaterialById(options.materialData.id) as any);

	if (!pluginData || !plugin) {
		return fileNames;
	}

	// Layer textures are exported with the assets: follow the ones renamed since the last save.
	pluginData.layers?.forEach((layer) => {
		TERRAIN_LAYER_PATH_KEYS.forEach((key) => {
			if (layer[key]) {
				layer[key] = resolveRenamedAssetPath(layer[key]);
			}
		});
	});

	const layerCount = plugin.data.layers.length;
	const savedPaths: (string | null)[] = pluginData.weightMaps ?? [];

	pluginData.weightMaps = [null, null];

	for (const index of ([0, 1] as const).slice(0, getTerrainWeightMapCount(layerCount))) {
		const fileName = getTerrainWeightMapFileName(options.materialData.id, index);
		const outputPath = join(options.scenePath, options.sceneName, fileName);

		const savedPath = savedPaths[index] ? toTerrainAbsolutePath(resolveRenamedAssetPath(savedPaths[index])) : null;

		if (savedPath && !isTerrainWeightMapDirty(plugin, index) && (await pathExists(savedPath))) {
			await copyFile(savedPath, outputPath);
		} else {
			await plugin.whenWeightMapsReadyAsync();

			const map = plugin.getWeightMap(index);
			if (!map) {
				editor.layout.console.warn(`Export: weights of terrain material "${options.materialData.name}" are not loaded, the terrain shows its first layer.`);
				continue;
			}

			await writeTerrainWeightMapFile(outputPath, map, clampTerrainUsedChannels(layerCount - TERRAIN_LAYERS_PER_WEIGHT_MAP * index));
		}

		pluginData.weightMaps[index] = `${options.sceneName}/${fileName}`;
		fileNames.push(fileName);
	}

	return fileNames;
}
