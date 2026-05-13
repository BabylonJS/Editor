import { ReactNode } from "react";
import { Color4 } from "@babylonjs/core/Maths/math.color";

import { EditorInspectorColorField } from "../../../layout/inspector/fields/color";
import { EditorInspectorColorGradientField } from "../../../layout/inspector/fields/gradient";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import type { IGradientKey } from "../../../../ui/gradient-picker";

export type ColorFunctionType = "ConstantColor" | "ColorRange" | "Gradient" | "RandomColor" | "RandomColorBetweenGradient";
export type ColorFunctionEditorValue = {
	colorFunctionType?: ColorFunctionType;
	data?: Record<string, unknown>;
};

export interface IColorFunctionEditorProps {
	value: ColorFunctionEditorValue | null | undefined;
	onChange: () => void;
	label: string;
}

export function ColorFunctionEditor(props: IColorFunctionEditorProps): ReactNode {
	const { value, onChange, label } = props;
	if (!value) {
		return null;
	}
	if (!value.colorFunctionType) {
		value.colorFunctionType = "ConstantColor";
	}
	if (!value.data) {
		value.data = {};
	}
	const data = value.data as Record<string, unknown>;
	const functionType = value.colorFunctionType as ColorFunctionType;

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
						data.color = new Color4(1, 1, 1, 1);
					} else if (newType === "ColorRange") {
						data.colorA = new Color4(0, 0, 0, 1);
						data.colorB = new Color4(1, 1, 1, 1);
					} else if (newType === "Gradient") {
						data.colorKeys = [
							{ pos: 0, value: [0, 0, 0, 1] },
							{ pos: 1, value: [1, 1, 1, 1] },
						];
						data.alphaKeys = [
							{ pos: 0, value: 1 },
							{ pos: 1, value: 1 },
						];
					} else if (newType === "RandomColor") {
						data.colorA = new Color4(0, 0, 0, 1);
						data.colorB = new Color4(1, 1, 1, 1);
					} else if (newType === "RandomColorBetweenGradient") {
						data.gradient1 = {
							colorKeys: [
								{ pos: 0, value: [0, 0, 0, 1] },
								{ pos: 1, value: [1, 1, 1, 1] },
							],
							alphaKeys: [
								{ pos: 0, value: 1 },
								{ pos: 1, value: 1 },
							],
						};
						data.gradient2 = {
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
					{!data.color && (data.color = new Color4(1, 1, 1, 1))}
					<EditorInspectorColorField object={value.data} property="color" label="Color" onChange={onChange} />
				</>
			)}

			{functionType === "ColorRange" && (
				<>
					{!data.colorA && (data.colorA = new Color4(0, 0, 0, 1))}
					{!data.colorB && (data.colorB = new Color4(1, 1, 1, 1))}
					<EditorInspectorColorField object={value.data} property="colorA" label="Color A" onChange={onChange} />
					<EditorInspectorColorField object={value.data} property="colorB" label="Color B" onChange={onChange} />
				</>
			)}

			{functionType === "Gradient" &&
				(() => {
					const convertColorKeys = (keys: IGradientKey[] | undefined): IGradientKey[] => {
						if (!keys || keys.length === 0) {
							return [
								{ pos: 0, value: [0, 0, 0, 1] },
								{ pos: 1, value: [1, 1, 1, 1] },
							];
						}
						return keys.map((key) => ({
							pos: key.pos ?? 0,
							value: Array.isArray(key.value)
								? key.value
								: typeof key.value === "object" && "r" in key.value
									? [key.value.r, key.value.g, key.value.b, key.value.a ?? 1]
									: [0, 0, 0, 1],
						}));
					};

					const convertAlphaKeys = (keys: IGradientKey[] | undefined): IGradientKey[] => {
						if (!keys || keys.length === 0) {
							return [
								{ pos: 0, value: 1 },
								{ pos: 1, value: 1 },
							];
						}
						return keys.map((key) => ({
							pos: key.pos ?? 0,
							value: typeof key.value === "number" ? key.value : 1,
						}));
					};

					const wrapperGradient = {
						colorKeys: convertColorKeys(data.colorKeys as IGradientKey[] | undefined),
						alphaKeys: convertAlphaKeys(data.alphaKeys as IGradientKey[] | undefined),
					};

					return (
						<EditorInspectorColorGradientField
							object={wrapperGradient}
							property=""
							label=""
							onChange={(newColorKeys, newAlphaKeys) => {
								data.colorKeys = newColorKeys;
								data.alphaKeys = newAlphaKeys;
								onChange();
							}}
						/>
					);
				})()}

			{functionType === "RandomColor" && (
				<>
					{!data.colorA && (data.colorA = new Color4(0, 0, 0, 1))}
					{!data.colorB && (data.colorB = new Color4(1, 1, 1, 1))}
					<EditorInspectorColorField object={value.data} property="colorA" label="Color A" onChange={onChange} />
					<EditorInspectorColorField object={value.data} property="colorB" label="Color B" onChange={onChange} />
				</>
			)}

			{functionType === "RandomColorBetweenGradient" &&
				(() => {
					const convertColorKeys = (keys: IGradientKey[] | undefined): IGradientKey[] => {
						if (!keys || keys.length === 0) {
							return [
								{ pos: 0, value: [0, 0, 0, 1] },
								{ pos: 1, value: [1, 1, 1, 1] },
							];
						}
						return keys.map((key) => ({
							pos: key.pos ?? 0,
							value: Array.isArray(key.value)
								? key.value
								: typeof key.value === "object" && "r" in key.value
									? [key.value.r, key.value.g, key.value.b, key.value.a ?? 1]
									: [0, 0, 0, 1],
						}));
					};

					const convertAlphaKeys = (keys: IGradientKey[] | undefined): IGradientKey[] => {
						if (!keys || keys.length === 0) {
							return [
								{ pos: 0, value: 1 },
								{ pos: 1, value: 1 },
							];
						}
						return keys.map((key) => ({
							pos: key.pos ?? 0,
							value: typeof key.value === "number" ? key.value : 1,
						}));
					};

					if (!data.gradient1) {
						data.gradient1 = {};
					}
					if (!data.gradient2) {
						data.gradient2 = {};
					}

					const wrapperGradient1 = {
						colorKeys: convertColorKeys((data.gradient1 as Record<string, unknown>).colorKeys as IGradientKey[] | undefined),
						alphaKeys: convertAlphaKeys((data.gradient1 as Record<string, unknown>).alphaKeys as IGradientKey[] | undefined),
					};

					const wrapperGradient2 = {
						colorKeys: convertColorKeys((data.gradient2 as Record<string, unknown>).colorKeys as IGradientKey[] | undefined),
						alphaKeys: convertAlphaKeys((data.gradient2 as Record<string, unknown>).alphaKeys as IGradientKey[] | undefined),
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
										(data.gradient1 as Record<string, unknown>).colorKeys = newColorKeys;
										(data.gradient1 as Record<string, unknown>).alphaKeys = newAlphaKeys;
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
										(data.gradient2 as Record<string, unknown>).colorKeys = newColorKeys;
										(data.gradient2 as Record<string, unknown>).alphaKeys = newAlphaKeys;
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
