import type { ILimitSpeedOverLifeBehavior } from "../types";
import { extractNumberFromValue } from "./utils";
import { ValueUtils } from "../utils";
import type { EffectSolidParticleSystem, EffectParticleSystem } from "../systems";
/**
 * Apply LimitSpeedOverLife behavior to ParticleSystem
 */
export function applyLimitSpeedOverLifePS(particleSystem: EffectParticleSystem, behavior: ILimitSpeedOverLifeBehavior): void {
	if (behavior.dampen !== undefined) {
		const dampen = ValueUtils.parseConstantValue(behavior.dampen);
		particleSystem.limitVelocityDamping = dampen;
	}

	if (behavior.maxSpeed !== undefined) {
		const speedLimit = ValueUtils.parseConstantValue(behavior.maxSpeed);
		particleSystem.addLimitVelocityGradient(0, speedLimit);
		particleSystem.addLimitVelocityGradient(1, speedLimit);
	} else if (behavior.speed !== undefined) {
		if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed && behavior.speed.keys && Array.isArray(behavior.speed.keys)) {
			for (const key of behavior.speed.keys) {
				const pos = key.pos ?? key.time ?? 0;
				const val = key.value;
				if (val !== undefined && pos !== undefined) {
					const numVal = extractNumberFromValue(val);
					particleSystem.addLimitVelocityGradient(pos, numVal);
				}
			}
		} else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
			const speedLimit = ValueUtils.parseConstantValue(behavior.speed);
			particleSystem.addLimitVelocityGradient(0, speedLimit);
			particleSystem.addLimitVelocityGradient(1, speedLimit);
		}
	}
}

/**
 * Apply LimitSpeedOverLife behavior to SolidParticleSystem
 * Adds limit velocity gradients to the system (similar to ParticleSystem native gradients)
 */
export function applyLimitSpeedOverLifeSPS(system: EffectSolidParticleSystem, behavior: ILimitSpeedOverLifeBehavior): void {
	if (behavior.dampen !== undefined) {
		const dampen = ValueUtils.parseConstantValue(behavior.dampen);
		system.limitVelocityDamping = dampen;
	}

	if (behavior.maxSpeed !== undefined) {
		const speedLimit = ValueUtils.parseConstantValue(behavior.maxSpeed);
		system.addLimitVelocityGradient(0, speedLimit);
		system.addLimitVelocityGradient(1, speedLimit);
	} else if (behavior.speed !== undefined) {
		if (typeof behavior.speed === "object" && behavior.speed !== null && "keys" in behavior.speed && behavior.speed.keys && Array.isArray(behavior.speed.keys)) {
			for (const key of behavior.speed.keys) {
				const pos = key.pos ?? key.time ?? 0;
				const val = key.value;
				if (val !== undefined && pos !== undefined) {
					const numVal = extractNumberFromValue(val);
					system.addLimitVelocityGradient(pos, numVal);
				}
			}
		} else if (typeof behavior.speed === "number" || (typeof behavior.speed === "object" && behavior.speed !== null && "type" in behavior.speed)) {
			const speedLimit = ValueUtils.parseConstantValue(behavior.speed);
			system.addLimitVelocityGradient(0, speedLimit);
			system.addLimitVelocityGradient(1, speedLimit);
		}
	}
}
