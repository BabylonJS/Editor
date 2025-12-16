import { SolidParticle, Particle, Vector3 } from "babylonjs";
import type { IIColorBySpeedBehavior } from "../types/behaviors";
import { interpolateColorKeys } from "./utils";
import { ValueUtils } from "../utils/valueParser";

/**
 * Apply ColorBySpeed behavior to Particle
 * Gets currentSpeed from particle.velocity magnitude
 */
export function applyColorBySpeedPS(particle: Particle, behavior: IColorBySpeedBehavior): void {
	if (!behavior.color || !behavior.color.keys || !particle.color || !particle.direction) {
		return;
	}

	// Get current speed from particle velocity/direction
	const currentSpeed = Vector3.Distance(Vector3.Zero(), particle.direction);

	const colorKeys = behavior.color.keys;
	const minSpeed = behavior.minSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.minSpeed) : 0;
	const maxSpeed = behavior.maxSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.maxSpeed) : 1;
	const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));

	const interpolatedColor = interpolateColorKeys(colorKeys, speedRatio);
	const startColor = particle.initialColor;

	if (startColor) {
		// Multiply with startColor (matching three.quarks behavior)
		particle.color.r = interpolatedColor.r * startColor.r;
		particle.color.g = interpolatedColor.g * startColor.g;
		particle.color.b = interpolatedColor.b * startColor.b;
		particle.color.a = startColor.a; // Keep original alpha
	} else {
		particle.color.r = interpolatedColor.r;
		particle.color.g = interpolatedColor.g;
		particle.color.b = interpolatedColor.b;
	}
}

/**
 * Apply ColorBySpeed behavior to SolidParticle
 * Gets currentSpeed from particle.velocity magnitude
 */
export function applyColorBySpeedSPS(particle: SolidParticle, behavior: IColorBySpeedBehavior): void {
	if (!behavior.color || !behavior.color.keys || !particle.color) {
		return;
	}

	// Get current speed from particle velocity
	const currentSpeed = Math.sqrt(particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y + particle.velocity.z * particle.velocity.z);

	const colorKeys = behavior.color.keys;
	const minSpeed = behavior.minSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.minSpeed) : 0;
	const maxSpeed = behavior.maxSpeed !== undefined ? ValueUtils.parseConstantValue(behavior.maxSpeed) : 1;
	const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));

	const interpolatedColor = interpolateColorKeys(colorKeys, speedRatio);
	const startColor = particle.props?.startColor;

	if (startColor) {
		// Multiply with startColor (matching three.quarks behavior)
		particle.color.r = interpolatedColor.r * startColor.r;
		particle.color.g = interpolatedColor.g * startColor.g;
		particle.color.b = interpolatedColor.b * startColor.b;
		particle.color.a = startColor.a; // Keep original alpha
	} else {
		particle.color.r = interpolatedColor.r;
		particle.color.g = interpolatedColor.g;
		particle.color.b = interpolatedColor.b;
	}
}
