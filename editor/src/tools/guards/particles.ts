import { ParticleSystem, GPUParticleSystem, IParticleSystem } from "babylonjs";

import { NodeParticleSystemSetMesh } from "../../editor/nodes/node-particle-system";

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

/**
 * Returns wether or not the given object is a NodeParticleSystemMesh.
 * @param object defines the reference to the object to test its class name.
 */
export function isNodeParticleSystemSetMesh(object: any): object is NodeParticleSystemSetMesh {
	return object.getClassName?.() === "NodeParticleSystemSetMesh";
}

/**
 * Returns wether or not the given object is a IParticleSystem.
 * @param object defines the reference to the object to test its class name.
 */
export function isAnyParticleSystem(object: any): object is IParticleSystem {
	switch (object.getClassName?.()) {
		case "ParticleSystem":
		case "GPUParticleSystem":
			return true;
	}

	return false;
}
