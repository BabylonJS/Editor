import { ReactNode } from "react";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { EditorInspectorColorField } from "../../../layout/inspector/fields/color";
import { EditorInspectorColorGradientField } from "../../../layout/inspector/fields/gradient";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import type { IGradientKey } from "../../../../ui/gradient-picker";

export type ColorFunctionType = "ConstantColor" | "ColorRange" | "Gradient" | "RandomColor" | "RandomColorBetweenGradient";

export interface IColorFunctionEditorProps {
	value: any;
	onChange: () => void;
	label: string;
}

export function ColorFunctionEditor(props: IColorFunctionEditorProps): ReactNode {
	const { value, onChange, label } = props;

	// Convert from Quarks format to UI format if needed
	// Quarks format: { color: { type: "Gradient" | "ConstantColor" | "RandomColorBetweenGradient", ... } }
	// UI format: { colorFunctionType: "Gradient" | "ConstantColor" | "RandomColorBetweenGradient", data: {...} }
	if (value && !value.colorFunctionType) {
		// Check if this is Quarks format
		if (value.color && typeof value.color === "object" && "type" in value.color) {
			const colorType = value.color.type;

			if (colorType === "Gradient") {
				// Convert Gradient format
				value.colorFunctionType = "Gradient";
				value.data = {
					colorKeys: value.color.color?.keys || [],
					alphaKeys: value.color.alpha?.keys || [],
				};
				delete value.color;
			} else if (colorType === "ConstantColor") {
				// Convert ConstantColor format
				value.colorFunctionType = "ConstantColor";
				const color =
					value.color.color ||
					(value.color.value ? { r: value.color.value[0], g: value.color.value[1], b: value.color.value[2], a: value.color.value[3] } : { r: 1, g: 1, b: 1, a: 1 });
				value.data = {
					color: {
						r: color.r ?? 1,
						g: color.g ?? 1,
						b: color.b ?? 1,
						a: color.a !== undefined ? color.a : 1,
					},
				};
				delete value.color;
			} else if (colorType === "RandomColorBetweenGradient") {
				// Convert RandomColorBetweenGradient format
				value.colorFunctionType = "RandomColorBetweenGradient";
				value.data = {
					gradient1: {
						colorKeys: value.color.gradient1?.color?.keys || [],
						alphaKeys: value.color.gradient1?.alpha?.keys || [],
					},
					gradient2: {
						colorKeys: value.color.gradient2?.color?.keys || [],
						alphaKeys: value.color.gradient2?.alpha?.keys || [],
					},
				};
				delete value.color;
			} else {
				// Fallback: try old format
				const hasColorKeys = value.color.color?.keys && value.color.color.keys.length > 0;
				const hasAlphaKeys = value.color.alpha?.keys && value.color.alpha.keys.length > 0;
				const hasKeys = value.color.keys && value.color.keys.length > 0;

				if (hasColorKeys || hasAlphaKeys || hasKeys) {
					value.colorFunctionType = "Gradient";
					value.data = {
						colorKeys: hasColorKeys ? value.color.color.keys : hasKeys ? value.color.keys : [],
						alphaKeys: hasAlphaKeys ? value.color.alpha.keys : [],
					};
					delete value.color;
				} else {
					value.colorFunctionType = "ConstantColor";
					value.data = {};
				}
			}
		} else if (value.color) {
			// Old Quarks format without type
			const hasColorKeys = value.color.color?.keys && value.color.color.keys.length > 0;
			const hasAlphaKeys = value.color.alpha?.keys && value.color.alpha.keys.length > 0;
			const hasKeys = value.color.keys && value.color.keys.length > 0;

			if (hasColorKeys || hasAlphaKeys || hasKeys) {
				value.colorFunctionType = "Gradient";
				value.data = {
					colorKeys: hasColorKeys ? value.color.color.keys : hasKeys ? value.color.keys : [],
					alphaKeys: hasAlphaKeys ? value.color.alpha.keys : [],
				};
				delete value.color;
			} else {
				value.colorFunctionType = "ConstantColor";
				value.data = {};
			}
		} else {
			// Initialize color function type if not set
			value.colorFunctionType = "ConstantColor";
			value.data = {};
		}
	}

	const functionType = value.colorFunctionType as ColorFunctionType;

	// Ensure data object exists
	if (!value.data) {
		value.data = {};
	}

	const typeItems = [
		{ text: "Color", value: "ConstantColor" },
		{ text: "Color Range", value: "ColorRange" },
		{ text: "Gradient", value: "Gradient" },
		{ text: "Random Color", value: "RandomColor" },
		{ text: "Random Between Gradient", value: "RandomColorBetweenGradient" },
	];

	return (
		<>
			<EditorInspectorListField
				object={value}
				property="colorFunctionType"
				label={label}
				items={typeItems}
				onChange={() => {
					// Reset data when type changes and initialize defaults
					const newType = value.colorFunctionType;
					value.data = {};
					if (newType === "ConstantColor") {
						value.data.color = new Color4(1, 1, 1, 1);
					} else if (newType === "ColorRange") {
						value.data.colorA = new Color4(0, 0, 0, 1);
						value.data.colorB = new Color4(1, 1, 1, 1);
					} else if (newType === "Gradient") {
						value.data.colorKeys = [
							{ pos: 0, value: [0, 0, 0, 1] },
							{ pos: 1, value: [1, 1, 1, 1] },
						];
						value.data.alphaKeys = [
							{ pos: 0, value: 1 },
							{ pos: 1, value: 1 },
						];
					} else if (newType === "RandomColor") {
						value.data.colorA = new Color4(0, 0, 0, 1);
						value.data.colorB = new Color4(1, 1, 1, 1);
					} else if (newType === "RandomColorBetweenGradient") {
						value.data.gradient1 = {
							colorKeys: [
								{ pos: 0, value: [0, 0, 0, 1] },
								{ pos: 1, value: [1, 1, 1, 1] },
							],
							alphaKeys: [
								{ pos: 0, value: 1 },
								{ pos: 1, value: 1 },
							],
						};
						value.data.gradient2 = {
							colorKeys: [
								{ pos: 0, value: [1, 0, 0, 1] },
								{ pos: 1, value: [0, 1, 0, 1] },
							],
							alphaKeys: [
								{ pos: 0, value: 1 },
								{ pos: 1, value: 1 },
							],
						};
					}
					onChange();
				}}
			/>

			{functionType === "ConstantColor" && (
				<>
					{!value.data.color && (value.data.color = new Color4(1, 1, 1, 1))}
					<EditorInspectorColorField object={value.data} property="color" label="Color" onChange={onChange} />
				</>
			)}

			{functionType === "ColorRange" && (
				<>
					{!value.data.colorA && (value.data.colorA = new Color4(0, 0, 0, 1))}
					{!value.data.colorB && (value.data.colorB = new Color4(1, 1, 1, 1))}
					<EditorInspectorColorField object={value.data} property="colorA" label="Color A" onChange={onChange} />
					<EditorInspectorColorField object={value.data} property="colorB" label="Color B" onChange={onChange} />
				</>
			)}

			{functionType === "Gradient" &&
				(() => {
					// Convert old format (Vector3 + position) to new format (array + pos) if needed
					const convertColorKeys = (keys: any[]): IGradientKey[] => {
						if (!keys || keys.length === 0) {
							return [
								{ pos: 0, value: [0, 0, 0, 1] },
								{ pos: 1, value: [1, 1, 1, 1] },
							];
						}
						return keys.map((key) => {
							if (key.color && key.color instanceof Vector3) {
								// Old format: { color: Vector3, position: number }
								return {
									pos: key.position ?? key.pos ?? 0,
									value: [key.color.x, key.color.y, key.color.z, 1],
								};
							}
							// Already in new format or other format
							return {
								pos: key.pos ?? key.position ?? 0,
								value: Array.isArray(key.value)
									? key.value
									: typeof key.value === "object" && "r" in key.value
										? [key.value.r, key.value.g, key.value.b, key.value.a ?? 1]
										: [0, 0, 0, 1],
							};
						});
					};

					const convertAlphaKeys = (keys: any[]): IGradientKey[] => {
						if (!keys || keys.length === 0) {
							return [
								{ pos: 0, value: 1 },
								{ pos: 1, value: 1 },
							];
						}
						return keys.map((key) => ({
							pos: key.pos ?? key.position ?? 0,
							value: typeof key.value === "number" ? key.value : 1,
						}));
					};

					const wrapperGradient = {
						colorKeys: convertColorKeys(value.data.colorKeys),
						alphaKeys: convertAlphaKeys(value.data.alphaKeys),
					};

					return (
						<EditorInspectorColorGradientField
							object={wrapperGradient}
							property=""
							label=""
							onChange={(newColorKeys, newAlphaKeys) => {
								value.data.colorKeys = newColorKeys;
								value.data.alphaKeys = newAlphaKeys;
								onChange();
							}}
						/>
					);
				})()}

			{functionType === "RandomColor" && (
				<>
					{!value.data.colorA && (value.data.colorA = new Color4(0, 0, 0, 1))}
					{!value.data.colorB && (value.data.colorB = new Color4(1, 1, 1, 1))}
					<EditorInspectorColorField object={value.data} property="colorA" label="Color A" onChange={onChange} />
					<EditorInspectorColorField object={value.data} property="colorB" label="Color B" onChange={onChange} />
				</>
			)}

			{functionType === "RandomColorBetweenGradient" &&
				(() => {
					// Convert old format to new format if needed
					const convertColorKeys = (keys: any[]): IGradientKey[] => {
						if (!keys || keys.length === 0) {
							return [
								{ pos: 0, value: [0, 0, 0, 1] },
								{ pos: 1, value: [1, 1, 1, 1] },
							];
						}
						return keys.map((key) => {
							if (key.color && key.color instanceof Vector3) {
								return {
									pos: key.position ?? key.pos ?? 0,
									value: [key.color.x, key.color.y, key.color.z, 1],
								};
							}
							return {
								pos: key.pos ?? key.position ?? 0,
								value: Array.isArray(key.value)
									? key.value
									: typeof key.value === "object" && "r" in key.value
										? [key.value.r, key.value.g, key.value.b, key.value.a ?? 1]
										: [0, 0, 0, 1],
							};
						});
					};

					const convertAlphaKeys = (keys: any[]): IGradientKey[] => {
						if (!keys || keys.length === 0) {
							return [
								{ pos: 0, value: 1 },
								{ pos: 1, value: 1 },
							];
						}
						return keys.map((key) => ({
							pos: key.pos ?? key.position ?? 0,
							value: typeof key.value === "number" ? key.value : 1,
						}));
					};

					if (!value.data.gradient1) {
						value.data.gradient1 = {};
					}
					if (!value.data.gradient2) {
						value.data.gradient2 = {};
					}

					const wrapperGradient1 = {
						colorKeys: convertColorKeys(value.data.gradient1.colorKeys),
						alphaKeys: convertAlphaKeys(value.data.gradient1.alphaKeys),
					};

					const wrapperGradient2 = {
						colorKeys: convertColorKeys(value.data.gradient2.colorKeys),
						alphaKeys: convertAlphaKeys(value.data.gradient2.alphaKeys),
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
										value.data.gradient1.colorKeys = newColorKeys;
										value.data.gradient1.alphaKeys = newAlphaKeys;
										onChange();
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
										value.data.gradient2.colorKeys = newColorKeys;
										value.data.gradient2.alphaKeys = newAlphaKeys;
										onChange();
									}}
								/>
							</EditorInspectorBlockField>
						</>
					);
				})()}
		</>
	);
}
