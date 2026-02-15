import type { ISizeOverLifeBehavior } from "../types";
import { extractNumberFromValue } from "./utils";
import type { EffectSolidParticleSystem, EffectParticleSystem } from "../systems";
/**
 * Apply SizeOverLife behavior to ParticleSystem
 * In Quarks, SizeOverLife values are multipliers relative to initial particle size
 * In Babylon.js, sizeGradients are absolute values, so we multiply by average initial size
 */
export function applySizeOverLifePS(particleSystem: EffectParticleSystem, behavior: ISizeOverLifeBehavior): void {
	// Get average initial size from minSize/maxSize to use as base for multipliers
	const avgInitialSize = (particleSystem.minSize + particleSystem.maxSize) / 2;

	if (behavior.size && behavior.size.functions) {
		const functions = behavior.size.functions;
		for (const func of functions) {
			if (func.function && func.start !== undefined) {
				// Values from Quarks are multipliers, convert to absolute values
				const startSizeMultiplier = func.function.p0 || 1;
				const endSizeMultiplier = func.function.p3 !== undefined ? func.function.p3 : startSizeMultiplier;
				particleSystem.addSizeGradient(func.start, startSizeMultiplier * avgInitialSize);
				if (func.function.p3 !== undefined) {
					particleSystem.addSizeGradient(func.start + 0.5, endSizeMultiplier * avgInitialSize);
				}
			}
		}
	} else if (behavior.size && behavior.size.keys) {
		for (const key of behavior.size.keys) {
			if (key.value !== undefined && key.pos !== undefined) {
				// Values from Quarks are multipliers, convert to absolute values
				const sizeMultiplier = extractNumberFromValue(key.value);
				particleSystem.addSizeGradient(key.pos, sizeMultiplier * avgInitialSize);
			}
		}
	}
}

/**
 * Apply SizeOverLife behavior to SolidParticleSystem
 * Adds size gradients to the system (similar to ParticleSystem native gradients)
 */
export function applySizeOverLifeSPS(system: EffectSolidParticleSystem, behavior: ISizeOverLifeBehavior): void {
	if (!behavior.size) {
		return;
	}

	if (behavior.size.functions) {
		const functions = behavior.size.functions;
		for (const func of functions) {
			if (func.function && func.start !== undefined) {
				const startSize = func.function.p0 || 1;
				const endSize = func.function.p3 !== undefined ? func.function.p3 : startSize;
				system.addSizeGradient(func.start, startSize);
				if (func.function.p3 !== undefined) {
					system.addSizeGradient(Math.min(func.start + 0.5, 1), endSize);
				}
			}
		}
	} else if (behavior.size.keys) {
		for (const key of behavior.size.keys) {
			if (key.value !== undefined && key.pos !== undefined) {
				const size = extractNumberFromValue(key.value);
				system.addSizeGradient(key.pos, size);
			}
		}
	}
}
