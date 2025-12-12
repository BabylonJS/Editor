import { Vector3, Quaternion } from "babylonjs";
import type { VFXParticleEmitterConfig } from "./emitterConfig";

/**
 * VFX transform (converted from Quarks, left-handed coordinate system)
 */
export interface VFXTransform {
	position: Vector3;
	rotation: Quaternion;
	scale: Vector3;
}

/**
 * VFX group (converted from Quarks)
 */
export interface VFXGroup {
	uuid: string;
	name: string;
	transform: VFXTransform;
	children: (VFXGroup | VFXEmitter)[];
}

/**
 * VFX emitter (converted from Quarks)
 */
export interface VFXEmitter {
	uuid: string;
	name: string;
	transform: VFXTransform;
	config: VFXParticleEmitterConfig;
	materialId?: string;
	parentUuid?: string;
}

/**
 * VFX hierarchy (converted from Quarks)
 */
export interface VFXHierarchy {
	root: VFXGroup | VFXEmitter | null;
	groups: Map<string, VFXGroup>;
	emitters: Map<string, VFXEmitter>;
}
