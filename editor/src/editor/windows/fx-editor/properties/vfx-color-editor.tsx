import { ReactNode } from "react";
import { Color4, Vector3, Color3 } from "babylonjs";

import { EditorInspectorColorField } from "../../../layout/inspector/fields/color";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";

import { Button } from "../../../../ui/shadcn/ui/button";
import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";
import { Slider } from "../../../../ui/shadcn/ui/slider";

import type { VFXColor, VFXConstantColor, VFXColorRange, VFXGradientColor, VFXRandomColor, VFXRandomColorBetweenGradient } from "../VFX/types/colors";
import type { VFXGradientKey } from "../VFX/types/gradients";
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

			{currentType === "Gradient" && <GradientEditor value={value && typeof value === "object" && "type" in value && value.type === "Gradient" ? value : null} onChange={onChange} />}

			{currentType === "RandomColor" && (
				<>
					{(() => {
						const randomColor = value && typeof value === "object" && "type" in value && value.type === "RandomColor" ? value : null;
						const colorA = randomColor ? new Color4(randomColor.colorA[0], randomColor.colorA[1], randomColor.colorA[2], randomColor.colorA[3]) : new Color4(0, 0, 0, 1);
						const colorB = randomColor ? new Color4(randomColor.colorB[0], randomColor.colorB[1], randomColor.colorB[2], randomColor.colorB[3]) : new Color4(1, 1, 1, 1);
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

			{currentType === "RandomColorBetweenGradient" && (
				<>
					{(() => {
						const randomGradient = value && typeof value === "object" && "type" in value && value.type === "RandomColorBetweenGradient" ? value : null;
						return (
							<>
								<EditorInspectorBlockField>
									<div className="px-2">Gradient 1</div>
									<GradientEditor
										value={randomGradient ? { type: "Gradient" as const, colorKeys: randomGradient.gradient1.colorKeys, alphaKeys: randomGradient.gradient1.alphaKeys } : null}
										onChange={(newGradient) => {
											if (randomGradient) {
												onChange({
													type: "RandomColorBetweenGradient",
													gradient1: {
														colorKeys: newGradient.type === "Gradient" ? newGradient.colorKeys : [],
														alphaKeys: newGradient.type === "Gradient" ? newGradient.alphaKeys : [],
													},
													gradient2: randomGradient.gradient2,
												});
											}
										}}
									/>
								</EditorInspectorBlockField>
								<EditorInspectorBlockField>
									<div className="px-2">Gradient 2</div>
									<GradientEditor
										value={randomGradient ? { type: "Gradient" as const, colorKeys: randomGradient.gradient2.colorKeys, alphaKeys: randomGradient.gradient2.alphaKeys } : null}
										onChange={(newGradient) => {
											if (randomGradient) {
												onChange({
													type: "RandomColorBetweenGradient",
													gradient1: randomGradient.gradient1,
													gradient2: {
														colorKeys: newGradient.type === "Gradient" ? newGradient.colorKeys : [],
														alphaKeys: newGradient.type === "Gradient" ? newGradient.alphaKeys : [],
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
			)}
		</>
	);
}

interface IGradientEditorProps {
	value: VFXGradientColor | null;
	onChange: (newValue: VFXGradientColor) => void;
}

function GradientEditor(props: IGradientEditorProps): ReactNode {
	const { value, onChange } = props;

	// Initialize gradient data
	const colorKeys = value?.colorKeys || [
		{ pos: 0, value: [0, 0, 0, 1] },
		{ pos: 1, value: [1, 1, 1, 1] },
	];
	const alphaKeys = value?.alphaKeys || [
		{ pos: 0, value: 1 },
		{ pos: 1, value: 1 },
	];

	const updateGradient = (newColorKeys: VFXGradientKey[], newAlphaKeys?: VFXGradientKey[]) => {
		onChange({
			type: "Gradient",
			colorKeys: newColorKeys,
			alphaKeys: newAlphaKeys || alphaKeys,
		});
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="px-2 text-sm font-medium">Color Keys</div>
			{colorKeys.map((key, index) => {
				// Convert value to Color3 for color picker
				const colorValue = Array.isArray(key.value) ? key.value : typeof key.value === "number" ? [key.value, key.value, key.value] : [key.value?.r || 0, key.value?.g || 0, key.value?.b || 0];
				const color3 = new Color3(colorValue[0], colorValue[1], colorValue[2]);
				const alpha = Array.isArray(key.value) && key.value.length > 3 ? key.value[3] : 1;

				return (
					<EditorInspectorBlockField key={`color-${index}`}>
						<div className="flex gap-2 items-center">
							<div className="w-1/3">
								<EditorInspectorColorField
									object={{ _color3: color3 }}
									property="_color3"
									label=""
									onChange={(color) => {
										const newColorKeys = [...colorKeys];
										newColorKeys[index] = { ...key, value: [color.r, color.g, color.b, alpha] };
										updateGradient(newColorKeys);
									}}
								/>
							</div>
							<div className="flex-1">
								<Slider
									min={0}
									max={1}
									step={0.01}
									value={[key.pos || 0]}
									onValueChange={(vals) => {
										const newColorKeys = [...colorKeys];
										newColorKeys[index] = { ...key, pos: vals[0] };
										updateGradient(newColorKeys);
									}}
								/>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0"
								onClick={() => {
									const newColorKeys = colorKeys.filter((_, i) => i !== index);
									updateGradient(newColorKeys);
								}}
							>
								<AiOutlineClose className="w-4 h-4" />
							</Button>
						</div>
					</EditorInspectorBlockField>
				);
			})}
			<Button
				variant="ghost"
				size="sm"
				onClick={() => {
					const lastKey = colorKeys[colorKeys.length - 1];
					const newPosition = lastKey ? Math.min(1, (lastKey.pos || 0) + 0.1) : 0.5;
					const newColorKeys = [...colorKeys, { pos: newPosition, value: [1, 1, 1, 1] }];
					updateGradient(newColorKeys);
				}}
			>
				<AiOutlinePlus className="w-4 h-4" /> Add Color Key
			</Button>

			<div className="px-2 text-sm font-medium mt-2">Alpha Keys</div>
			{alphaKeys.map((key, index) => (
				<EditorInspectorBlockField key={`alpha-${index}`}>
					<div className="flex gap-2 items-center">
						<div className="w-1/3">
							{(() => {
								const alphaValue = typeof key.value === "number" ? key.value : Array.isArray(key.value) ? key.value[3] || 1 : 1;
								const wrapperAlpha = {
									get value() {
										return alphaValue;
									},
									set value(newVal: number) {
										const newAlphaKeys = [...alphaKeys];
										newAlphaKeys[index] = { ...key, value: newVal };
										updateGradient(colorKeys, newAlphaKeys);
									},
								};
								return <EditorInspectorNumberField object={wrapperAlpha} property="value" label="Alpha" min={0} max={1} step={0.01} onChange={() => {}} />;
							})()}
						</div>
						<div className="flex-1">
							<Slider
								min={0}
								max={1}
								step={0.01}
								value={[key.pos || 0]}
								onValueChange={(vals) => {
									const newAlphaKeys = [...alphaKeys];
									newAlphaKeys[index] = { ...key, pos: vals[0] };
									updateGradient(colorKeys, newAlphaKeys);
								}}
							/>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0"
							onClick={() => {
								const newAlphaKeys = alphaKeys.filter((_, i) => i !== index);
								updateGradient(colorKeys, newAlphaKeys);
							}}
						>
							<AiOutlineClose className="w-4 h-4" />
						</Button>
					</div>
				</EditorInspectorBlockField>
			))}
			<Button
				variant="ghost"
				size="sm"
				onClick={() => {
					const lastKey = alphaKeys[alphaKeys.length - 1];
					const newPosition = lastKey ? Math.min(1, (lastKey.pos || 0) + 0.1) : 0.5;
					const newAlphaKeys = [...alphaKeys, { pos: newPosition, value: 1 }];
					updateGradient(colorKeys, newAlphaKeys);
				}}
			>
				<AiOutlinePlus className="w-4 h-4" /> Add Alpha Key
			</Button>
		</div>
	);
}

