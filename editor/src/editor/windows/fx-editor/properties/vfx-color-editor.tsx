import { ReactNode } from "react";
import { Color4 } from "babylonjs";

import { EditorInspectorColorField } from "../../../layout/inspector/fields/color";
import { EditorInspectorColorGradientField } from "../../../layout/inspector/fields/gradient";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import type { VFXColor, VFXConstantColor, VFXColorRange, VFXGradientColor, VFXRandomColor, VFXRandomColorBetweenGradient } from "../VFX/types/colors";
import { VFXValueUtils } from "../VFX/utils/valueParser";

export type VFXColorType = "ConstantColor" | "ColorRange" | "Gradient" | "RandomColor" | "RandomColorBetweenGradient";

export interface IVFXColorEditorProps {
	value: VFXColor | undefined;
	onChange: (newValue: VFXColor) => void;
	label?: string;
}

/**
 * Editor for VFXColor (ConstantColor, ColorRange, Gradient, RandomColor, RandomColorBetweenGradient)
 * Works directly with VFXColor types, not wrappers
 */
export function VFXColorEditor(props: IVFXColorEditorProps): ReactNode {
	const { value, onChange, label } = props;

	// Determine current type from value
	let currentType: VFXColorType = "ConstantColor";
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
		set type(newType: VFXColorType) {
			currentType = newType;
			// Convert value to new type
			let newValue: VFXColor;
			const currentColor = value ? VFXValueUtils.parseConstantColor(value) : new Color4(1, 1, 1, 1);
			if (newType === "ConstantColor") {
				newValue = { type: "ConstantColor", value: [currentColor.r, currentColor.g, currentColor.b, currentColor.a] };
			} else if (newType === "ColorRange") {
				newValue = {
					type: "ColorRange",
					colorA: [currentColor.r, currentColor.g, currentColor.b, currentColor.a],
					colorB: [1, 1, 1, 1],
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
					colorA: [currentColor.r, currentColor.g, currentColor.b, currentColor.a],
					colorB: [1, 1, 1, 1],
				};
			} else {
				// RandomColorBetweenGradient
				newValue = {
					type: "RandomColorBetweenGradient",
					gradient1: {
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
						const constantColor = value ? VFXValueUtils.parseConstantColor(value) : new Color4(1, 1, 1, 1);
						const wrapperColor = {
							get color() {
								return constantColor;
							},
							set color(newColor: Color4) {
								onChange({ type: "ConstantColor", value: [newColor.r, newColor.g, newColor.b, newColor.a] });
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
						const colorA = colorRange ? new Color4(colorRange.colorA[0], colorRange.colorA[1], colorRange.colorA[2], colorRange.colorA[3]) : new Color4(0, 0, 0, 1);
						const colorB = colorRange ? new Color4(colorRange.colorB[0], colorRange.colorB[1], colorRange.colorB[2], colorRange.colorB[3]) : new Color4(1, 1, 1, 1);
						const wrapperRange = {
							get colorA() {
								return colorA;
							},
							set colorA(newColor: Color4) {
								const currentB = colorRange ? colorRange.colorB : [1, 1, 1, 1];
								onChange({ type: "ColorRange", colorA: [newColor.r, newColor.g, newColor.b, newColor.a], colorB: currentB });
							},
							get colorB() {
								return colorB;
							},
							set colorB(newColor: Color4) {
								const currentA = colorRange ? colorRange.colorA : [0, 0, 0, 1];
								onChange({ type: "ColorRange", colorA: currentA, colorB: [newColor.r, newColor.g, newColor.b, newColor.a] });
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

			{currentType === "Gradient" && (() => {
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
								colorKeys: newColorKeys,
								alphaKeys: newAlphaKeys,
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
							? new Color4(randomColor.colorA[0], randomColor.colorA[1], randomColor.colorA[2], randomColor.colorA[3])
							: new Color4(0, 0, 0, 1);
						const colorB = randomColor
							? new Color4(randomColor.colorB[0], randomColor.colorB[1], randomColor.colorB[2], randomColor.colorB[3])
							: new Color4(1, 1, 1, 1);
						const wrapperRandom = {
							get colorA() {
								return colorA;
							},
							set colorA(newColor: Color4) {
								const currentB = randomColor ? randomColor.colorB : [1, 1, 1, 1];
								onChange({ type: "RandomColor", colorA: [newColor.r, newColor.g, newColor.b, newColor.a], colorB: currentB });
							},
							get colorB() {
								return colorB;
							},
							set colorB(newColor: Color4) {
								const currentA = randomColor ? randomColor.colorA : [0, 0, 0, 1];
								onChange({ type: "RandomColor", colorA: currentA, colorB: [newColor.r, newColor.g, newColor.b, newColor.a] });
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

			{currentType === "RandomColorBetweenGradient" && (() => {
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
												colorKeys: newColorKeys,
												alphaKeys: newAlphaKeys,
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
												colorKeys: newColorKeys,
												alphaKeys: newAlphaKeys,
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

