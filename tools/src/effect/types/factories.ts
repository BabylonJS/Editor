import { Mesh, PBRMaterial, Texture, Scene } from "babylonjs";

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
