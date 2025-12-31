import type { IColorBySpeedBehavior } from "../types/behaviors";
import type { Particle } from "babylonjs";
import { interpolateColorKeys } from "./utils";

/**
 * Apply ColorBySpeed behavior to ParticleSystem (per-particle)
 * Uses unified IColorFunction structure: behavior.color = { colorFunctionType, data }
 */
export function applyColorBySpeedPS(behavior: IColorBySpeedBehavior, particle: Particle): void {
	// New structure: behavior.color.data.colorKeys
	if (!behavior.color || !behavior.color.data?.colorKeys || !particle.color || !particle.direction) {
		return;
	}

	const minSpeed = behavior.minSpeed !== undefined ? (typeof behavior.minSpeed === "number" ? behavior.minSpeed : 0) : 0;
	const maxSpeed = behavior.maxSpeed !== undefined ? (typeof behavior.maxSpeed === "number" ? behavior.maxSpeed : 1) : 1;
	const colorKeys = behavior.color.data.colorKeys;

	if (!colorKeys || colorKeys.length === 0) {
		return;
	}

	const vel = particle.direction;
	const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
	const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));
	const interpolatedColor = interpolateColorKeys(colorKeys, speedRatio);

	particle.color.r = interpolatedColor.r;
	particle.color.g = interpolatedColor.g;
	particle.color.b = interpolatedColor.b;
	particle.color.a = interpolatedColor.a;
}

/**
 * Apply ColorBySpeed behavior to SolidParticleSystem (per-particle)
 * Uses unified IColorFunction structure: behavior.color = { colorFunctionType, data }
 */
export function applyColorBySpeedSPS(behavior: IColorBySpeedBehavior, particle: any): void {
	// New structure: behavior.color.data.colorKeys
	if (!behavior.color || !behavior.color.data?.colorKeys || !particle.color) {
		return;
	}

	const minSpeed = behavior.minSpeed !== undefined ? (typeof behavior.minSpeed === "number" ? behavior.minSpeed : 0) : 0;
	const maxSpeed = behavior.maxSpeed !== undefined ? (typeof behavior.maxSpeed === "number" ? behavior.maxSpeed : 1) : 1;
	const colorKeys = behavior.color.data.colorKeys;

	if (!colorKeys || colorKeys.length === 0) {
		return;
	}

	const vel = particle.velocity;
	const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
	const speedRatio = Math.max(0, Math.min(1, (currentSpeed - minSpeed) / (maxSpeed - minSpeed || 1)));
	const interpolatedColor = interpolateColorKeys(colorKeys, speedRatio);
	const startColor = particle.props?.startColor;

	if (startColor) {
		particle.color.r = interpolatedColor.r * startColor.r;
		particle.color.g = interpolatedColor.g * startColor.g;
		particle.color.b = interpolatedColor.b * startColor.b;
		particle.color.a = startColor.a;
	} else {
		particle.color.r = interpolatedColor.r;
		particle.color.g = interpolatedColor.g;
		particle.color.b = interpolatedColor.b;
	}
}
