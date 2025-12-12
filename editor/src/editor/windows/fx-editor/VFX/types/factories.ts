import { Nullable, Mesh, ParticleSystem, SolidParticleSystem, PBRMaterial, Texture } from "babylonjs";
import type { VFXEmitterData } from "./emitter";

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

export interface IVFXEmitterFactory {
	createEmitter(emitterData: VFXEmitterData): Nullable<ParticleSystem | SolidParticleSystem>;
}
