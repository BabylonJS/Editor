import { Vector3, ParticleSystem } from "babylonjs";
import type { VFXForceOverLifeBehavior, VFXGravityForceBehavior } from "../types/behaviors";
import { VFXValueUtils } from "../utils/valueParser";

/**
 * Apply ForceOverLife behavior to ParticleSystem
 */
export function applyForceOverLifePS(particleSystem: ParticleSystem, behavior: VFXForceOverLifeBehavior): void {
	if (behavior.force) {
		const forceX = behavior.force.x !== undefined ? VFXValueUtils.parseConstantValue(behavior.force.x) : 0;
		const forceY = behavior.force.y !== undefined ? VFXValueUtils.parseConstantValue(behavior.force.y) : 0;
		const forceZ = behavior.force.z !== undefined ? VFXValueUtils.parseConstantValue(behavior.force.z) : 0;
		if (Math.abs(forceY) > 0.01 || Math.abs(forceX) > 0.01 || Math.abs(forceZ) > 0.01) {
			particleSystem.gravity = new Vector3(forceX, forceY, forceZ);
		}
	} else if (behavior.x !== undefined || behavior.y !== undefined || behavior.z !== undefined) {
		const forceX = behavior.x !== undefined ? VFXValueUtils.parseConstantValue(behavior.x) : 0;
		const forceY = behavior.y !== undefined ? VFXValueUtils.parseConstantValue(behavior.y) : 0;
		const forceZ = behavior.z !== undefined ? VFXValueUtils.parseConstantValue(behavior.z) : 0;
		if (Math.abs(forceY) > 0.01 || Math.abs(forceX) > 0.01 || Math.abs(forceZ) > 0.01) {
			particleSystem.gravity = new Vector3(forceX, forceY, forceZ);
		}
	}
}

/**
 * Apply GravityForce behavior to ParticleSystem
 */
export function applyGravityForcePS(particleSystem: ParticleSystem, behavior: VFXGravityForceBehavior): void {
	if (behavior.gravity !== undefined) {
		const gravity = VFXValueUtils.parseConstantValue(behavior.gravity);
		particleSystem.gravity = new Vector3(0, -gravity, 0);
	}
}
