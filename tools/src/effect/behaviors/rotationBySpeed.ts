import { Particle, SolidParticle, Vector3 } from "babylonjs";
import type { RotationBySpeedBehavior } from "../types/behaviors";
import { extractNumberFromValue, interpolateGradientKeys } from "./utils";
import { ValueUtils } from "../utils/valueParser";
import { ParticleWithSystem, SolidParticleWithSystem } from "../types/system";

/**
 * Apply RotationBySpeed behavior to Particle
 * Gets currentSpeed from particle.direction magnitude and updateSpeed from system
 */
export function applyRotationBySpeedPS(particle: Particle, behavior: RotationBySpeedBehavior): void {
	if (!behavior.angularVelocity || !particle.direction) {
		return;
	}

	// Get current speed from particle velocity/direction
	const currentSpeed = Vector3.Distance(Vector3.Zero(), particle.direction);

	// Get updateSpeed from system (stored in particle or use default)
	const particleWithSystem = particle as ParticleWithSystem;
	const updateSpeed = particleWithSystem.particleSystem?.updateSpeed ?? 0.016;

	// angularVelocity can be Value (constant/interval) or object with keys
	let angularSpeed = 0;
	if (
		typeof behavior.angularVelocity === "object" &&
		behavior.angularVelocity !== null &&
		"keys" in behavior.angularVelocity &&
		Array.isArray(behavior.angularVelocity.keys) &&
		behavior.angularVelocity.keys.length > 0
	) {
		const minSpeed = behavior.minSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.minSpeed) : 0;
		const maxSpeed = behavior.maxSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.maxSpeed) : 1;
		const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));
		angularSpeed = interpolateGradientKeys(behavior.angularVelocity.keys, speedRatio, extractNumberFromValue);
	} else {
		const angularVel = ValueUtils.parseIntervalValue(behavior.angularVelocity);
		angularSpeed = angularVel.min + (angularVel.max - angularVel.min) * 0.5; // Use middle value
	}

	particle.angle += angularSpeed * updateSpeed;
}

/**
 * Apply RotationBySpeed behavior to SolidParticle
 * Gets currentSpeed from particle.velocity magnitude and updateSpeed from system
 */
export function applyRotationBySpeedSPS(particle: SolidParticle, behavior: RotationBySpeedBehavior): void {
	if (!behavior.angularVelocity) {
		return;
	}

	// Get current speed from particle velocity
	const currentSpeed = Math.sqrt(particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y + particle.velocity.z * particle.velocity.z);

	// Get updateSpeed from system (stored in particle.props or use default)
	const particleWithSystem = particle as SolidParticleWithSystem;
	const updateSpeed = particleWithSystem.system?.updateSpeed ?? 0.016;

	// angularVelocity can be Value (constant/interval) or object with keys
	let angularSpeed = 0;
	if (
		typeof behavior.angularVelocity === "object" &&
		behavior.angularVelocity !== null &&
		"keys" in behavior.angularVelocity &&
		Array.isArray(behavior.angularVelocity.keys) &&
		behavior.angularVelocity.keys.length > 0
	) {
		const minSpeed = behavior.minSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.minSpeed) : 0;
		const maxSpeed = behavior.maxSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.maxSpeed) : 1;
		const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));
		angularSpeed = interpolateGradientKeys(behavior.angularVelocity.keys, speedRatio, extractNumberFromValue);
	} else {
		const angularVel = ValueUtils.parseIntervalValue(behavior.angularVelocity);
		angularSpeed = angularVel.min + (angularVel.max - angularVel.min) * 0.5; // Use middle value
	}

	// SolidParticle uses rotation.z for 2D rotation
	particle.rotation.z += angularSpeed * updateSpeed;
}
