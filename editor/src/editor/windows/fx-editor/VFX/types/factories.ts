import { Nullable, Mesh, PBRMaterial, Texture } from "babylonjs";

/**
 * Factory interfaces for dependency injection
 */
export interface IVFXMaterialFactory {
	createMaterial(materialId: string, name: string): Nullable<PBRMaterial>;
	createTexture(materialId: string): Nullable<Texture>;
	getBlendMode(materialId: string): number | undefined;
}

export interface IVFXGeometryFactory {
	createMesh(geometryId: string, materialId: string | undefined, name: string): Nullable<Mesh>;
	createParticleMesh(config: { instancingGeometry?: string }, materialId: string | undefined, name: string, scene: any): Nullable<Mesh>;
}
