import { Color4 } from "@babylonjs/core/Maths/math.color";
import type { IConstantColor, IGradientColor, IRandomColor, IRandomColorBetweenGradient } from "babylonjs-editor-tools/src/effect/types";

/**
 * Convert Unity Color to our Color4
 */
export function convertColor(unityColor: { r: string; g: string; b: string; a: string }): Color4 {
	return new Color4(parseFloat(unityColor.r), parseFloat(unityColor.g), parseFloat(unityColor.b), parseFloat(unityColor.a));
}

/**
 * Convert Unity Gradient to our Color
 */
export function convertGradient(gradient: any): IConstantColor | IGradientColor {
	const colorKeys: Array<{ time: number; value: [number, number, number, number] }> = [];

	// Parse color keys
	for (let i = 0; i < gradient.m_NumColorKeys; i++) {
		const key = gradient[`key${i}`];
		const time = parseFloat(gradient[`ctime${i}`]) / 65535; // Unity stores time as 0-65535
		colorKeys.push({
			time,
			value: [parseFloat(key.r), parseFloat(key.g), parseFloat(key.b), 1],
		});
	}

	// Parse alpha keys
	const alphaKeys: Array<{ time: number; value: number }> = [];
	for (let i = 0; i < gradient.m_NumAlphaKeys; i++) {
		const key = gradient[`key${i}`];
		const time = parseFloat(gradient[`atime${i}`]) / 65535;
		alphaKeys.push({
			time,
			value: parseFloat(key.a),
		});
	}

	// If only one color key and one alpha key, return constant color
	if (colorKeys.length === 1 && alphaKeys.length === 1) {
		return {
			type: "ConstantColor",
			value: [...colorKeys[0].value.slice(0, 3), alphaKeys[0].value] as [number, number, number, number],
		};
	}

	// Return gradient
	return {
		type: "Gradient",
		colorKeys: colorKeys.map((k) => ({ time: k.time, value: k.value as [number, number, number, number] })),
		alphaKeys: alphaKeys.map((k) => ({ time: k.time, value: k.value })),
	};
}

/**
 * Convert Unity MinMaxGradient to our Color
 */
export function convertMinMaxGradient(minMaxGradient: any): IConstantColor | IGradientColor | IRandomColor | IRandomColorBetweenGradient {
	const minMaxState = minMaxGradient.minMaxState;

	switch (minMaxState) {
		case "0": // Constant color
			return {
				type: "ConstantColor",
				value: [
					parseFloat(minMaxGradient.maxColor.r),
					parseFloat(minMaxGradient.maxColor.g),
					parseFloat(minMaxGradient.maxColor.b),
					parseFloat(minMaxGradient.maxColor.a),
				] as [number, number, number, number],
			};
		case "1": // Gradient
			return convertGradient(minMaxGradient.maxGradient);
		case "2": // Random between two colors
			return {
				type: "RandomColor",
				colorA: [
					parseFloat(minMaxGradient.minColor.r),
					parseFloat(minMaxGradient.minColor.g),
					parseFloat(minMaxGradient.minColor.b),
					parseFloat(minMaxGradient.minColor.a),
				] as [number, number, number, number],
				colorB: [
					parseFloat(minMaxGradient.maxColor.r),
					parseFloat(minMaxGradient.maxColor.g),
					parseFloat(minMaxGradient.maxColor.b),
					parseFloat(minMaxGradient.maxColor.a),
				] as [number, number, number, number],
			};
		case "3": // Random between two gradients
			const grad1 = convertGradient(minMaxGradient.minGradient);
			const grad2 = convertGradient(minMaxGradient.maxGradient);
			if (grad1.type === "Gradient" && grad2.type === "Gradient") {
				return {
					type: "RandomColorBetweenGradient",
					gradient1: {
						colorKeys: grad1.colorKeys,
						alphaKeys: grad1.alphaKeys,
					},
					gradient2: {
						colorKeys: grad2.colorKeys,
						alphaKeys: grad2.alphaKeys,
					},
				};
			}
			// Fallback to constant color if conversion failed
			return { type: "ConstantColor", value: [1, 1, 1, 1] };
		default:
			return { type: "ConstantColor", value: [1, 1, 1, 1] };
	}
}
