import { Color4, ParticleSystem } from "babylonjs";
import type { VFXColorOverLifeBehavior } from "../types/behaviors";
import { extractColorFromValue, extractAlphaFromValue } from "./utils";

/**
 * Apply ColorOverLife behavior to ParticleSystem
 */
export function applyColorOverLifePS(particleSystem: ParticleSystem, behavior: VFXColorOverLifeBehavior): void {
	if (behavior.color && behavior.color.color && behavior.color.color.keys) {
		const colorKeys = behavior.color.color.keys;
		for (const key of colorKeys) {
			if (key.value !== undefined && key.pos !== undefined) {
				const color = extractColorFromValue(key.value);
				const alpha = extractAlphaFromValue(key.value);
				particleSystem.addColorGradient(key.pos, new Color4(color.r, color.g, color.b, alpha));
			}
		}
	}

	if (behavior.color && behavior.color.alpha && behavior.color.alpha.keys) {
		const alphaKeys = behavior.color.alpha.keys;
		for (const key of alphaKeys) {
			if (key.value !== undefined && key.pos !== undefined) {
				const alpha = extractAlphaFromValue(key.value);
				const existingGradients = particleSystem.getColorGradients();
				const existingGradient = existingGradients?.find((g) => key.pos !== undefined && Math.abs(g.gradient - key.pos) < 0.001);
				if (existingGradient) {
					existingGradient.color1.a = alpha;
					if (existingGradient.color2) {
						existingGradient.color2.a = alpha;
					}
				} else {
					particleSystem.addColorGradient(key.pos ?? 0, new Color4(1, 1, 1, alpha));
				}
			}
		}
	}
}

/**
 * Apply ColorOverLife behavior to SolidParticleSystem
 * Adds color gradients to the system (similar to ParticleSystem native gradients)
 */
export function applyColorOverLifeSPS(system: any, behavior: VFXColorOverLifeBehavior): void {
	if (!behavior.color) {
		return;
	}

	// Add color gradients from keys
	if (behavior.color.color && behavior.color.color.keys) {
		const colorKeys = behavior.color.color.keys;
		for (const key of colorKeys) {
			if (key.value !== undefined && key.pos !== undefined) {
				const color = extractColorFromValue(key.value);
				const alpha = extractAlphaFromValue(key.value);
				system.addColorGradient(key.pos, new Color4(color.r, color.g, color.b, alpha));
			}
		}
	} else if (behavior.color.keys) {
		const colorKeys = behavior.color.keys;
		for (const key of colorKeys) {
			if (key.value !== undefined && key.pos !== undefined) {
				const color = extractColorFromValue(key.value);
				const alpha = extractAlphaFromValue(key.value);
				system.addColorGradient(key.pos, new Color4(color.r, color.g, color.b, alpha));
			}
		}
	}

	// Update alpha for existing gradients if alpha keys are specified
	if (behavior.color.alpha && behavior.color.alpha.keys) {
		const alphaKeys = behavior.color.alpha.keys;
		for (const key of alphaKeys) {
			if (key.value !== undefined) {
				const pos = key.pos ?? key.time ?? 0;
				const alpha = extractAlphaFromValue(key.value);
				// Get existing gradients and update alpha
				const gradients = system._colorGradients.getGradients();
				const existingGradient = gradients.find((g: any) => Math.abs(g.gradient - pos) < 0.001);
				if (existingGradient) {
					existingGradient.value.a = alpha;
				} else {
					system.addColorGradient(pos, new Color4(1, 1, 1, alpha));
				}
			}
		}
	}
}
