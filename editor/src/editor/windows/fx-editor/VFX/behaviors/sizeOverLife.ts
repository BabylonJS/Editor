import { ParticleSystem, SolidParticle } from "babylonjs";
import type { VFXSizeOverLifeBehavior } from "../types/behaviors";
import { extractNumberFromValue, interpolateGradientKeys } from "./utils";

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
 * Apply SizeOverLife behavior to SolidParticle
 */
export function applySizeOverLifeSPS(particle: SolidParticle, behavior: VFXSizeOverLifeBehavior, lifeRatio: number): void {
	if (!behavior.size) {
		return;
	}

	let sizeMultiplier = 1;

	if (behavior.size.keys && Array.isArray(behavior.size.keys)) {
		sizeMultiplier = interpolateGradientKeys(behavior.size.keys, lifeRatio, extractNumberFromValue);
	} else if (behavior.size.functions && Array.isArray(behavior.size.functions)) {
		// Handle functions (simplified - use first function)
		const func = behavior.size.functions[0];
		if (func && func.function && func.start !== undefined) {
			const startSize = func.function.p0 || 1;
			const endSize = func.function.p3 !== undefined ? func.function.p3 : startSize;
			const t = Math.max(0, Math.min(1, (lifeRatio - func.start) / 0.5));
			sizeMultiplier = startSize + (endSize - startSize) * t;
		}
	}

	// Multiply startSize by the gradient value (matching three.quarks behavior)
	const startSize = particle.props?.startSize ?? 1;
	const newSize = startSize * sizeMultiplier;
	particle.scaling.setAll(newSize);
}
