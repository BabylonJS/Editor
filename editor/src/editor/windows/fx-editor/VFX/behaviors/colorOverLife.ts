import { Color4 } from "@babylonjs/core/Maths/math.color";
import type { SolidParticle } from "@babylonjs/core/Particles/solidParticle";
import type { VFXColorOverLifeBehavior } from "../types/behaviors";
import { extractColorFromValue, extractAlphaFromValue, interpolateColorKeys, interpolateGradientKeys } from "./utils";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";

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
 * Apply ColorOverLife behavior to SolidParticle
 */
export function applyColorOverLifeSPS(particle: SolidParticle, behavior: VFXColorOverLifeBehavior, lifeRatio: number): void {
	if (!behavior.color || !particle.color) {
		return;
	}

	const colorKeys = behavior.color.color?.keys ?? behavior.color.keys;
	if (!colorKeys || !Array.isArray(colorKeys)) {
		return;
	}

	const interpolatedColor = interpolateColorKeys(colorKeys, lifeRatio);
	const startColor = particle.props?.startColor;

	if (startColor) {
		// Multiply with startColor (matching three.quarks behavior)
		particle.color.r = interpolatedColor.r * startColor.r;
		particle.color.g = interpolatedColor.g * startColor.g;
		particle.color.b = interpolatedColor.b * startColor.b;
	} else {
		particle.color.r = interpolatedColor.r;
		particle.color.g = interpolatedColor.g;
		particle.color.b = interpolatedColor.b;
	}

	// Apply alpha if specified
	if (behavior.color.alpha?.keys) {
		const alphaKeys = behavior.color.alpha.keys;
		const alpha = interpolateGradientKeys(alphaKeys, lifeRatio, extractAlphaFromValue);
		particle.color.a = alpha;
	} else {
		particle.color.a = interpolatedColor.a;
	}
}
