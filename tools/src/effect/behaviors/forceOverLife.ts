import { Vector3 } from "babylonjs";
import type { ForceOverLifeBehavior, GravityForceBehavior } from "../types/behaviors";
import { ValueUtils } from "../utils/valueParser";
import type { EffectParticleSystem } from "../systems/effectParticleSystem";
/**
 * Apply ForceOverLife behavior to ParticleSystem
 */
export function applyForceOverLifePS(particleSystem: EffectParticleSystem, behavior: ForceOverLifeBehavior): void {
	if (behavior.force) {
		const forceX = behavior.force.x !== undefined ? ValueUtils.parseConstantValue(behavior.force.x) : 0;
		const forceY = behavior.force.y !== undefined ? ValueUtils.parseConstantValue(behavior.force.y) : 0;
		const forceZ = behavior.force.z !== undefined ? ValueUtils.parseConstantValue(behavior.force.z) : 0;
		if (Math.abs(forceY) > 0.01 || Math.abs(forceX) > 0.01 || Math.abs(forceZ) > 0.01) {
			particleSystem.gravity = new Vector3(forceX, forceY, forceZ);
		}
	} else if (behavior.x !== undefined || behavior.y !== undefined || behavior.z !== undefined) {
		const forceX = behavior.x !== undefined ? ValueUtils.parseConstantValue(behavior.x) : 0;
		const forceY = behavior.y !== undefined ? ValueUtils.parseConstantValue(behavior.y) : 0;
		const forceZ = behavior.z !== undefined ? ValueUtils.parseConstantValue(behavior.z) : 0;
		if (Math.abs(forceY) > 0.01 || Math.abs(forceX) > 0.01 || Math.abs(forceZ) > 0.01) {
			particleSystem.gravity = new Vector3(forceX, forceY, forceZ);
		}
	}
}

/**
 * Apply GravityForce behavior to ParticleSystem
 */
export function applyGravityForcePS(particleSystem: EffectParticleSystem, behavior: GravityForceBehavior): void {
	if (behavior.gravity !== undefined) {
		const gravity = ValueUtils.parseConstantValue(behavior.gravity);
		particleSystem.gravity = new Vector3(0, -gravity, 0);
	}
}
