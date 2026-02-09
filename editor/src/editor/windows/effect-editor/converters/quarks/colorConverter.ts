import { Color4 } from "@babylonjs/core/Maths/math.color";
import type {
	IQuarksColor,
	IQuarksStartColor,
	IQuarksGradientKey,
	IQuarksGradientColor,
	IQuarksConstantColorColor,
} from "./types";
import type { IGradientKey } from "babylonjs-editor-tools";
import { DEFAULT_COLOR } from "./constants";

/**
 * Helper: Create Color4 from RGBA with fallbacks
 */
export function createColor4(r: number | undefined, g: number | undefined, b: number | undefined, a: number | undefined = 1): Color4 {
	return new Color4(r ?? 1, g ?? 1, b ?? 1, a ?? 1);
}

/**
 * Helper: Create Color4 from array
 */
export function createColor4FromArray(arr: [number, number, number, number] | undefined): Color4 {
	return createColor4(arr?.[0], arr?.[1], arr?.[2], arr?.[3]);
}

/**
 * Helper: Create Color4 from RGBA object
 */
export function createColor4FromRGBA(rgba: { r: number; g: number; b: number; a?: number } | undefined): Color4 {
	return rgba ? createColor4(rgba.r, rgba.g, rgba.b, rgba.a) : createColor4(1, 1, 1, 1);
}

/**
 * Extract color from ConstantColor behavior
 */
export function extractConstantColor(constantColor: IQuarksConstantColorColor): { r: number; g: number; b: number; a: number } {
	if (constantColor.color) {
		return {
			r: constantColor.color.r,
			g: constantColor.color.g,
			b: constantColor.color.b,
			a: constantColor.color.a ?? 1,
		};
	}
	if (constantColor.value && Array.isArray(constantColor.value) && constantColor.value.length >= 4) {
		return {
			r: constantColor.value[0],
			g: constantColor.value[1],
			b: constantColor.value[2],
			a: constantColor.value[3],
		};
	}
	return DEFAULT_COLOR;
}

/**
 * Extract Color4 from gradient key value
 */
export function extractColorFromGradientKey(key: IQuarksGradientKey): Color4 {
	if (Array.isArray(key.value)) {
		return createColor4FromArray(key.value as [number, number, number, number]);
	}
	if (typeof key.value === "object" && key.value !== null && "r" in key.value) {
		return createColor4FromRGBA(key.value as { r: number; g: number; b: number; a?: number });
	}
	return createColor4(1, 1, 1, 1);
}

/**
 * Convert IQuarks gradient key to gradient key
 */
export function convertGradientKey(key: IQuarksGradientKey): IGradientKey {
	return {
		time: key.time,
		value: key.value,
		pos: key.pos,
	};
}

/**
 * Convert IQuarks color to native Babylon.js Color4 (color1, color2)
 */
export function convertColorToColor4(color: IQuarksColor): { color1: Color4; color2: Color4 } {
	if (Array.isArray(color)) {
		const c = createColor4FromArray(color as [number, number, number, number]);
		return { color1: c, color2: c };
	}

	if (typeof color === "object" && color !== null && "type" in color) {
		if (color.type === "ConstantColor") {
			const constColor = color as IQuarksConstantColorColor;
			if (constColor.value && Array.isArray(constColor.value)) {
				const c = createColor4FromArray(constColor.value);
				return { color1: c, color2: c };
			}
			if (constColor.color) {
				const c = createColor4FromRGBA(constColor.color);
				return { color1: c, color2: c };
			}
		}
		// Handle RandomColor (interpolation between two colors)
		const randomColor = color as { type: string; a?: [number, number, number, number]; b?: [number, number, number, number] };
		if (randomColor.type === "RandomColor" && randomColor.a && randomColor.b) {
			const color1 = createColor4FromArray(randomColor.a);
			const color2 = createColor4FromArray(randomColor.b);
			return { color1, color2 };
		}
	}

	const white = createColor4(1, 1, 1, 1);
	return { color1: white, color2: white };
}

/**
 * Convert IQuarksStartColor to native Babylon.js Color4 (color1, color2)
 */
export function convertStartColorToColor4(startColor: IQuarksStartColor): { color1: Color4; color2: Color4 } {
	// Handle Gradient type
	if (typeof startColor === "object" && startColor !== null && "type" in startColor) {
		if (startColor.type === "Gradient") {
			// For Gradient, extract color from CLinearFunction if available
			const gradientColor = startColor as IQuarksGradientColor;
			if (gradientColor.color?.keys && gradientColor.color.keys.length > 0) {
				const firstKey = gradientColor.color.keys[0];
				const lastKey = gradientColor.color.keys[gradientColor.color.keys.length - 1];
				const color1 = extractColorFromGradientKey(firstKey);
				const color2 = extractColorFromGradientKey(lastKey);
				return { color1, color2 };
			}
		}
		if (startColor.type === "ColorRange") {
			// For ColorRange, use a and b colors
			const colorRange = startColor as {
				type: string;
				a?: { r: number; g: number; b: number; a?: number };
				b?: { r: number; g: number; b: number; a?: number };
			};
			const color1 = createColor4FromRGBA(colorRange.a);
			const color2 = createColor4FromRGBA(colorRange.b);
			return { color1, color2 };
		}
	}
	// Otherwise treat as IQuarksColor
	return convertColorToColor4(startColor as IQuarksColor);
}
