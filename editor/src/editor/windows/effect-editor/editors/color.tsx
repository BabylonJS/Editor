import { ReactNode } from "react";
import { Color4 } from "@babylonjs/core/Maths/math.color";

import { EditorInspectorColorField } from "../../../layout/inspector/fields/color";
import { EditorInspectorColorGradientField } from "../../../layout/inspector/fields/gradient";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { type Color, parseConstantColor } from "../types";
import type { EditorColorArray } from "../quarks-adapter";

export type EffectColorType = "ConstantColor" | "ColorRange" | "Gradient" | "RandomColor" | "RandomColorBetweenGradient";

function toEditorColorKeys(keys: Array<{ pos?: number; value: unknown }>): Array<{ pos: number; value: EditorColorArray }> {
	return keys.map((key) => ({
		pos: Number(key.pos ?? 0),
		value: Array.isArray(key.value)
			? [Number(key.value[0] ?? 0), Number(key.value[1] ?? 0), Number(key.value[2] ?? 0), Number(key.value[3] ?? 1)]
			: [0, 0, 0, 1],
	}));
}

function toEditorAlphaKeys(keys: Array<{ pos?: number; value: unknown }> | undefined): Array<{ pos: number; value: number }> {
	return (keys ?? []).map((key) => ({
		pos: Number(key.pos ?? 0),
		value: Number(key.value ?? 1),
	}));
}

export interface IEffectColorEditorProps {
	value: Color | undefined;
	onChange: (newValue: Color) => void;
	label?: string;
}

/**
 * Editor for VEffectColor (ConstantColor, ColorRange, Gradient, RandomColor, RandomColorBetweenGradient)
 * Works directly with VEffectColor types, not wrappers
 */
