import type { ISpeedOverLifeBehavior } from "../types";
import { extractNumberFromValue } from "./utils";
import { ValueUtils } from "../utils";
import type { EffectSolidParticleSystem, EffectParticleSystem } from "../systems";
/**
 * Apply SpeedOverLife behavior to ParticleSystem
 */
export function applySpeedOverLifePS(particleSystem: EffectParticleSystem, behavior: ISpeedOverLifeBehavior): void {
	if (behavior.speed) {
		if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed && behavior.speed.keys && Array.isArray(behavior.speed.keys)) {
			for (const key of behavior.speed.keys) {
				const pos = key.pos ?? key.time ?? 0;
				const val = key.value;
				if (val !== undefined && pos !== undefined) {
					const numVal = extractNumberFromValue(val);
					particleSystem.addVelocityGradient(pos, numVal);
				}
			}
		} else if (
			typeof behavior.speed === "object" &&
			behavior.speed !== null &&
			"functions" in behavior.speed &&
			behavior.speed.functions &&
			Array.isArray(behavior.speed.functions)
		) {
			for (const func of behavior.speed.functions) {
				if (func.function && func.start !== undefined) {
					const startSpeed = func.function.p0 || 1;
					const endSpeed = func.function.p3 !== undefined ? func.function.p3 : startSpeed;
					particleSystem.addVelocityGradient(func.start, startSpeed);
					if (func.function.p3 !== undefined) {
						particleSystem.addVelocityGradient(Math.min(func.start + 0.5, 1), endSpeed);
					}
				}
			}
		} else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
			const speedValue = ValueUtils.parseIntervalValue(behavior.speed);
			particleSystem.addVelocityGradient(0, speedValue.min);
			particleSystem.addVelocityGradient(1, speedValue.max);
		}
	}
}

/**
 * Apply SpeedOverLife behavior to SolidParticleSystem
 * Adds velocity gradients to the system (similar to ParticleSystem native gradients)
 */
export function applySpeedOverLifeSPS(system: EffectSolidParticleSystem, behavior: ISpeedOverLifeBehavior): void {
	if (!behavior.speed) {
		return;
	}

	if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed && behavior.speed.keys && Array.isArray(behavior.speed.keys)) {
		for (const key of behavior.speed.keys) {
			const pos = key.pos ?? key.time ?? 0;
			const val = key.value;
			if (val !== undefined && pos !== undefined) {
				const numVal = extractNumberFromValue(val);
				system.addVelocityGradient(pos, numVal);
			}
		}
	} else if (
		typeof behavior.speed === "object" &&
		behavior.speed !== null &&
		"functions" in behavior.speed &&
		behavior.speed.functions &&
		Array.isArray(behavior.speed.functions)
	) {
		for (const func of behavior.speed.functions) {
			if (func.function && func.start !== undefined) {
				const startSpeed = func.function.p0 || 1;
				const endSpeed = func.function.p3 !== undefined ? func.function.p3 : startSpeed;
				system.addVelocityGradient(func.start, startSpeed);
				if (func.function.p3 !== undefined) {
					system.addVelocityGradient(Math.min(func.start + 0.5, 1), endSpeed);
				}
			}
		}
	} else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
		const speedValue = ValueUtils.parseIntervalValue(behavior.speed);
		system.addVelocityGradient(0, speedValue.min);
		system.addVelocityGradient(1, speedValue.max);
	}
}
