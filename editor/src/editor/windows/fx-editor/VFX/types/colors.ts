import type { VFXGradientKey } from "./gradients";

/**
 * VFX color types (converted from Quarks)
 */
export interface VFXConstantColor {
	type: "ConstantColor";
	value: [number, number, number, number]; // RGBA
}

export interface VFXColorRange {
	type: "ColorRange";
	colorA: [number, number, number, number]; // RGBA
	colorB: [number, number, number, number]; // RGBA
}

export interface VFXGradientColor {
	type: "Gradient";
	colorKeys: VFXGradientKey[];
	alphaKeys?: VFXGradientKey[];
}

export interface VFXRandomColor {
	type: "RandomColor";
	colorA: [number, number, number, number]; // RGBA
	colorB: [number, number, number, number]; // RGBA
}

export interface VFXRandomColorBetweenGradient {
	type: "RandomColorBetweenGradient";
	gradient1: {
		colorKeys: VFXGradientKey[];
		alphaKeys?: VFXGradientKey[];
	};
	gradient2: {
		colorKeys: VFXGradientKey[];
		alphaKeys?: VFXGradientKey[];
	};
}

export type VFXColor = VFXConstantColor | VFXColorRange | VFXGradientColor | VFXRandomColor | VFXRandomColorBetweenGradient | [number, number, number, number] | string;
