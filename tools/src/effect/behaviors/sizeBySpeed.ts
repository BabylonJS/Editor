import { Particle, SolidParticle, Vector3 } from "babylonjs";
import type { SizeBySpeedBehavior } from "../types/behaviors";
import { extractNumberFromValue, interpolateGradientKeys } from "./utils";
import { ValueUtils } from "../utils/valueParser";

/**
 * Apply SizeBySpeed behavior to Particle
 * Gets currentSpeed from particle.direction magnitude
 */
export function applySizeBySpeedPS(particle: Particle, behavior: SizeBySpeedBehavior): void {
	if (!behavior.size || !behavior.size.keys || !particle.direction) {
		return;
	}

	// Get current speed from particle velocity/direction
	const currentSpeed = Vector3.Distance(Vector3.Zero(), particle.direction);

	const sizeKeys = behavior.size.keys;
	const minSpeed = behavior.minSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.minSpeed) : 0;
	const maxSpeed = behavior.maxSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.maxSpeed) : 1;
	const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));

	const sizeMultiplier = interpolateGradientKeys(sizeKeys, speedRatio, extractNumberFromValue);
	const startSize = particle.size || 1;
	particle.size = startSize * sizeMultiplier;
}

/**
 * Apply SizeBySpeed behavior to SolidParticle
 * Gets currentSpeed from particle.velocity magnitude
 */
export function applySizeBySpeedSPS(particle: SolidParticle, behavior: SizeBySpeedBehavior): void {
	if (!behavior.size || !behavior.size.keys) {
		return;
	}

	// Get current speed from particle velocity
	const currentSpeed = Math.sqrt(particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y + particle.velocity.z * particle.velocity.z);

	const sizeKeys = behavior.size.keys;
	const minSpeed = behavior.minSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.minSpeed) : 0;
	const maxSpeed = behavior.maxSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.maxSpeed) : 1;
	const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));

	const sizeMultiplier = interpolateGradientKeys(sizeKeys, speedRatio, extractNumberFromValue);
	const startSize = particle.props?.startSize ?? 1;
	const newSize = startSize * sizeMultiplier;
	particle.scaling.setAll(newSize);
}
