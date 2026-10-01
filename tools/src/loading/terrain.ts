import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";

import { TerrainMesh } from "../tools/terrain";
import { configureTerrainGroundMeshes } from "../terrain/ground";
import { registerTerrainMaterialPlugin } from "../terrain/register";

let registered = false;

/**
 * Registers the parser that flags the terrains (`isTerrainMesh`) of the loaded scenes (the grounds exported from the TerrainMesh nodes of the
 * editor) and repairs their GroundMesh internals.
 */
export function registerTerrainMeshParser(): void {
	if (registered) {
		return;
	}

	registered = true;

	AddParser("TerrainMesh", (parsedData: any, _scene: Scene, container: AssetContainer, _rootUrl: string) => {
		parsedData.meshes?.forEach((mesh) => {
			if (!mesh.isTerrainMesh) {
				return;
			}

			const instance = container.meshes?.find((m) => m.id === mesh.id) as TerrainMesh;
			if (!instance) {
				return;
			}

			instance.isTerrainMesh = true;
			registerTerrainMaterialPlugin();
		});

		configureTerrainGroundMeshes(container);
	});
}

registerTerrainMeshParser();
