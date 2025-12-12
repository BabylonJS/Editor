import { Nullable, Mesh, ParticleSystem, SolidParticleSystem, PBRMaterial, Color4, Texture, ColorGradient } from "babylonjs";
import type { VFXValue } from "./values";
import type { VFXColor } from "./colors";
import type { VFXGradientKey } from "./gradients";
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

export interface IVFXValueParser {
	parseConstantValue(value: VFXValue): number;
	parseIntervalValue(value: VFXValue): { min: number; max: number };
	parseConstantColor(value: VFXColor): Color4;
	parseGradientColorKeys(keys: VFXGradientKey[]): ColorGradient[];
	parseGradientAlphaKeys(keys: VFXGradientKey[]): { gradient: number; factor: number }[];
}
