import { ReactNode } from "react";
import { Color4, Vector3 } from "babylonjs";

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

	// Initialize color function type if not set
	if (!value || !value.colorFunctionType) {
		value.colorFunctionType = "ConstantColor";
		value.data = {};
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

					if (!value.data.gradient1) value.data.gradient1 = {};
					if (!value.data.gradient2) value.data.gradient2 = {};

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
