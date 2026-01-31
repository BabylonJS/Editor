import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Scene } from "@babylonjs/core/scene";

/**
 * Factory interfaces for dependency injection
 */
export interface IMaterialFactory {
	createMaterial(materialId: string, name: string): PBRMaterial;
	createTexture(materialId: string): Texture;
	getBlendMode(materialId: string): number | undefined;
}

export interface IGeometryFactory {
	createMesh(geometryId: string, name: string, scene: Scene): Mesh;
	createParticleMesh(config: { instancingGeometry?: string }, name: string, scene: Scene): Mesh;
}
