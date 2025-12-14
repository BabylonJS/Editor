import { VFXValueUtils } from "./valueParser";
import type { VFXValue } from "../types/values";

/**
 * Utility for calculating particle system capacity
 */
export class VFXCapacityCalculator {
	/**
	 * Calculate capacity for ParticleSystem
	 * Formula: emissionRate * duration * 2 (for non-looping systems)
	 */
	public static calculateForParticleSystem(emissionOverTime: VFXValue | undefined, duration: number): number {
		const emissionRate = emissionOverTime !== undefined ? VFXValueUtils.parseConstantValue(emissionOverTime) : 10;
		return Math.ceil(emissionRate * duration * 2);
	}

	/**
	 * Calculate capacity for SolidParticleSystem
	 * Formula depends on looping:
	 * - Looping: max(emissionRate * particleLifetime, 1)
	 * - Non-looping: emissionRate * particleLifetime * 2
	 */
	public static calculateForSolidParticleSystem(emissionOverTime: VFXValue | undefined, duration: number, isLooping: boolean): number {
		const emissionRate = emissionOverTime !== undefined ? VFXValueUtils.parseConstantValue(emissionOverTime) : 10;
		const particleLifetime = duration || 5;

		if (isLooping) {
			return Math.max(Math.ceil(emissionRate * particleLifetime), 1);
		} else {
			return Math.ceil(emissionRate * particleLifetime * 2);
		}
	}
}
