import type { IGradientKey } from "./gradients";

/**
 *  color types (converted from Quarks)
 */
export interface IConstantColor {
	type: "ConstantColor";
	value: [number, number, number, number]; // RGBA
}

export interface IColorRange {
	type: "ColorRange";
	colorA: [number, number, number, number]; // RGBA
	colorB: [number, number, number, number]; // RGBA
}

export interface IGradientColor {
	type: "Gradient";
	colorKeys: IGradientKey[];
	alphaKeys?: IGradientKey[];
}

export interface IRandomColor {
	type: "RandomColor";
	colorA: [number, number, number, number]; // RGBA
	colorB: [number, number, number, number]; // RGBA
}

export interface IRandomColorBetweenGradient {
	type: "RandomColorBetweenGradient";
	gradient1: {
		colorKeys: IGradientKey[];
		alphaKeys?: IGradientKey[];
	};
	gradient2: {
		colorKeys: IGradientKey[];
		alphaKeys?: IGradientKey[];
	};
}

export type Color = IConstantColor | IColorRange | IGradientColor | IRandomColor | IRandomColorBetweenGradient | [number, number, number, number] | string;
