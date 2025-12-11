import type { Nullable } from "@babylonjs/core/types";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { VFXParticleEmitterConfig } from "./emitterConfig";
import type { VFXEmitter } from "./hierarchy";

/**
 * Data structure for emitter creation
 */
export interface VFXEmitterData {
    name: string;
    config: VFXParticleEmitterConfig;
    materialId?: string;
    matrix?: number[];
    position?: number[];
    parentGroup: Nullable<TransformNode>;
    cumulativeScale: Vector3;
    vfxEmitter?: VFXEmitter;
}

