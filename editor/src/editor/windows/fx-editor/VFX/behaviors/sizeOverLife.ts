import { ParticleSystem } from "babylonjs";
import type { VFXSizeOverLifeBehavior } from "../types/behaviors";
import { extractNumberFromValue } from "./utils";

/**
 * Apply SizeOverLife behavior to ParticleSystem
 */
export function applySizeOverLifePS(particleSystem: ParticleSystem, behavior: VFXSizeOverLifeBehavior): void {
	if (behavior.size && behavior.size.functions) {
		const functions = behavior.size.functions;
		for (const func of functions) {
			if (func.function && func.start !== undefined) {
				const startSize = func.function.p0 || 1;
				const endSize = func.function.p3 !== undefined ? func.function.p3 : startSize;
				particleSystem.addSizeGradient(func.start, startSize);
				if (func.function.p3 !== undefined) {
					particleSystem.addSizeGradient(func.start + 0.5, endSize);
				}
			}
		}
	} else if (behavior.size && behavior.size.keys) {
		for (const key of behavior.size.keys) {
			if (key.value !== undefined && key.pos !== undefined) {
				const size = extractNumberFromValue(key.value);
				particleSystem.addSizeGradient(key.pos, size);
			}
		}
	}
}

/**
 * Apply SizeOverLife behavior to SolidParticleSystem
 * Adds size gradients to the system (similar to ParticleSystem native gradients)
 */
export function applySizeOverLifeSPS(system: any, behavior: VFXSizeOverLifeBehavior): void {
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
