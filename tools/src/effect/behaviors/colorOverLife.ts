import { Color4 } from "@babylonjs/core/Maths/math.color";
import type { IColorOverLifeBehavior } from "../types";
import { extractColorFromValue, extractAlphaFromValue } from "./utils";
import type { EffectSolidParticleSystem, EffectParticleSystem } from "../systems";
/**
 * Apply ColorOverLife behavior to ParticleSystem
 * Uses unified IColorFunction structure: behavior.color = { colorFunctionType, data }
 */
export function applyColorOverLifePS(particleSystem: EffectParticleSystem, behavior: IColorOverLifeBehavior | any): void {
	// New unified structure: behavior.color is IColorFunction
	const colorFunction = behavior.color;
	if (!colorFunction) {
		return;
	}

	const colorFunctionType = colorFunction.colorFunctionType;
	const data = colorFunction.data;

	// Handle ConstantColor
	if (colorFunctionType === "ConstantColor" && data?.color) {
		const color = data.color;
		particleSystem.color1 = new Color4(color.r, color.g, color.b, color.a);
		particleSystem.color2 = new Color4(color.r, color.g, color.b, color.a);
		return;
	}

	// Handle RandomColorBetweenGradient - apply first gradient (TODO: implement proper random selection per particle)
	if (colorFunctionType === "RandomColorBetweenGradient" && data?.gradient1) {
		const colorKeys = data.gradient1.colorKeys || [];
		const alphaKeys = data.gradient1.alphaKeys || [];

		// Apply first gradient
		for (const key of colorKeys) {
			if (key.value !== undefined && key.pos !== undefined) {
				let color: { r: number; g: number; b: number };
				let alpha: number;

				if (Array.isArray(key.value)) {
					color = { r: key.value[0], g: key.value[1], b: key.value[2] };
					alpha = key.value[3] !== undefined ? key.value[3] : 1;
				} else {
					color = extractColorFromValue(key.value);
					alpha = extractAlphaFromValue(key.value);
				}

				particleSystem.addColorGradient(key.pos, new Color4(color.r, color.g, color.b, alpha));
			}
		}

		for (const key of alphaKeys) {
			if (key.value !== undefined && key.pos !== undefined) {
				const alpha = typeof key.value === "number" ? key.value : extractAlphaFromValue(key.value);
				const existingGradients = particleSystem.getColorGradients();
				const existingGradient = existingGradients?.find((g) => Math.abs(g.gradient - key.pos) < 0.001);
				if (existingGradient) {
					existingGradient.color1.a = alpha;
					if (existingGradient.color2) {
						existingGradient.color2.a = alpha;
					}
				} else {
					particleSystem.addColorGradient(key.pos, new Color4(1, 1, 1, alpha));
				}
			}
		}
		return;
	}

	// Handle Gradient
	if (colorFunctionType === "Gradient" && data) {
		const colorKeys = data.colorKeys || [];
		const alphaKeys = data.alphaKeys || [];

		// Apply color keys
		for (const key of colorKeys) {
			if (key.value !== undefined && key.pos !== undefined) {
				let color: { r: number; g: number; b: number };
				let alpha: number;

				if (Array.isArray(key.value)) {
					// UI format: [r, g, b, a]
					color = { r: key.value[0], g: key.value[1], b: key.value[2] };
					alpha = key.value[3] !== undefined ? key.value[3] : 1;
				} else {
					// Quarks format: extract from value
					color = extractColorFromValue(key.value);
					alpha = extractAlphaFromValue(key.value);
				}

				particleSystem.addColorGradient(key.pos, new Color4(color.r, color.g, color.b, alpha));
			}
		}

		// Apply alpha keys (merge with existing color gradients)
		for (const key of alphaKeys) {
			if (key.value !== undefined && key.pos !== undefined) {
				const alpha = typeof key.value === "number" ? key.value : extractAlphaFromValue(key.value);
				const existingGradients = particleSystem.getColorGradients();
				const existingGradient = existingGradients?.find((g) => Math.abs(g.gradient - key.pos) < 0.001);
				if (existingGradient) {
					existingGradient.color1.a = alpha;
					if (existingGradient.color2) {
						existingGradient.color2.a = alpha;
					}
				} else {
					particleSystem.addColorGradient(key.pos, new Color4(1, 1, 1, alpha));
				}
			}
		}
	}
}

/**
 * Apply ColorOverLife behavior to SolidParticleSystem
 * Uses unified IColorFunction structure: behavior.color = { colorFunctionType, data }
 */
