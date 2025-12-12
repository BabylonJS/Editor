import { Nullable, TransformNode, Vector3 } from "babylonjs";
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
