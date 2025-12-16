import { ReactNode } from "react";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { type Value, type IConstantValue, type IIntervalValue, ValueUtils } from "babylonjs-editor-tools";

type PiecewiseBezier = Extract<Value, { type: "PiecewiseBezier" }>;
import { BezierEditor } from "./bezier";

// Vec3Function is a custom editor extension, not part of the core Value type
export type EffectValueType = IConstantValue["type"] | IIntervalValue["type"] | PiecewiseBezier["type"] | "Vec3Function";

export interface IVec3Function {
	type: "Vec3Function";
	x: Value;
	y: Value;
	z: Value;
}

export interface IEffectValueEditorProps {
	value: Value | IVec3Function | undefined;
	onChange: (newValue: Value | IVec3Function) => void;
	label?: string;
	availableTypes?: EffectValueType[];
	min?: number;
	step?: number;
}

/**
 * Editor for VEffectValue (ConstantValue, IntervalValue, PiecewiseBezier, Vec3Function)
 * Works directly with VEffectValue types, not wrappers
 */
export function EffectValueEditor(props: IEffectValueEditorProps): ReactNode {
	const { value, onChange, label, availableTypes, min, step } = props;

	const types = availableTypes || ["ConstantValue", "IntervalValue", "PiecewiseBezier"];

	// Determine current type from value
	let currentType: EffectValueType = "ConstantValue";
	if (value) {
		if (typeof value === "number") {
			currentType = "ConstantValue";
		} else if ("type" in value) {
			if (value.type === "Vec3Function") {
				currentType = "Vec3Function";
			} else if (value.type === "ConstantValue") {
				currentType = "ConstantValue";
			} else if (value.type === "IntervalValue") {
				currentType = "IntervalValue";
			} else if (value.type === "PiecewiseBezier") {
				currentType = "PiecewiseBezier";
			}
		}
	}

	const typeItems = types.map((type) => ({
		text: type,
		value: type,
	}));

	// Wrapper object for EditorInspectorListField
	const wrapper = {
		get type() {
			return currentType;
		},
		set type(newType: EffectValueType) {
			currentType = newType;
			// Convert value to new type
			let newValue: Value | IVec3Function;
			if (newType === "ConstantValue") {
				const currentValue =
					value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function"
						? ValueUtils.parseConstantValue(value as Value)
						: typeof value === "number"
							? value
							: 1;
				newValue = { type: "ConstantValue", value: currentValue };
			} else if (newType === "IntervalValue") {
				const interval =
					value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function" ? ValueUtils.parseIntervalValue(value as Value) : { min: 0, max: 1 };
				newValue = { type: "IntervalValue", min: interval.min, max: interval.max };
			} else if (newType === "Vec3Function") {
				const currentValue =
					value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function"
						? ValueUtils.parseConstantValue(value as Value)
						: typeof value === "number"
							? value
							: 1;
				newValue = {
					type: "Vec3Function",
					x: { type: "ConstantValue", value: currentValue },
					y: { type: "ConstantValue", value: currentValue },
					z: { type: "ConstantValue", value: currentValue },
				};
			} else {
				// PiecewiseBezier - convert from current value
				const currentValue =
					value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function"
						? ValueUtils.parseConstantValue(value as Value)
						: typeof value === "number"
							? value
							: 1;
				newValue = {
					type: "PiecewiseBezier",
					functions: [
						{
							function: { p0: currentValue, p1: currentValue, p2: currentValue, p3: currentValue },
							start: 0,
						},
					],
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

			{currentType === "ConstantValue" && (
				<>
					{(() => {
						const constantValue =
							value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function"
								? ValueUtils.parseConstantValue(value as Value)
								: typeof value === "number"
									? value
									: 1;
						const wrapperValue = {
							get value() {
								return constantValue;
							},
							set value(newVal: number) {
								onChange({ type: "ConstantValue", value: newVal });
							},
						};
						return (
							<EditorInspectorNumberField
								object={wrapperValue}
								property="value"
								label={label ? "Value" : ""}
								min={min}
								step={step}
								onChange={() => {
									// Value change is handled by setter
								}}
							/>
						);
					})()}
				</>
			)}

			{currentType === "IntervalValue" && (
				<>
					{(() => {
						const interval =
							value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function"
								? ValueUtils.parseIntervalValue(value as Value)
								: { min: 0, max: 1 };
						const wrapperInterval = {
							get min() {
								return interval.min;
							},
							set min(newMin: number) {
								const currentMax = value && typeof value !== "number" && "type" in value && value.type === "IntervalValue" ? value.max : interval.max;
								onChange({ type: "IntervalValue", min: newMin, max: currentMax });
							},
							get max() {
								return interval.max;
							},
							set max(newMax: number) {
								const currentMin = value && typeof value !== "number" && "type" in value && value.type === "IntervalValue" ? value.min : interval.min;
								onChange({ type: "IntervalValue", min: currentMin, max: newMax });
							},
						};
						return (
							<EditorInspectorBlockField>
								<div className="px-2">{label ? "Range" : ""}</div>
								<div className="flex items-center">
									<EditorInspectorNumberField
										grayLabel
										object={wrapperInterval}
										property="min"
										label="Min"
										min={min}
										step={step}
										onChange={() => {
											// Value change is handled by setter
										}}
									/>
									<EditorInspectorNumberField
										grayLabel
										object={wrapperInterval}
										property="max"
										label="Max"
										min={min}
										step={step}
										onChange={() => {
											// Value change is handled by setter
										}}
									/>
								</div>
							</EditorInspectorBlockField>
						);
					})()}
				</>
			)}

			{currentType === "PiecewiseBezier" && (
				<>
					{(() => {
						// Convert VEffectValue to wrapper format for BezierEditor
						const bezierValue = value && typeof value !== "number" && "type" in value && value.type === "PiecewiseBezier" ? value : null;
						const wrapperBezier = {
							get functionType() {
								return "PiecewiseBezier";
							},
							set functionType(_: string) {},
							get data() {
								if (!bezierValue || bezierValue.functions.length === 0) {
									return {
										function: { p0: 1, p1: 1.0 / 3, p2: (1.0 / 3) * 2, p3: 1 },
									};
								}
								// Use first function for editing
								return {
									function: bezierValue.functions[0].function,
								};
							},
							set data(newData: any) {
								// Update first function or create new
								if (!bezierValue) {
									onChange({
										type: "PiecewiseBezier",
										functions: [
											{
												function: newData.function || { p0: 1, p1: 1.0 / 3, p2: (1.0 / 3) * 2, p3: 1 },
												start: 0,
											},
										],
									});
								} else {
									const newFunctions = [...bezierValue.functions];
									newFunctions[0] = {
										...newFunctions[0],
										function: newData.function || newFunctions[0].function,
									};
									onChange({
										type: "PiecewiseBezier",
										functions: newFunctions,
									});
								}
							},
						};
						return <BezierEditor value={wrapperBezier} onChange={() => {}} />;
					})()}
				</>
			)}

			{currentType === "Vec3Function" && (
				<>
					{(() => {
						const vec3Value = value && typeof value !== "number" && "type" in value && value.type === "Vec3Function" ? value : null;
						const currentX = vec3Value ? vec3Value.x : { type: "ConstantValue" as const, value: 1 };
						const currentY = vec3Value ? vec3Value.y : { type: "ConstantValue" as const, value: 1 };
						const currentZ = vec3Value ? vec3Value.z : { type: "ConstantValue" as const, value: 1 };
						return (
							<>
								<EditorInspectorBlockField>
									<div className="px-2">X</div>
									<EffectValueEditor
										value={currentX}
										onChange={(newX) => {
											onChange({
												type: "Vec3Function",
												x: newX as Value,
												y: currentY,
												z: currentZ,
											});
										}}
										availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
										min={min}
										step={step}
									/>
								</EditorInspectorBlockField>
								<EditorInspectorBlockField>
									<div className="px-2">Y</div>
									<EffectValueEditor
										value={currentY}
										onChange={(newY) => {
											onChange({
												type: "Vec3Function",
												x: currentX,
												y: newY as Value,
												z: currentZ,
											});
										}}
										availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
										min={min}
										step={step}
									/>
								</EditorInspectorBlockField>
								<EditorInspectorBlockField>
									<div className="px-2">Z</div>
									<EffectValueEditor
										value={currentZ}
										onChange={(newZ) => {
											onChange({
												type: "Vec3Function",
												x: currentX,
												y: currentY,
												z: newZ as Value,
											});
										}}
										availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
										min={min}
										step={step}
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
