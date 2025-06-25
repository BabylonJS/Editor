import { ParticleSystem, GPUParticleSystem } from "babylonjs";

/**
 * Returns wether or not the given object is a ParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isParticleSystem(object: any): object is ParticleSystem {
	return object.getClassName?.() === "ParticleSystem";
}

/**
 * Returns wether or not the given object is a GPUParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isGPUParticleSystem(object: any): object is GPUParticleSystem {
	return object.getClassName?.() === "GPUParticleSystem";
}
