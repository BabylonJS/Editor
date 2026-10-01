import { GetClass, RegisterClass } from "@babylonjs/core/Misc/typeStore";

import { TerrainMaterialPlugin } from "./plugin";
import { TERRAIN_MATERIAL_PLUGIN_CLASS_NAME } from "./types";

/**
 * RegisterClass("BABYLON.TerrainMaterialPlugin", TerrainMaterialPlugin) + RegisterGroundMesh() (§5.8).
 * The type store entry is what Material._ParsePlugins instantiates for the "TerrainMaterialPlugin" key of a material JSON. The first
 * registration wins: the game played in the editor (Play) bundles another copy of the tools, which keeps using the class of the editor.
 */
export function registerTerrainMaterialPlugin(): void {
	if (!GetClass(`BABYLON.${TERRAIN_MATERIAL_PLUGIN_CLASS_NAME}`)) {
		RegisterClass(`BABYLON.${TERRAIN_MATERIAL_PLUGIN_CLASS_NAME}`, TerrainMaterialPlugin);
	}
}