export function EffectColorEditor(props: IEffectColorEditorProps): ReactNode {
	const { value, onChange, label } = props;

	// Determine current type from value
	let currentType: EffectColorType = "ConstantColor";
	if (value) {
		if (typeof value === "string" || Array.isArray(value)) {
			currentType = "ConstantColor";
		} else if ("type" in value) {
			if (value.type === "ConstantColor") {
				currentType = "ConstantColor";
			} else if (value.type === "ColorRange") {
				currentType = "ColorRange";
			} else if (value.type === "Gradient") {
				currentType = "Gradient";
			} else if (value.type === "RandomColor") {
				currentType = "RandomColor";
			} else if (value.type === "RandomColorBetweenGradient") {
				currentType = "RandomColorBetweenGradient";
			}
		}
	}

	const typeItems = [
		{ text: "Color", value: "ConstantColor" },
		{ text: "Color Range", value: "ColorRange" },
		{ text: "Gradient", value: "Gradient" },
		{ text: "Random Color", value: "RandomColor" },
		{ text: "Random Between Gradient", value: "RandomColorBetweenGradient" },
	];

	// Wrapper object for EditorInspectorListField
	const wrapper = {
		get type() {
			return currentType;
		},
		set type(newType: EffectColorType) {
			currentType = newType;
			// Convert value to new type
			let newValue: Color;
			const currentColor = value ? parseConstantColor(value) : new Color4(1, 1, 1, 1);
			if (newType === "ConstantColor") {
				newValue = { type: "ConstantColor", color: [currentColor.r, currentColor.g, currentColor.b, currentColor.a] };
			} else if (newType === "ColorRange") {
				newValue = {
					type: "ColorRange",
					a: [currentColor.r, currentColor.g, currentColor.b, currentColor.a],
					b: [1, 1, 1, 1],
				};
			} else if (newType === "Gradient") {
				newValue = {
					type: "Gradient",
					colorKeys: [
						{ pos: 0, value: [currentColor.r, currentColor.g, currentColor.b, currentColor.a] },
						{ pos: 1, value: [1, 1, 1, 1] },
					],
					alphaKeys: [
						{ pos: 0, value: currentColor.a },
						{ pos: 1, value: 1 },
					],
				};
			} else if (newType === "RandomColor") {
				newValue = {
					type: "RandomColor",
					a: [currentColor.r, currentColor.g, currentColor.b, currentColor.a],
					b: [1, 1, 1, 1],
				};
			} else {
				// RandomColorBetweenGradient
				newValue = {
					type: "RandomColorBetweenGradient",
					gradient1: {
						type: "Gradient",
						colorKeys: [
							{ pos: 0, value: [currentColor.r, currentColor.g, currentColor.b, currentColor.a] },
							{ pos: 1, value: [1, 1, 1, 1] },
						],
						alphaKeys: [
							{ pos: 0, value: currentColor.a },
							{ pos: 1, value: 1 },
						],
					},
					gradient2: {
						type: "Gradient",
						colorKeys: [
							{ pos: 0, value: [1, 0, 0, 1] },
							{ pos: 1, value: [0, 1, 0, 1] },
						],
						alphaKeys: [
							{ pos: 0, value: 1 },
							{ pos: 1, value: 1 },
						],
					},
				};
			}
			onChange(newValue);
		},
	};

	return (
		<>
			<EditorInspectorListField
				object={wrapper}
				property="type"
				label={label || ""}
				items={typeItems}
				onChange={() => {
					// Type change is handled by setter
				}}
			/>

			{currentType === "ConstantColor" && (
				<>
					{(() => {
						const constantColor = value ? parseConstantColor(value) : new Color4(1, 1, 1, 1);
						const wrapperColor = {
							get color() {
								return constantColor;
							},
							set color(newColor: Color4) {
								onChange({ type: "ConstantColor", color: [newColor.r, newColor.g, newColor.b, newColor.a] });
							},
						};
						return <EditorInspectorColorField object={wrapperColor} property="color" label="Color" onChange={() => {}} />;
					})()}
				</>
			)}

			{currentType === "ColorRange" && (
				<>
					{(() => {
						const colorRange = value && typeof value === "object" && "type" in value && value.type === "ColorRange" ? value : null;
						const colorA = colorRange ? new Color4(colorRange.a[0], colorRange.a[1], colorRange.a[2], colorRange.a[3]) : new Color4(0, 0, 0, 1);
						const colorB = colorRange ? new Color4(colorRange.b[0], colorRange.b[1], colorRange.b[2], colorRange.b[3]) : new Color4(1, 1, 1, 1);
						const wrapperRange = {
							get colorA() {
								return colorA;
							},
							set colorA(newColor: Color4) {
								const currentB = colorRange ? colorRange.b : [1, 1, 1, 1];
								onChange({ type: "ColorRange", a: [newColor.r, newColor.g, newColor.b, newColor.a], b: currentB as [number, number, number, number] });
							},
							get colorB() {
								return colorB;
							},
							set colorB(newColor: Color4) {
								const currentA = colorRange ? colorRange.a : [0, 0, 0, 1];
								onChange({
									type: "ColorRange",
									a: currentA as [number, number, number, number],
									b: [newColor.r, newColor.g, newColor.b, newColor.a] as [number, number, number, number],
								});
							},
						};
						return (
							<>
								<EditorInspectorColorField object={wrapperRange} property="colorA" label="Color A" onChange={() => {}} />
								<EditorInspectorColorField object={wrapperRange} property="colorB" label="Color B" onChange={() => {}} />
							</>
						);
					})()}
				</>
			)}

			{currentType === "Gradient" &&
				(() => {
					const gradientValue = value && typeof value === "object" && "type" in value && value.type === "Gradient" ? value : null;
					const defaultColorKeys = [
						{ pos: 0, value: [0, 0, 0, 1] },
						{ pos: 1, value: [1, 1, 1, 1] },
					];
					const defaultAlphaKeys = [
						{ pos: 0, value: 1 },
						{ pos: 1, value: 1 },
					];
					const wrapperGradient = {
						colorKeys: gradientValue?.colorKeys || defaultColorKeys,
						alphaKeys: gradientValue?.alphaKeys || defaultAlphaKeys,
					};
					return (
						<EditorInspectorColorGradientField
							object={wrapperGradient}
							property=""
							label=""
							onChange={(newColorKeys, newAlphaKeys) => {
								onChange({
									type: "Gradient",
									colorKeys: toEditorColorKeys(newColorKeys),
									alphaKeys: toEditorAlphaKeys(newAlphaKeys),
								});
							}}
						/>
					);
				})()}

			{currentType === "RandomColor" && (
				<>
					{(() => {
						const randomColor = value && typeof value === "object" && "type" in value && value.type === "RandomColor" ? value : null;
						const colorA = randomColor
							? new Color4(randomColor.a[0], randomColor.a[1], randomColor.a[2], randomColor.a[3])
							: new Color4(0, 0, 0, 1);
						const colorB = randomColor
							? new Color4(randomColor.b[0], randomColor.b[1], randomColor.b[2], randomColor.b[3])
							: new Color4(1, 1, 1, 1);
						const wrapperRandom = {
							get colorA() {
								return colorA;
							},
							set colorA(newColor: Color4) {
								const currentB = randomColor ? randomColor.b : [1, 1, 1, 1];
								onChange({ type: "RandomColor", a: [newColor.r, newColor.g, newColor.b, newColor.a], b: currentB as [number, number, number, number] });
							},
							get colorB() {
								return colorB;
							},
							set colorB(newColor: Color4) {
								const currentA = randomColor ? randomColor.a : [0, 0, 0, 1];
								onChange({
									type: "RandomColor",
									a: currentA as [number, number, number, number],
									b: [newColor.r, newColor.g, newColor.b, newColor.a] as [number, number, number, number],
								});
							},
						};
						return (
							<>
								<EditorInspectorColorField object={wrapperRandom} property="colorA" label="Color A" onChange={() => {}} />
								<EditorInspectorColorField object={wrapperRandom} property="colorB" label="Color B" onChange={() => {}} />
							</>
						);
					})()}
				</>
			)}

			{currentType === "RandomColorBetweenGradient" &&
				(() => {
					const randomGradient = value && typeof value === "object" && "type" in value && value.type === "RandomColorBetweenGradient" ? value : null;
					const defaultColorKeys = [
						{ pos: 0, value: [0, 0, 0, 1] },
						{ pos: 1, value: [1, 1, 1, 1] },
					];
					const defaultAlphaKeys = [
						{ pos: 0, value: 1 },
						{ pos: 1, value: 1 },
					];

					const wrapperGradient1 = {
						colorKeys: randomGradient?.gradient1?.colorKeys || defaultColorKeys,
						alphaKeys: randomGradient?.gradient1?.alphaKeys || defaultAlphaKeys,
					};

					const wrapperGradient2 = {
						colorKeys: randomGradient?.gradient2?.colorKeys || defaultColorKeys,
						alphaKeys: randomGradient?.gradient2?.alphaKeys || defaultAlphaKeys,
					};

					return (
						<>
							<EditorInspectorBlockField>
								<div className="px-2">Gradient 1</div>
								<EditorInspectorColorGradientField
									object={wrapperGradient1}
									property=""
									label=""
									onChange={(newColorKeys, newAlphaKeys) => {
										if (randomGradient) {
											onChange({
												type: "RandomColorBetweenGradient",
												gradient1: {
													type: "Gradient",
													colorKeys: toEditorColorKeys(newColorKeys),
													alphaKeys: toEditorAlphaKeys(newAlphaKeys),
												},
												gradient2: randomGradient.gradient2,
											});
										}
									}}
								/>
							</EditorInspectorBlockField>
							<EditorInspectorBlockField>
								<div className="px-2">Gradient 2</div>
								<EditorInspectorColorGradientField
									object={wrapperGradient2}
									property=""
									label=""
									onChange={(newColorKeys, newAlphaKeys) => {
										if (randomGradient) {
											onChange({
												type: "RandomColorBetweenGradient",
												gradient1: randomGradient.gradient1,
												gradient2: {
													type: "Gradient",
													colorKeys: toEditorColorKeys(newColorKeys),
													alphaKeys: toEditorAlphaKeys(newAlphaKeys),
												},
											});
										}
									}}
								/>
							</EditorInspectorBlockField>
						</>
					);
				})()}
		</>
	);
}
