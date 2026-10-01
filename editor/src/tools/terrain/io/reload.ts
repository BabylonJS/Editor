import type { Editor } from "../../../editor/main";

import { listTerrainMaterials } from "../engine/info";
import { handleTerrainAssetFileChanged } from "../engine/material";
import type { ITerrainMaterialEntry } from "../engine/types";

import { resolveRenamedAssetPath } from "./paths";

/**
 * Updates the terrains using the given image of the project (§6.10): the terrain materials using it as a layer source rebuild their layer
 * textures, and the ones reading their weight maps from it reload them unless they have unsaved paint (kept, with a warning).
 * @param editor defines the reference to the editor.
 * @param relativePath defines the path of the image, relative to the project directory.
 * @returns the number of terrain materials updated from the image.
 */
export function reloadTerrainImage(editor: Editor, relativePath: string): number {
	let reloaded = 0;

	try {
		const scene = editor.layout.preview.scene;

		reloaded = listTerrainMaterials(scene).filter((entry) => isTerrainMaterialReloadedFromImage(entry, relativePath)).length;
		handleTerrainAssetFileChanged(scene, relativePath);
	} catch (e) {
		reloaded = 0;
		editor.layout.console.error(`Failed to update the terrains using ${relativePath}: ${e instanceof Error ? e.message : String(e)}`);
	}

	return reloaded;
}

/**
 * Returns wether or not the terrain material is updated from the given image: as a layer source (layer textures rebuilt), or as a weight
 * map when the material has no unsaved paint (weights reloaded; unsaved paint is kept).
 */
function isTerrainMaterialReloadedFromImage(entry: ITerrainMaterialEntry, relativePath: string): boolean {
	const data = entry.plugin.data;

	const isLayerSource = data.layers.some((layer) =>
		[layer.albedo, layer.normal, layer.roughnessMap, layer.aoMap, layer.heightMap].some((path) => isSameTerrainAssetPath(path, relativePath))
	);

	if (isLayerSource) {
		return true;
	}

	return !entry.dirty[0] && !entry.dirty[1] && data.weightMaps.some((path) => isSameTerrainAssetPath(path, relativePath));
}

function isSameTerrainAssetPath(path: string | null, relativePath: string): boolean {
	if (!path) {
		return false;
	}

	const normalizedPath = path.replace(/\\/g, "/");
	return normalizedPath === relativePath || resolveRenamedAssetPath(normalizedPath) === relativePath;
}
