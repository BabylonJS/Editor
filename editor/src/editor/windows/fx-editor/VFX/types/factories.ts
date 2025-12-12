import { Nullable, Mesh, PBRMaterial, Texture } from "babylonjs";

/**
 * Factory interfaces for dependency injection
 */
export interface IVFXMaterialFactory {
	createMaterial(materialId: string, name: string): Nullable<PBRMaterial>;
	createTexture(materialId: string): Nullable<Texture>;
}

export interface IVFXGeometryFactory {
	createMesh(geometryId: string, materialId: string | undefined, name: string): Nullable<Mesh>;
}
