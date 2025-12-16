import { ReactNode } from "react";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { BezierEditor } from "./bezier";

export type FunctionType = "ConstantValue" | "IntervalValue" | "PiecewiseBezier" | "Vector3Function";

export interface IFunctionEditorProps {
	value: any;
	onChange: () => void;
	availableTypes?: FunctionType[];
	label: string;
}

export function FunctionEditor(props: IFunctionEditorProps): ReactNode {
	const { value, onChange, availableTypes, label } = props;

	// Default available types if not specified
	const types = availableTypes || ["ConstantValue", "IntervalValue", "PiecewiseBezier", "Vector3Function"];

	// Initialize function type if not set
	if (!value || !value.functionType) {
		value.functionType = types[0];
		value.data = {};
	}

	const functionType = value.functionType as FunctionType;

	// Ensure data object exists
	if (!value.data) {
		value.data = {};
	}

	const typeItems = types.map((type) => ({
		text: type,
		value: type,
	}));

	return (
		<>
			<EditorInspectorListField
				object={value}
				property="functionType"
				label={label || ""}
				items={typeItems}
				onChange={() => {
					// Reset data when type changes and initialize defaults
					const newType = value.functionType;
					value.data = {};
					if (newType === "ConstantValue") {
						value.data.value = 1.0;
					} else if (newType === "IntervalValue") {
						value.data.min = 0;
						value.data.max = 1;
					} else if (newType === "PiecewiseBezier") {
						value.data.function = { p0: 0, p1: 1.0 / 3, p2: (1.0 / 3) * 2, p3: 1 };
					} else if (newType === "Vector3Function") {
						value.data.x = { functionType: "ConstantValue", data: { value: 0 } };
						value.data.y = { functionType: "ConstantValue", data: { value: 0 } };
						value.data.z = { functionType: "ConstantValue", data: { value: 0 } };
					}
					onChange();
				}}
			/>

			{functionType === "ConstantValue" && (
				<>
					{value.data.value === undefined && (value.data.value = 1.0)}
					<EditorInspectorNumberField object={value.data} property="value" label={label ? "Value" : ""} step={0.1} onChange={onChange} />
				</>
			)}

			{functionType === "IntervalValue" && (
				<>
					{value.data.min === undefined && (value.data.min = 0)}
					{value.data.max === undefined && (value.data.max = 1)}
					<EditorInspectorBlockField>
						<div className="px-2">{label ? "Range" : ""}</div>
						<div className="flex items-center">
							<EditorInspectorNumberField grayLabel object={value.data} property="min" label="Min" step={0.1} onChange={onChange} />
							<EditorInspectorNumberField grayLabel object={value.data} property="max" label="Max" step={0.1} onChange={onChange} />
						</div>
					</EditorInspectorBlockField>
				</>
			)}

			{functionType === "PiecewiseBezier" && (
				<>
					{!value.data.function && (value.data.function = { p0: 0, p1: 1.0 / 3, p2: (1.0 / 3) * 2, p3: 1 })}
					<BezierEditor value={value} onChange={onChange} />
				</>
			)}

			{functionType === "Vector3Function" && (
				<>
					<EditorInspectorBlockField>
						<div className="px-2">X</div>
						<FunctionEditor
							value={value.data.x || { functionType: "ConstantValue", data: { value: 0 } }}
							onChange={onChange}
							availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
							label=""
						/>
					</EditorInspectorBlockField>
					<EditorInspectorBlockField>
						<div className="px-2">Y</div>
						<FunctionEditor
							value={value.data.y || { functionType: "ConstantValue", data: { value: 0 } }}
							onChange={onChange}
							availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
							label=""
						/>
					</EditorInspectorBlockField>
					<EditorInspectorBlockField>
						<div className="px-2">Z</div>
						<FunctionEditor
							value={value.data.z || { functionType: "ConstantValue", data: { value: 0 } }}
							onChange={onChange}
							availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
							label=""
						/>
					</EditorInspectorBlockField>
				</>
			)}
		</>
	);
}
