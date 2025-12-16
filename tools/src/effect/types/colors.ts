import type { GradientKey } from "./gradients";

/**
 *  color types (converted from Quarks)
 */
export interface ConstantColor {
	type: "ConstantColor";
	value: [number, number, number, number]; // RGBA
}

export interface ColorRange {
	type: "ColorRange";
	colorA: [number, number, number, number]; // RGBA
	colorB: [number, number, number, number]; // RGBA
}

export interface GradientColor {
	type: "Gradient";
	colorKeys: GradientKey[];
	alphaKeys?: GradientKey[];
}

export interface RandomColor {
	type: "RandomColor";
	colorA: [number, number, number, number]; // RGBA
	colorB: [number, number, number, number]; // RGBA
}

export interface RandomColorBetweenGradient {
	type: "RandomColorBetweenGradient";
	gradient1: {
		colorKeys: GradientKey[];
		alphaKeys?: GradientKey[];
	};
	gradient2: {
		colorKeys: GradientKey[];
		alphaKeys?: GradientKey[];
	};
}

export type Color = ConstantColor | ColorRange | GradientColor | RandomColor | RandomColorBetweenGradient | [number, number, number, number] | string;
