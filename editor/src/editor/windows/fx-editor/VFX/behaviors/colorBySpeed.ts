import type { SolidParticle } from "@babylonjs/core/Particles/solidParticle";
import type { Particle } from "@babylonjs/core/Particles/particle";
import type { VFXColorBySpeedBehavior } from "../types/behaviors";
import { interpolateColorKeys } from "./utils";
import { VFXValueParser } from "../parsers/VFXValueParser";

/**
 * Apply ColorBySpeed behavior to Particle
 */
export function applyColorBySpeedPS(particle: Particle, behavior: VFXColorBySpeedBehavior, currentSpeed: number, valueParser: VFXValueParser): void {
	if (!behavior.color || !behavior.color.keys || !particle.color) {
		return;
	}

	const colorKeys = behavior.color.keys;
	const minSpeed = behavior.minSpeed !== undefined ? valueParser.parseConstantValue(behavior.minSpeed) : 0;
	const maxSpeed = behavior.maxSpeed !== undefined ? valueParser.parseConstantValue(behavior.maxSpeed) : 1;
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
 */
export function applyColorBySpeedSPS(particle: SolidParticle, behavior: VFXColorBySpeedBehavior, currentSpeed: number, valueParser: VFXValueParser): void {
	if (!behavior.color || !behavior.color.keys || !particle.color) {
		return;
	}

	const colorKeys = behavior.color.keys;
	const minSpeed = behavior.minSpeed !== undefined ? valueParser.parseConstantValue(behavior.minSpeed) : 0;
	const maxSpeed = behavior.maxSpeed !== undefined ? valueParser.parseConstantValue(behavior.maxSpeed) : 1;
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