export function applyColorOverLifeSPS(system: EffectSolidParticleSystem, behavior: IColorOverLifeBehavior | any): void {
	// New unified structure: behavior.color is IColorFunction
	const colorFunction = behavior.color;
	if (!colorFunction) {
		return;
	}

	const colorFunctionType = colorFunction.colorFunctionType;
	const data = colorFunction.data;
	let colorKeys: any[] = [];
	let alphaKeys: any[] = [];

	// Handle ConstantColor
	if (colorFunctionType === "ConstantColor" && data?.color) {
		const color = data.color;
		system.color1 = new Color4(color.r, color.g, color.b, color.a);
		system.color2 = new Color4(color.r, color.g, color.b, color.a);
		return;
	}

	// Handle RandomColorBetweenGradient - apply first gradient (TODO: implement proper random selection per particle)
	if (colorFunctionType === "RandomColorBetweenGradient" && data?.gradient1) {
		colorKeys = data.gradient1.colorKeys || [];
		alphaKeys = data.gradient1.alphaKeys || [];
	} else if (colorFunctionType === "Gradient" && data) {
		colorKeys = data.colorKeys || [];
		alphaKeys = data.alphaKeys || [];
	} else {
		return;
	}

	// Collect all unique positions from both color and alpha keys
	const allPositions = new Set<number>();
	for (const key of colorKeys) {
		if (key.pos !== undefined) {
			allPositions.add(key.pos);
		}
	}
	for (const key of alphaKeys) {
		const pos = key.pos ?? key.time ?? 0;
		allPositions.add(pos);
	}

	if (allPositions.size === 0) {
		return;
	}

	// Sort positions and create gradients at each position
	const sortedPositions = Array.from(allPositions).sort((a, b) => a - b);
	for (const pos of sortedPositions) {
		// Get color at this position
		let color = { r: 1, g: 1, b: 1 };
		if (colorKeys.length > 0) {
			const exactColorKey = colorKeys.find((k) => k.pos !== undefined && Math.abs(k.pos - pos) < 0.001);
			if (exactColorKey && exactColorKey.value !== undefined) {
				if (Array.isArray(exactColorKey.value)) {
					color = { r: exactColorKey.value[0], g: exactColorKey.value[1], b: exactColorKey.value[2] };
				} else {
					color = extractColorFromValue(exactColorKey.value);
				}
			} else {
				// Interpolate color from surrounding keys
				color = interpolateColorFromKeys(colorKeys, pos);
			}
		}

		// Get alpha at this position
		let alpha = 1;
		if (alphaKeys.length > 0) {
			const exactAlphaKey = alphaKeys.find((k) => {
				const kPos = k.pos ?? k.time ?? 0;
				return Math.abs(kPos - pos) < 0.001;
			});
			if (exactAlphaKey && exactAlphaKey.value !== undefined) {
				if (typeof exactAlphaKey.value === "number") {
					alpha = exactAlphaKey.value;
				} else {
					alpha = extractAlphaFromValue(exactAlphaKey.value);
				}
			} else {
				// Interpolate alpha from surrounding keys
				alpha = interpolateAlphaFromKeys(alphaKeys, pos);
			}
		} else if (colorKeys.length > 0) {
			// If no alpha keys, try to get alpha from color key
			const exactColorKey = colorKeys.find((k) => k.pos !== undefined && Math.abs(k.pos - pos) < 0.001);
			if (exactColorKey && exactColorKey.value !== undefined) {
				if (Array.isArray(exactColorKey.value)) {
					alpha = exactColorKey.value[3] !== undefined ? exactColorKey.value[3] : 1;
				} else {
					alpha = extractAlphaFromValue(exactColorKey.value);
				}
			}
		}

		system.addColorGradient(pos, new Color4(color.r, color.g, color.b, alpha));
	}
}

/**
 * Interpolate color from gradient keys at a given position
 */
function interpolateColorFromKeys(keys: any[], pos: number): { r: number; g: number; b: number } {
	if (keys.length === 0) {
		return { r: 1, g: 1, b: 1 };
	}
	if (keys.length === 1) {
		const value = keys[0].value;
		return Array.isArray(value) ? { r: value[0], g: value[1], b: value[2] } : extractColorFromValue(value);
	}

	// Find surrounding keys
	let before = keys[0];
	let after = keys[keys.length - 1];
	for (let i = 0; i < keys.length - 1; i++) {
		const k1 = keys[i];
		const k2 = keys[i + 1];
		if (k1.pos !== undefined && k2.pos !== undefined && k1.pos <= pos && k2.pos >= pos) {
			before = k1;
			after = k2;
			break;
		}
	}

	if (before === after) {
		const value = before.value;
		return Array.isArray(value) ? { r: value[0], g: value[1], b: value[2] } : extractColorFromValue(value);
	}

	// Interpolate
	const t = (pos - (before.pos ?? 0)) / ((after.pos ?? 1) - (before.pos ?? 0));
	const c1 = Array.isArray(before.value) ? { r: before.value[0], g: before.value[1], b: before.value[2] } : extractColorFromValue(before.value);
	const c2 = Array.isArray(after.value) ? { r: after.value[0], g: after.value[1], b: after.value[2] } : extractColorFromValue(after.value);

	return {
		r: c1.r + (c2.r - c1.r) * t,
		g: c1.g + (c2.g - c1.g) * t,
		b: c1.b + (c2.b - c1.b) * t,
	};
}

/**
 * Interpolate alpha from gradient keys at a given position
 */
function interpolateAlphaFromKeys(keys: any[], pos: number): number {
	if (keys.length === 0) {
		return 1;
	}
	if (keys.length === 1) {
		const value = keys[0].value;
		return typeof value === "number" ? value : extractAlphaFromValue(value);
	}

	// Find surrounding keys
	let before = keys[0];
	let after = keys[keys.length - 1];
	for (let i = 0; i < keys.length - 1; i++) {
		const k1 = keys[i];
		const k2 = keys[i + 1];
		const k1Pos = k1.pos ?? k1.time ?? 0;
		const k2Pos = k2.pos ?? k2.time ?? 1;
		if (k1Pos <= pos && k2Pos >= pos) {
			before = k1;
			after = k2;
			break;
		}
	}

	if (before === after) {
		const value = before.value;
		return typeof value === "number" ? value : extractAlphaFromValue(value);
	}

	// Interpolate
	const beforePos = before.pos ?? before.time ?? 0;
	const afterPos = after.pos ?? after.time ?? 1;
	const t = (pos - beforePos) / (afterPos - beforePos);
	const a1 = typeof before.value === "number" ? before.value : extractAlphaFromValue(before.value);
	const a2 = typeof after.value === "number" ? after.value : extractAlphaFromValue(after.value);

	return a1 + (a2 - a1) * t;
}
