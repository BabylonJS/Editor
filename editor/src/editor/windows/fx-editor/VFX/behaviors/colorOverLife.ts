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
 * Properly combines color and alpha keys even when they have different positions
 */
export function applyColorOverLifeSPS(system: any, behavior: VFXColorOverLifeBehavior): void {
	if (!behavior.color) {
		return;
	}

	// Collect all unique positions from both color and alpha keys
	const allPositions = new Set<number>();

	// Get color keys
	const colorKeys = behavior.color.color?.keys || behavior.color.keys || [];
	for (const key of colorKeys) {
		if (key.pos !== undefined) {
			allPositions.add(key.pos);
		}
	}

	// Get alpha keys
	const alphaKeys = behavior.color.alpha?.keys || [];
	for (const key of alphaKeys) {
		const pos = key.pos ?? key.time ?? 0;
		allPositions.add(pos);
	}

	// If no keys found, return
	if (allPositions.size === 0) {
		return;
	}

	// Sort positions
	const sortedPositions = Array.from(allPositions).sort((a, b) => a - b);

	// For each position, compute color and alpha separately
	for (const pos of sortedPositions) {
		// Find color for this position (interpolate if needed)
		let color = { r: 1, g: 1, b: 1 };
		if (colorKeys.length > 0) {
			// Find the color key at this position or interpolate
			const exactColorKey = colorKeys.find((k) => k.pos !== undefined && Math.abs(k.pos - pos) < 0.001);
			if (exactColorKey && exactColorKey.value !== undefined) {
				color = extractColorFromValue(exactColorKey.value);
			} else {
				// Interpolate color from surrounding keys
				color = interpolateColorFromKeys(colorKeys, pos);
			}
		}

		// Find alpha for this position (interpolate if needed)
		let alpha = 1;
		if (alphaKeys.length > 0) {
			const exactAlphaKey = alphaKeys.find((k) => {
				const kPos = k.pos ?? k.time ?? 0;
				return Math.abs(kPos - pos) < 0.001;
			});
			if (exactAlphaKey && exactAlphaKey.value !== undefined) {
				alpha = extractAlphaFromValue(exactAlphaKey.value);
			} else {
				// Interpolate alpha from surrounding keys
				alpha = interpolateAlphaFromKeys(alphaKeys, pos);
			}
		} else if (colorKeys.length > 0) {
			// If no alpha keys, try to get alpha from color keys
			const exactColorKey = colorKeys.find((k) => k.pos !== undefined && Math.abs(k.pos - pos) < 0.001);
			if (exactColorKey && exactColorKey.value !== undefined) {
				alpha = extractAlphaFromValue(exactColorKey.value);
			}
		}

		// Add gradient with combined color and alpha
		system.addColorGradient(pos, new Color4(color.r, color.g, color.b, alpha));
	}
}

/**
 * Interpolate color from gradient keys at given position
 */
function interpolateColorFromKeys(keys: any[], pos: number): { r: number; g: number; b: number } {
	if (keys.length === 0) {
		return { r: 1, g: 1, b: 1 };
	}

	if (keys.length === 1) {
		return extractColorFromValue(keys[0].value);
	}

	// Find surrounding keys
	for (let i = 0; i < keys.length - 1; i++) {
		const pos1 = keys[i].pos ?? 0;
		const pos2 = keys[i + 1].pos ?? 1;

		if (pos >= pos1 && pos <= pos2) {
			const t = pos2 - pos1 !== 0 ? (pos - pos1) / (pos2 - pos1) : 0;
			const c1 = extractColorFromValue(keys[i].value);
			const c2 = extractColorFromValue(keys[i + 1].value);
			return {
				r: c1.r + (c2.r - c1.r) * t,
				g: c1.g + (c2.g - c1.g) * t,
				b: c1.b + (c2.b - c1.b) * t,
			};
		}
	}

	// Clamp to first or last
	if (pos <= (keys[0].pos ?? 0)) {
		return extractColorFromValue(keys[0].value);
	}
	return extractColorFromValue(keys[keys.length - 1].value);
}

/**
 * Interpolate alpha from gradient keys at given position
 */
function interpolateAlphaFromKeys(keys: any[], pos: number): number {
	if (keys.length === 0) {
		return 1;
	}

	if (keys.length === 1) {
		return extractAlphaFromValue(keys[0].value);
	}

	// Find surrounding keys
	for (let i = 0; i < keys.length - 1; i++) {
		const pos1 = keys[i].pos ?? keys[i].time ?? 0;
		const pos2 = keys[i + 1].pos ?? keys[i + 1].time ?? 1;

		if (pos >= pos1 && pos <= pos2) {
			const t = pos2 - pos1 !== 0 ? (pos - pos1) / (pos2 - pos1) : 0;
			const a1 = extractAlphaFromValue(keys[i].value);
			const a2 = extractAlphaFromValue(keys[i + 1].value);
			return a1 + (a2 - a1) * t;
		}
	}

	// Clamp to first or last
	if (pos <= (keys[0].pos ?? keys[0].time ?? 0)) {
		return extractAlphaFromValue(keys[0].value);
	}
	return extractAlphaFromValue(keys[keys.length - 1].value);
}
