import type { Nullable } from "../../../types";
import type { Mesh } from "../../../Meshes/mesh";
import type { ParticleSystem } from "../../particleSystem";
import type { SolidParticleSystem } from "../../solidParticleSystem";
import { PBRMaterial } from "../../../Materials/PBR/pbrMaterial";
import type { Color4 } from "../../../Maths/math.color";
import type { Texture } from "../../../Materials/Textures/texture";
import type { ColorGradient } from "../../../Misc/gradients";
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

