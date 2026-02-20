import { Color4 } from "@babylonjs/core/Maths/math.color";
import type { IConstantColor, IGradientColor, IRandomColor, IRandomColorBetweenGradient } from "babylonjs-editor-tools/src/effect/types";
import { getUnityProp } from "./utils";

/**
 * Convert Unity Color to our Color4
 */
export function convertColor(unityColor: { r: string; g: string; b: string; a: string }): Color4 {
	return new Color4(parseFloat(unityColor.r), parseFloat(unityColor.g), parseFloat(unityColor.b), parseFloat(unityColor.a));
}

/**
 * Convert Unity Gradient to our Color (supports m_NumColorKeys / numColorKeys etc.)
 */
export function convertGradient(gradient: any): IConstantColor | IGradientColor {
	const numColorKeys = getUnityProp(gradient, "numColorKeys") ?? gradient.m_NumColorKeys ?? 0;
	const numAlphaKeys = getUnityProp(gradient, "numAlphaKeys") ?? gradient.m_NumAlphaKeys ?? 0;
	const colorKeys: Array<{ time: number; value: [number, number, number, number] }> = [];

	for (let i = 0; i < numColorKeys; i++) {
		const key = gradient[`key${i}`] ?? gradient[`m_ColorKeys`]?.[i];
		const timeRaw = gradient[`ctime${i}`] ?? gradient[`m_CTime${i}`] ?? 0;
		const time = typeof timeRaw === "number" ? timeRaw : parseFloat(timeRaw) / 65535;
		if (!key) continue;
		const r = key.r ?? key.m_R;
		const g = key.g ?? key.m_G;
		const b = key.b ?? key.m_B;
		colorKeys.push({
			time,
			value: [parseFloat(r ?? "1"), parseFloat(g ?? "1"), parseFloat(b ?? "1"), 1],
		});
	}

	const alphaKeys: Array<{ time: number; value: number }> = [];
	for (let i = 0; i < numAlphaKeys; i++) {
		const key = gradient[`key${i}`] ?? gradient[`m_AlphaKeys`]?.[i];
		const timeRaw = gradient[`atime${i}`] ?? gradient[`m_ATime${i}`] ?? 0;
		const time = typeof timeRaw === "number" ? timeRaw : parseFloat(timeRaw) / 65535;
		if (!key) continue;
		alphaKeys.push({
			time,
			value: parseFloat(key.a ?? key.m_A ?? "1"),
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
 * Convert Unity MinMaxGradient to our Color (supports m_MinMaxState, m_MaxColor, etc.)
 */
export function convertMinMaxGradient(minMaxGradient: any): IConstantColor | IGradientColor | IRandomColor | IRandomColorBetweenGradient {
	const minMaxState = String(getUnityProp(minMaxGradient, "minMaxState") ?? minMaxGradient.minMaxState ?? "0");
	const maxColor = getUnityProp(minMaxGradient, "maxColor") ?? minMaxGradient.maxColor ?? {};
	const minColor = getUnityProp(minMaxGradient, "minColor") ?? minMaxGradient.minColor ?? {};
	const maxGradient = getUnityProp(minMaxGradient, "maxGradient") ?? minMaxGradient.maxGradient;
	const minGradient = getUnityProp(minMaxGradient, "minGradient") ?? minMaxGradient.minGradient;

	const toRgba = (c: any): [number, number, number, number] => [
		parseFloat(c?.r ?? c?.m_R ?? "1"),
		parseFloat(c?.g ?? c?.m_G ?? "1"),
		parseFloat(c?.b ?? c?.m_B ?? "1"),
		parseFloat(c?.a ?? c?.m_A ?? "1"),
	];

	switch (minMaxState) {
		case "0":
			return { type: "ConstantColor", value: toRgba(maxColor) };
		case "1":
			return convertGradient(maxGradient ?? {});
		case "2":
			return {
				type: "RandomColor",
				colorA: toRgba(minColor),
				colorB: toRgba(maxColor),
			};
		case "3": {
			const grad1 = convertGradient(minGradient ?? {});
			const grad2 = convertGradient(maxGradient ?? {});
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
			return { type: "ConstantColor", value: [1, 1, 1, 1] };
		}
		default:
			return { type: "ConstantColor", value: [1, 1, 1, 1] };
	}
}
