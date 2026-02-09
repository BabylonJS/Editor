import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { IForceOverLifeBehavior, IGravityForceBehavior } from "../types";
import { parseConstantValue } from "../utils";
import type { EffectParticleSystem } from "../systems";
/**
 * Apply ForceOverLife behavior to ParticleSystem
 */
export function applyForceOverLifePS(particleSystem: EffectParticleSystem, behavior: IForceOverLifeBehavior): void {
	if (behavior.force) {
		const forceX = behavior.force.x !== undefined ? parseConstantValue(behavior.force.x) : 0;
		const forceY = behavior.force.y !== undefined ? parseConstantValue(behavior.force.y) : 0;
		const forceZ = behavior.force.z !== undefined ? parseConstantValue(behavior.force.z) : 0;
		if (Math.abs(forceY) > 0.01 || Math.abs(forceX) > 0.01 || Math.abs(forceZ) > 0.01) {
			particleSystem.gravity = new Vector3(forceX, forceY, forceZ);
		}
	} else if (behavior.x !== undefined || behavior.y !== undefined || behavior.z !== undefined) {
		const forceX = behavior.x !== undefined ? parseConstantValue(behavior.x) : 0;
		const forceY = behavior.y !== undefined ? parseConstantValue(behavior.y) : 0;
		const forceZ = behavior.z !== undefined ? parseConstantValue(behavior.z) : 0;
		if (Math.abs(forceY) > 0.01 || Math.abs(forceX) > 0.01 || Math.abs(forceZ) > 0.01) {
			particleSystem.gravity = new Vector3(forceX, forceY, forceZ);
		}
	}
}

/**
 * Apply GravityForce behavior to ParticleSystem
 */
export function applyGravityForcePS(particleSystem: EffectParticleSystem, behavior: IGravityForceBehavior): void {
	if (behavior.gravity !== undefined) {
		const gravity = parseConstantValue(behavior.gravity);
		particleSystem.gravity = new Vector3(0, -gravity, 0);
	}
}
