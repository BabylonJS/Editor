import { ParticleSystem, SolidParticle } from "babylonjs";
import type { VFXRotationOverLifeBehavior } from "../types/behaviors";
import { VFXValueUtils } from "../utils/valueParser";

/**
 * Apply RotationOverLife behavior to ParticleSystem
 */
export function applyRotationOverLifePS(particleSystem: ParticleSystem, behavior: VFXRotationOverLifeBehavior): void {
	if (behavior.angularVelocity) {
		const angularVel = VFXValueUtils.parseIntervalValue(behavior.angularVelocity);
		particleSystem.minAngularSpeed = angularVel.min;
		particleSystem.maxAngularSpeed = angularVel.max;
	}
}

/**
 * Apply RotationOverLife behavior to SolidParticle
 * Gets lifeRatio from particle (age / lifeTime) and updateSpeed from system
 */
export function applyRotationOverLifeSPS(particle: SolidParticle, behavior: VFXRotationOverLifeBehavior): void {
	if (!behavior.angularVelocity || particle.lifeTime <= 0) {
		return;
	}

	// Get lifeRatio from particle
	const lifeRatio = particle.age / particle.lifeTime;

	// Get updateSpeed from system (stored in particle.props or use default)
	const updateSpeed = (particle as any).system?.updateSpeed ?? 0.016;

	const angularVel = VFXValueUtils.parseIntervalValue(behavior.angularVelocity);
	const angularSpeed = angularVel.min + (angularVel.max - angularVel.min) * lifeRatio;

	// Apply rotation around Z axis (2D rotation)
	// SolidParticle uses rotation.z for 2D rotation
	particle.rotation.z += angularSpeed * updateSpeed;
}
