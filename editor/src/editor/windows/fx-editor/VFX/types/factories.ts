import { Nullable, Mesh, PBRMaterial, Texture, Scene } from "babylonjs";

/**
 * Factory interfaces for dependency injection
 */
export interface IVFXMaterialFactory {
	createMaterial(materialId: string, name: string): Nullable<PBRMaterial>;
	createTexture(materialId: string): Nullable<Texture>;
	getBlendMode(materialId: string): number | undefined;
}

export interface IVFXGeometryFactory {
	createMesh(geometryId: string, name: string, scene: Scene): Nullable<Mesh>;
	createParticleMesh(config: { instancingGeometry?: string }, name: string, scene: Scene): Nullable<Mesh>;
}
