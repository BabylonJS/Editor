import { ReactNode } from "react";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import type { VFXValue, VFXConstantValue, VFXIntervalValue, VFXPiecewiseBezier } from "../VFX/types/values";
import { BezierEditor } from "./behaviors/bezier-editor";
import { VFXValueUtils } from "../VFX/utils/valueParser";

export type VFXValueType = "ConstantValue" | "IntervalValue" | "PiecewiseBezier" | "Vec3Function";

export interface IVec3Function {
	type: "Vec3Function";
	x: VFXValue;
	y: VFXValue;
	z: VFXValue;
}

export interface IVFXValueEditorProps {
	value: VFXValue | IVec3Function | undefined;
	onChange: (newValue: VFXValue | IVec3Function) => void;
	label?: string;
	availableTypes?: VFXValueType[];
	min?: number;
	step?: number;
}

/**
 * Editor for VFXValue (ConstantValue, IntervalValue, PiecewiseBezier, Vec3Function)
 * Works directly with VFXValue types, not wrappers
 */
export function VFXValueEditor(props: IVFXValueEditorProps): ReactNode {
	const { value, onChange, label, availableTypes, min, step } = props;

	const types = availableTypes || ["ConstantValue", "IntervalValue", "PiecewiseBezier"];

	// Determine current type from value
	let currentType: VFXValueType = "ConstantValue";
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
		set type(newType: VFXValueType) {
			currentType = newType;
			// Convert value to new type
			let newValue: VFXValue | IVec3Function;
			if (newType === "ConstantValue") {
				const currentValue = value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function" ? VFXValueUtils.parseConstantValue(value as VFXValue) : typeof value === "number" ? value : 1;
				newValue = { type: "ConstantValue", value: currentValue };
			} else if (newType === "IntervalValue") {
				const interval = value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function" ? VFXValueUtils.parseIntervalValue(value as VFXValue) : { min: 0, max: 1 };
				newValue = { type: "IntervalValue", min: interval.min, max: interval.max };
			} else if (newType === "Vec3Function") {
				const currentValue = value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function" ? VFXValueUtils.parseConstantValue(value as VFXValue) : typeof value === "number" ? value : 1;
				newValue = {
					type: "Vec3Function",
					x: { type: "ConstantValue", value: currentValue },
					y: { type: "ConstantValue", value: currentValue },
					z: { type: "ConstantValue", value: currentValue },
				};
			} else {
				// PiecewiseBezier - convert from current value
				const currentValue = value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function" ? VFXValueUtils.parseConstantValue(value as VFXValue) : typeof value === "number" ? value : 1;
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
						const constantValue = value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function" ? VFXValueUtils.parseConstantValue(value as VFXValue) : typeof value === "number" ? value : 1;
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
						const interval = value && typeof value !== "number" && "type" in value && value.type !== "Vec3Function" ? VFXValueUtils.parseIntervalValue(value as VFXValue) : { min: 0, max: 1 };
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
						// Convert VFXValue to wrapper format for BezierEditor
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
									<VFXValueEditor
										value={currentX}
										onChange={(newX) => {
											onChange({
												type: "Vec3Function",
												x: newX as VFXValue,
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
									<VFXValueEditor
										value={currentY}
										onChange={(newY) => {
											onChange({
												type: "Vec3Function",
												x: currentX,
												y: newY as VFXValue,
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
									<VFXValueEditor
										value={currentZ}
										onChange={(newZ) => {
											onChange({
												type: "Vec3Function",
												x: currentX,
												y: currentY,
												z: newZ as VFXValue,
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
