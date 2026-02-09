import { parseConstantValue } from "./valueParser";
import type { Value } from "../types/values";

/**
 * Calculate capacity for ParticleSystem
 * Formula: emissionRate * duration * 2 (for non-looping systems)
 */
export function calculateForParticleSystem(emissionOverTime: Value | undefined, duration: number): number {
	const emissionRate = emissionOverTime !== undefined ? parseConstantValue(emissionOverTime) : 10;
	return Math.ceil(emissionRate * duration * 2);
}

/**
 * Calculate capacity for SolidParticleSystem
 * Formula depends on looping:
 * - Looping: max(emissionRate * particleLifetime, 1)
 * - Non-looping: emissionRate * particleLifetime * 2
 */
export function calculateForSolidParticleSystem(emissionOverTime: Value | undefined, duration: number, isLooping: boolean): number {
	const emissionRate = emissionOverTime !== undefined ? parseConstantValue(emissionOverTime) : 10;
	const particleLifetime = duration || 5;

	if (isLooping) {
		return Math.max(Math.ceil(emissionRate * particleLifetime), 1);
	}
	return Math.ceil(emissionRate * particleLifetime * 2);
}
