import { ReactNode } from "react";
import { Color4, Vector3, Color3 } from "babylonjs";

import { EditorInspectorColorField } from "../../../../layout/inspector/fields/color";
import { EditorInspectorListField } from "../../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../../layout/inspector/fields/block";
import { EditorInspectorNumberField } from "../../../../layout/inspector/fields/number";

import { Button } from "../../../../../ui/shadcn/ui/button";
import { AiOutlinePlus, AiOutlineClose } from "react-icons/ai";
import { Slider } from "../../../../../ui/shadcn/ui/slider";

export type ColorFunctionType = "ConstantColor" | "ColorRange" | "Gradient" | "RandomColorBetweenGradient";

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
							{ color: new Vector3(0, 0, 0), position: 0 },
							{ color: new Vector3(1, 1, 1), position: 1 },
						];
						value.data.alphaKeys = [
							{ value: 1, position: 0 },
							{ value: 1, position: 1 },
						];
					} else if (newType === "RandomColorBetweenGradient") {
						value.data.gradient1 = {
							colorKeys: [
								{ color: new Vector3(0, 0, 0), position: 0 },
								{ color: new Vector3(1, 1, 1), position: 1 },
							],
							alphaKeys: [
								{ value: 1, position: 0 },
								{ value: 1, position: 1 },
							],
						};
						value.data.gradient2 = {
							colorKeys: [
								{ color: new Vector3(1, 0, 0), position: 0 },
								{ color: new Vector3(0, 1, 0), position: 1 },
							],
							alphaKeys: [
								{ value: 1, position: 0 },
								{ value: 1, position: 1 },
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

			{functionType === "Gradient" && <GradientEditor value={value.data} onChange={onChange} />}

			{functionType === "RandomColorBetweenGradient" && (
				<>
					{!value.data.gradient1 && (value.data.gradient1 = {})}
					{!value.data.gradient2 && (value.data.gradient2 = {})}
					<EditorInspectorBlockField>
						<div className="px-2">Gradient 1</div>
						<GradientEditor value={value.data.gradient1} onChange={onChange} />
					</EditorInspectorBlockField>
					<EditorInspectorBlockField>
						<div className="px-2">Gradient 2</div>
						<GradientEditor value={value.data.gradient2} onChange={onChange} />
					</EditorInspectorBlockField>
				</>
			)}
		</>
	);
}

interface IGradientEditorProps {
	value: any;
	onChange: () => void;
}

function GradientEditor(props: IGradientEditorProps): ReactNode {
	const { value, onChange } = props;

	// Initialize gradient data
	if (!value.colorKeys || value.colorKeys.length === 0) {
		value.colorKeys = [
			{ color: new Vector3(0, 0, 0), position: 0 },
			{ color: new Vector3(1, 1, 1), position: 1 },
		];
	}
	if (!value.alphaKeys || value.alphaKeys.length === 0) {
		value.alphaKeys = [
			{ value: 1, position: 0 },
			{ value: 1, position: 1 },
		];
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="px-2 text-sm font-medium">Color Keys</div>
			{value.colorKeys.map((key: any, index: number) => {
				// Ensure color is Vector3 and convert to Color3 for color picker
				if (!key.color) {
					key.color = new Vector3(0, 0, 0);
				}
				if (!key._color3) {
					key._color3 = new Color3(key.color.x, key.color.y, key.color.z);
				}
				// Sync Vector3 with Color3 before render
				key._color3.r = key.color.x;
				key._color3.g = key.color.y;
				key._color3.b = key.color.z;

				return (
					<EditorInspectorBlockField key={`color-${index}`}>
						<div className="flex gap-2 items-center">
							<div className="w-1/3">
								<EditorInspectorColorField
									object={key}
									property="_color3"
									label=""
									onChange={(color) => {
										key.color.x = color.r;
										key.color.y = color.g;
										key.color.z = color.b;
										key._color3.r = color.r;
										key._color3.g = color.g;
										key._color3.b = color.b;
										onChange();
									}}
								/>
							</div>
							<div className="flex-1">
								{key.position === undefined && (key.position = index / Math.max(1, value.colorKeys.length - 1))}
								<Slider
									min={0}
									max={1}
									step={0.01}
									value={[key.position]}
									onValueChange={(vals) => {
										key.position = vals[0];
										onChange();
									}}
								/>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 w-6 p-0"
								onClick={() => {
									value.colorKeys.splice(index, 1);
									onChange();
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
					const lastKey = value.colorKeys[value.colorKeys.length - 1];
					const newPosition = lastKey ? Math.min(1, lastKey.position + 0.1) : 0.5;
					value.colorKeys.push({ color: new Vector3(1, 1, 1), position: newPosition });
					onChange();
				}}
			>
				<AiOutlinePlus className="w-4 h-4" /> Add Color Key
			</Button>

			<div className="px-2 text-sm font-medium mt-2">Alpha Keys</div>
			{value.alphaKeys.map((key: any, index: number) => (
				<EditorInspectorBlockField key={`alpha-${index}`}>
					<div className="flex gap-2 items-center">
						<div className="w-1/3">
							{key.value === undefined && (key.value = 1)}
							<EditorInspectorNumberField object={key} property="value" label="Alpha" min={0} max={1} step={0.01} onChange={onChange} />
						</div>
						<div className="flex-1">
							{key.position === undefined && (key.position = index / Math.max(1, value.alphaKeys.length - 1))}
							<Slider
								min={0}
								max={1}
								step={0.01}
								value={[key.position]}
								onValueChange={(vals) => {
									key.position = vals[0];
									onChange();
								}}
							/>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0"
							onClick={() => {
								value.alphaKeys.splice(index, 1);
								onChange();
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
					const lastKey = value.alphaKeys[value.alphaKeys.length - 1];
					const newPosition = lastKey ? Math.min(1, lastKey.position + 0.1) : 0.5;
					value.alphaKeys.push({ value: 1, position: newPosition });
					onChange();
				}}
			>
				<AiOutlinePlus className="w-4 h-4" /> Add Alpha Key
			</Button>
		</div>
	);
}
