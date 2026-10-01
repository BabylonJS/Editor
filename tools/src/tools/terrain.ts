import { GroundMesh } from "@babylonjs/core/Meshes/groundMesh";

/**
 * This interface is used to define extra properties on GroundMesh for the terrains made with the editor (its TerrainMesh nodes are exported
 * as grounds flagged `isTerrainMesh`).
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface TerrainMesh extends GroundMesh {
	/**
	 * Set on the terrains of the loaded scenes once "babylonjs-editor-tools/loading/terrain" is imported. Babylon.js copies it to the clones of
	 * a terrain (class Mesh).
	 */
	isTerrainMesh: true;
}
