import { join } from "path/posix";
import { pathExists } from "fs-extra";

import { getTerrainMaterialPlugin, getTerrainWeightMapCount, TERRAIN_LAYERS_PER_WEIGHT_MAP, type TerrainMaterialPlugin } from "babylonjs-editor-tools";

import { Editor } from "../../editor/main";

import { isFromSceneLink } from "../../tools/scene/scene-link";

import { normalizeTerrainAssetPaths } from "../../tools/terrain/engine/material";
import { isTerrainWeightMapDirty, markTerrainWeightMapDirty, markTerrainWeightMapSaved } from "../../tools/terrain/engine/weights-binding";

import { clampTerrainUsedChannels, writeTerrainWeightMapFile } from "../../tools/terrain/io/weights-png";
import { getTerrainWeightMapFileName, TERRAIN_DATA_FOLDER_NAME, toTerrainAbsolutePath } from "../../tools/terrain/io/paths";

export interface ISaveTerrainsOptions {
	scenePath: string;
	savedFiles: string[];
	relativeScenePath: string;
}

/**
 * Writes the weight maps of the terrains in the "terrainData" folder of the scene and makes their materials reference them.
 * The materials are then saved with the meshes, so this must be called before the meshes are serialized.
 */
export async function saveTerrains(editor: Editor, options: ISaveTerrainsOptions) {
	const scene = editor.layout.preview.scene;

	// The save forgets the renamed assets once applied to the files (applyAssetsCache): the terrain data kept in memory must follow them now.
	normalizeTerrainAssetPaths(scene);

	for (const mesh of scene.meshes) {
		const plugin = getTerrainMaterialPlugin(mesh.material as any);
		if (!plugin || isFromSceneLink(mesh)) {
			continue;
		}

		const previousPaths = plugin.data.weightMaps;
		const paths: [string | null, string | null] = [null, null];

		for (const index of ([0, 1] as const).slice(0, getTerrainWeightMapCount(plugin.data.layers.length))) {
			const fileName = getTerrainWeightMapFileName(mesh.material!.id, index);
			const absolutePath = join(options.scenePath, TERRAIN_DATA_FOLDER_NAME, fileName);

			paths[index] = join(options.relativeScenePath, TERRAIN_DATA_FOLDER_NAME, fileName);
			options.savedFiles.push(absolutePath);

			if (!isTerrainWeightMapDirty(plugin, index) && previousPaths[index] === paths[index] && (await pathExists(absolutePath))) {
				continue;
			}

			try {
				await writeTerrainWeightMap(plugin, index, absolutePath);
			} catch (e) {
				editor.layout.console.error(`Failed to write terrain weight map for mesh ${mesh.name}`);

				// Not written: the map keeps its previous file.
				paths[index] = previousPaths[index];
				if (previousPaths[index]) {
					options.savedFiles.push(toTerrainAbsolutePath(previousPaths[index]));
				}
			}
		}

		if (paths[0] !== previousPaths[0] || paths[1] !== previousPaths[1]) {
			plugin.setWeightMapPaths(paths);
		}
	}
}

async function writeTerrainWeightMap(plugin: TerrainMaterialPlugin, index: 0 | 1, absolutePath: string) {
	await plugin.whenWeightMapsReadyAsync();

	const map = plugin.getWeightMap(index);
	if (!map) {
		throw new Error("The weights are not loaded.");
	}

	// Marked as saved before the write, which copies the pixels at once: a change made while the file is written marks the map dirty again.
	markTerrainWeightMapSaved(plugin, index);

	try {
		await writeTerrainWeightMapFile(absolutePath, map, clampTerrainUsedChannels(plugin.data.layers.length - TERRAIN_LAYERS_PER_WEIGHT_MAP * index));
	} catch (e) {
		markTerrainWeightMapDirty(plugin, index);
		throw e;
	}
}
