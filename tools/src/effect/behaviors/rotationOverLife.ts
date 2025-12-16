import type { RotationOverLifeBehavior } from "../types/behaviors";
import { ValueUtils } from "../utils/valueParser";
import { extractNumberFromValue } from "./utils";
import type { EffectSolidParticleSystem } from "../systems/effectSolidParticleSystem";
import type { EffectParticleSystem } from "../systems/effectParticleSystem";
/**
 * Apply RotationOverLife behavior to ParticleSystem
 * Uses addAngularSpeedGradient for gradient support (Babylon.js native)
 */
export function applyRotationOverLifePS(particleSystem: EffectParticleSystem, behavior: RotationOverLifeBehavior): void {
	if (!behavior.angularVelocity) {
		return;
	}

	// Check if angularVelocity has gradient keys
	if (
		typeof behavior.angularVelocity === "object" &&
		behavior.angularVelocity !== null &&
		"keys" in behavior.angularVelocity &&
		Array.isArray(behavior.angularVelocity.keys) &&
		behavior.angularVelocity.keys.length > 0
	) {
		// Use gradient for keys
		for (const key of behavior.angularVelocity.keys) {
			const pos = key.pos ?? key.time ?? 0;
			const val = key.value;
			if (val !== undefined && pos !== undefined) {
				const numVal = extractNumberFromValue(val);
				particleSystem.addAngularSpeedGradient(pos, numVal);
			}
		}
	} else if (
		typeof behavior.angularVelocity === "object" &&
		behavior.angularVelocity !== null &&
		"functions" in behavior.angularVelocity &&
		Array.isArray(behavior.angularVelocity.functions) &&
		behavior.angularVelocity.functions.length > 0
	) {
		// Use gradient for functions
		for (const func of behavior.angularVelocity.functions) {
			if (func.function && func.start !== undefined) {
				const startSpeed = func.function.p0 || 0;
				const endSpeed = func.function.p3 !== undefined ? func.function.p3 : startSpeed;
				particleSystem.addAngularSpeedGradient(func.start, startSpeed);
				if (func.function.p3 !== undefined) {
					particleSystem.addAngularSpeedGradient(Math.min(func.start + 0.5, 1), endSpeed);
				}
			}
		}
	} else {
		// Fallback to interval (min/max) - use gradient with min at 0 and max at 1
		const angularVel = ValueUtils.parseIntervalValue(behavior.angularVelocity);
		particleSystem.addAngularSpeedGradient(0, angularVel.min);
		particleSystem.addAngularSpeedGradient(1, angularVel.max);
	}
}

/**
 * Apply RotationOverLife behavior to SolidParticleSystem
 * Adds angular speed gradients to the system (similar to ParticleSystem native gradients)
 */
export function applyRotationOverLifeSPS(system: EffectSolidParticleSystem, behavior: RotationOverLifeBehavior): void {
	if (!behavior.angularVelocity) {
		return;
	}

	// Check if angularVelocity has gradient keys
	if (
		typeof behavior.angularVelocity === "object" &&
		behavior.angularVelocity !== null &&
		"keys" in behavior.angularVelocity &&
		Array.isArray(behavior.angularVelocity.keys) &&
		behavior.angularVelocity.keys.length > 0
	) {
		// Use gradient for keys
		for (const key of behavior.angularVelocity.keys) {
			const pos = key.pos ?? key.time ?? 0;
			const val = key.value;
			if (val !== undefined && pos !== undefined) {
				const numVal = extractNumberFromValue(val);
				system.addAngularSpeedGradient(pos, numVal);
			}
		}
	} else if (
		typeof behavior.angularVelocity === "object" &&
		behavior.angularVelocity !== null &&
		"functions" in behavior.angularVelocity &&
		Array.isArray(behavior.angularVelocity.functions) &&
		behavior.angularVelocity.functions.length > 0
	) {
		// Use gradient for functions
		for (const func of behavior.angularVelocity.functions) {
			if (func.function && func.start !== undefined) {
				const startSpeed = func.function.p0 || 0;
				const endSpeed = func.function.p3 !== undefined ? func.function.p3 : startSpeed;
				system.addAngularSpeedGradient(func.start, startSpeed);
				if (func.function.p3 !== undefined) {
					system.addAngularSpeedGradient(Math.min(func.start + 0.5, 1), endSpeed);
				}
			}
		}
	} else {
		// Fallback to interval (min/max) - use gradient with min at 0 and max at 1
		const angularVel = ValueUtils.parseIntervalValue(behavior.angularVelocity);
		system.addAngularSpeedGradient(0, angularVel.min);
		system.addAngularSpeedGradient(1, angularVel.max);
	}
}
