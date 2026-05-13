import { ReactNode } from "react";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { BezierEditor } from "./bezier";

export type FunctionType = "ConstantValue" | "IntervalValue" | "PiecewiseBezier" | "Vector3Function";
export type FunctionEditorValue = {
	functionType?: FunctionType;
	data?: Record<string, unknown>;
};

export interface IFunctionEditorProps {
	value: FunctionEditorValue | null | undefined;
	onChange: () => void;
	availableTypes?: FunctionType[];
	label: string;
}

export function FunctionEditor(props: IFunctionEditorProps): ReactNode {
	const { value, onChange, availableTypes, label } = props;
	const types = availableTypes || ["ConstantValue", "IntervalValue", "PiecewiseBezier", "Vector3Function"];
	if (!value) {
		return null;
	}
	if (!value.functionType) {
		value.functionType = types[0];
	}
	if (!value.data) {
		value.data = {};
	}
	const functionType = value.functionType as FunctionType;

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
					const newType = value.functionType as FunctionType;
					value.data = {};
					if (newType === "ConstantValue") {
						(value.data as Record<string, unknown>).value = 1.0;
					} else if (newType === "IntervalValue") {
						(value.data as Record<string, unknown>).min = 0;
						(value.data as Record<string, unknown>).max = 1;
					} else if (newType === "PiecewiseBezier") {
						(value.data as Record<string, unknown>).function = { p0: 0, p1: 1.0 / 3, p2: (1.0 / 3) * 2, p3: 1 };
					} else if (newType === "Vector3Function") {
						(value.data as Record<string, unknown>).x = { functionType: "ConstantValue", data: { value: 0 } };
						(value.data as Record<string, unknown>).y = { functionType: "ConstantValue", data: { value: 0 } };
						(value.data as Record<string, unknown>).z = { functionType: "ConstantValue", data: { value: 0 } };
					}
					onChange();
				}}
			/>

			{functionType === "ConstantValue" && (
				<>
					{(value.data as Record<string, unknown>).value === undefined && ((value.data as Record<string, unknown>).value = 1.0)}
					<EditorInspectorNumberField object={value.data} property="value" label={label ? "Value" : ""} step={0.1} onChange={onChange} />
				</>
			)}

			{functionType === "IntervalValue" && (
				<>
					{(value.data as Record<string, unknown>).min === undefined && ((value.data as Record<string, unknown>).min = 0)}
					{(value.data as Record<string, unknown>).max === undefined && ((value.data as Record<string, unknown>).max = 1)}
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
					{!(value.data as Record<string, unknown>).function && ((value.data as Record<string, unknown>).function = { p0: 0, p1: 1.0 / 3, p2: (1.0 / 3) * 2, p3: 1 })}
					<BezierEditor value={value} onChange={onChange} />
				</>
			)}

			{functionType === "Vector3Function" && (
				<>
					<EditorInspectorBlockField>
						<div className="px-2">X</div>
						<FunctionEditor
							value={((value.data as Record<string, unknown>).x as FunctionEditorValue | undefined) ?? { functionType: "ConstantValue", data: { value: 0 } }}
							onChange={onChange}
							availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
							label=""
						/>
					</EditorInspectorBlockField>
					<EditorInspectorBlockField>
						<div className="px-2">Y</div>
						<FunctionEditor
							value={((value.data as Record<string, unknown>).y as FunctionEditorValue | undefined) ?? { functionType: "ConstantValue", data: { value: 0 } }}
							onChange={onChange}
							availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
							label=""
						/>
					</EditorInspectorBlockField>
					<EditorInspectorBlockField>
						<div className="px-2">Z</div>
						<FunctionEditor
							value={((value.data as Record<string, unknown>).z as FunctionEditorValue | undefined) ?? { functionType: "ConstantValue", data: { value: 0 } }}
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
