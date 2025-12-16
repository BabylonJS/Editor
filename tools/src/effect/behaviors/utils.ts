import type { GradientKey } from "../types/gradients";

/**
 * Extract RGB color from gradient key value
 */
export function extractColorFromValue(value: number | number[] | { r: number; g: number; b: number; a?: number } | undefined): { r: number; g: number; b: number } {
	if (value === undefined) {
		return { r: 1, g: 1, b: 1 };
	}

	if (typeof value === "number") {
		return { r: value, g: value, b: value };
	}

	if (Array.isArray(value)) {
		return {
			r: value[0] || 0,
			g: value[1] || 0,
			b: value[2] || 0,
		};
	}

	if (typeof value === "object" && "r" in value) {
		return {
			r: value.r || 0,
			g: value.g || 0,
			b: value.b || 0,
		};
	}

	return { r: 1, g: 1, b: 1 };
}

/**
 * Extract alpha from gradient key value
 */
export function extractAlphaFromValue(value: number | number[] | { r: number; g: number; b: number; a?: number } | undefined): number {
	if (value === undefined) {
		return 1;
	}

	if (typeof value === "number") {
		return value;
	}

	if (Array.isArray(value)) {
		return value[3] !== undefined ? value[3] : 1;
	}

	if (typeof value === "object" && "a" in value) {
		return value.a !== undefined ? value.a : 1;
	}

	return 1;
}

/**
 * Extract number from gradient key value
 */
export function extractNumberFromValue(value: number | number[] | { r: number; g: number; b: number; a?: number } | undefined): number {
	if (value === undefined) {
		return 1;
	}

	if (typeof value === "number") {
		return value;
	}

	if (Array.isArray(value)) {
		return value[0] || 0;
	}

	return 1;
}

/**
 * Interpolate between two gradient keys
 */
export function interpolateGradientKeys(
	keys: GradientKey[],
	ratio: number,
	extractValue: (value: number | number[] | { r: number; g: number; b: number; a?: number } | undefined) => number
): number {
	if (!keys || keys.length === 0) {
		return 1;
	}

	if (keys.length === 1) {
		return extractValue(keys[0].value);
	}

	// Find the two keys to interpolate between
	for (let i = 0; i < keys.length - 1; i++) {
		const pos1 = keys[i].pos ?? keys[i].time ?? 0;
		const pos2 = keys[i + 1].pos ?? keys[i + 1].time ?? 1;

		if (ratio >= pos1 && ratio <= pos2) {
			const t = pos2 - pos1 !== 0 ? (ratio - pos1) / (pos2 - pos1) : 0;
			const val1 = extractValue(keys[i].value);
			const val2 = extractValue(keys[i + 1].value);
			return val1 + (val2 - val1) * t;
		}
	}

	// Clamp to first or last key
	if (ratio <= (keys[0].pos ?? keys[0].time ?? 0)) {
		return extractValue(keys[0].value);
	}
	return extractValue(keys[keys.length - 1].value);
}

/**
 * Interpolate color between two gradient keys
 */
export function interpolateColorKeys(keys: GradientKey[], ratio: number): { r: number; g: number; b: number; a: number } {
	if (!keys || keys.length === 0) {
		return { r: 1, g: 1, b: 1, a: 1 };
	}

	if (keys.length === 1) {
		const val = keys[0].value;
		return {
			...extractColorFromValue(val),
			a: extractAlphaFromValue(val),
		};
	}

	// Find the two keys to interpolate between
	for (let i = 0; i < keys.length - 1; i++) {
		const pos1 = keys[i].pos ?? keys[i].time ?? 0;
		const pos2 = keys[i + 1].pos ?? keys[i + 1].time ?? 1;

		if (ratio >= pos1 && ratio <= pos2) {
			const t = pos2 - pos1 !== 0 ? (ratio - pos1) / (pos2 - pos1) : 0;
			const val1 = keys[i].value;
			const val2 = keys[i + 1].value;

			const c1 = extractColorFromValue(val1);
			const c2 = extractColorFromValue(val2);
			const a1 = extractAlphaFromValue(val1);
			const a2 = extractAlphaFromValue(val2);

			return {
				r: c1.r + (c2.r - c1.r) * t,
				g: c1.g + (c2.g - c1.g) * t,
				b: c1.b + (c2.b - c1.b) * t,
				a: a1 + (a2 - a1) * t,
			};
		}
	}

	// Clamp to first or last key
	if (ratio <= (keys[0].pos ?? keys[0].time ?? 0)) {
		const val = keys[0].value;
		return {
			...extractColorFromValue(val),
			a: extractAlphaFromValue(val),
		};
	}
	const val = keys[keys.length - 1].value;
	return {
		...extractColorFromValue(val),
		a: extractAlphaFromValue(val),
	};
}
