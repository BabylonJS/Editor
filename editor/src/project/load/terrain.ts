import { Mesh, Scene } from "babylonjs";

import { Editor } from "../../editor/main";

import { TerrainMesh } from "../../editor/nodes/terrain";

let terrainMeshParserRegistered = false;

/**
 * Makes Mesh.Parse create a TerrainMesh for the grounds saved with `isTerrainMesh` in the scene of the editor (it calls
 * Mesh._GroundMeshParser for every "GroundMesh"). The game played in the preview (Play) gets grounds like in a browser, augmented by
 * babylonjs-editor-tools. Called before the scenes are loaded.
 * @param editor defines the reference to the editor.
 */
export function registerTerrainMeshParser(editor: Editor): void {
	if (terrainMeshParserRegistered) {
		return;
	}

	terrainMeshParserRegistered = true;

	const parseGroundMesh = Mesh._GroundMeshParser;
	Mesh._GroundMeshParser = (parsedMesh: any, scene: Scene): Mesh => {
		if (parsedMesh.isTerrainMesh && scene === editor.layout.preview.scene) {
			return TerrainMesh.Parse(parsedMesh, scene);
		}

		return parseGroundMesh(parsedMesh, scene);
	};
}
