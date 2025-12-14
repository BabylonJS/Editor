import { ReactNode } from "react";

import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import type { VFXRotation, VFXEulerRotation, VFXAxisAngleRotation, VFXRandomQuatRotation } from "../VFX/types/rotations";
import { VFXValueEditor } from "./vfx-value-editor";
import { VFXValueUtils } from "../VFX/utils/valueParser";
import type { VFXValue } from "../VFX/types/values";

export type VFXRotationType = "Euler" | "AxisAngle" | "RandomQuat";

export interface IVFXRotationEditorProps {
	value: VFXRotation | undefined;
	onChange: (newValue: VFXRotation) => void;
	label?: string;
}

/**
 * Editor for VFXRotation (Euler, AxisAngle, RandomQuat)
 * Works directly with VFXRotation types, not wrappers
 */
export function VFXRotationEditor(props: IVFXRotationEditorProps): ReactNode {
	const { value, onChange, label } = props;

	// Determine current type from value
	let currentType: VFXRotationType = "Euler";
	if (value) {
		if (typeof value === "number" || (typeof value === "object" && "type" in value && (value.type === "ConstantValue" || value.type === "IntervalValue" || value.type === "PiecewiseBezier"))) {
			// Simple VFXValue - convert to Euler
			currentType = "Euler";
		} else if (typeof value === "object" && "type" in value) {
			if (value.type === "Euler") {
				currentType = "Euler";
			} else if (value.type === "AxisAngle") {
				currentType = "AxisAngle";
			} else if (value.type === "RandomQuat") {
				currentType = "RandomQuat";
			}
		}
	}

	const typeItems = [
		{ text: "Euler", value: "Euler" },
		{ text: "Axis Angle", value: "AxisAngle" },
		{ text: "Random Quat", value: "RandomQuat" },
	];

	// Wrapper object for EditorInspectorListField
	const wrapper = {
		get type() {
			return currentType;
		},
		set type(newType: VFXRotationType) {
			currentType = newType;
			// Convert value to new type
			let newValue: VFXRotation;
			if (newType === "Euler") {
				// Convert current value to Euler
				if (value && typeof value === "object" && "type" in value && value.type === "Euler") {
					newValue = value;
				} else {
					const angleZ = value ? (typeof value === "number" ? value : VFXValueUtils.parseConstantValue(value as VFXValue)) : 0;
					newValue = {
						type: "Euler",
						angleZ: { type: "ConstantValue", value: angleZ },
						order: "xyz",
					};
				}
			} else if (newType === "AxisAngle") {
				// Convert to AxisAngle
				const angle = value ? (typeof value === "number" ? value : VFXValueUtils.parseConstantValue(value as VFXValue)) : 0;
				newValue = {
					type: "AxisAngle",
					x: { type: "ConstantValue", value: 0 },
					y: { type: "ConstantValue", value: 0 },
					z: { type: "ConstantValue", value: 1 },
					angle: { type: "ConstantValue", value: angle },
				};
			} else {
				// RandomQuat
				newValue = { type: "RandomQuat" };
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

			{currentType === "Euler" && (
				<>
					{(() => {
						const eulerValue = value && typeof value === "object" && "type" in value && value.type === "Euler" ? value : null;
						const angleX = eulerValue?.angleX || { type: "ConstantValue" as const, value: 0 };
						const angleY = eulerValue?.angleY || { type: "ConstantValue" as const, value: 0 };
						const angleZ = eulerValue?.angleZ || { type: "ConstantValue" as const, value: 0 };
						const order = eulerValue?.order || "xyz";

						const orderWrapper = {
							get order() {
								return order;
							},
							set order(newOrder: "xyz" | "zyx") {
								if (eulerValue) {
									onChange({ ...eulerValue, order: newOrder });
								} else {
									onChange({
										type: "Euler",
										angleX,
										angleY,
										angleZ,
										order: newOrder,
									});
								}
							},
						};

						return (
							<>
								<EditorInspectorListField
									object={orderWrapper}
									property="order"
									label="Order"
									items={[
										{ text: "XYZ", value: "xyz" },
										{ text: "ZYX", value: "zyx" },
									]}
									onChange={() => {}}
								/>
								<EditorInspectorBlockField>
									<div className="px-2">Angle X</div>
									<VFXValueEditor
										value={angleX}
										onChange={(newAngleX) => {
											if (eulerValue) {
												onChange({ ...eulerValue, angleX: newAngleX as VFXValue });
											} else {
												onChange({
													type: "Euler",
													angleX: newAngleX as VFXValue,
													angleY,
													angleZ,
													order,
												});
											}
										}}
										availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
										step={0.1}
									/>
								</EditorInspectorBlockField>
								<EditorInspectorBlockField>
									<div className="px-2">Angle Y</div>
									<VFXValueEditor
										value={angleY}
										onChange={(newAngleY) => {
											if (eulerValue) {
												onChange({ ...eulerValue, angleY: newAngleY as VFXValue });
											} else {
												onChange({
													type: "Euler",
													angleX,
													angleY: newAngleY as VFXValue,
													angleZ,
													order,
												});
											}
										}}
										availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
										step={0.1}
									/>
								</EditorInspectorBlockField>
								<EditorInspectorBlockField>
									<div className="px-2">Angle Z</div>
									<VFXValueEditor
										value={angleZ}
										onChange={(newAngleZ) => {
											if (eulerValue) {
												onChange({ ...eulerValue, angleZ: newAngleZ as VFXValue });
											} else {
												onChange({
													type: "Euler",
													angleX,
													angleY,
													angleZ: newAngleZ as VFXValue,
													order,
												});
											}
										}}
										availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
										step={0.1}
									/>
								</EditorInspectorBlockField>
							</>
						);
					})()}
				</>
			)}

			{currentType === "AxisAngle" && (
				<>
					{(() => {
						const axisAngleValue = value && typeof value === "object" && "type" in value && value.type === "AxisAngle" ? value : null;
						const x = axisAngleValue?.x || { type: "ConstantValue" as const, value: 0 };
						const y = axisAngleValue?.y || { type: "ConstantValue" as const, value: 0 };
						const z = axisAngleValue?.z || { type: "ConstantValue" as const, value: 1 };
						const angle = axisAngleValue?.angle || { type: "ConstantValue" as const, value: 0 };

						return (
							<>
								<EditorInspectorBlockField>
									<div className="px-2">Axis X</div>
									<VFXValueEditor
										value={x}
										onChange={(newX) => {
											if (axisAngleValue) {
												onChange({ ...axisAngleValue, x: newX as VFXValue });
											} else {
												onChange({
													type: "AxisAngle",
													x: newX as VFXValue,
													y,
													z,
													angle,
												});
											}
										}}
										availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
										step={0.1}
									/>
								</EditorInspectorBlockField>
								<EditorInspectorBlockField>
									<div className="px-2">Axis Y</div>
									<VFXValueEditor
										value={y}
										onChange={(newY) => {
											if (axisAngleValue) {
												onChange({ ...axisAngleValue, y: newY as VFXValue });
											} else {
												onChange({
													type: "AxisAngle",
													x,
													y: newY as VFXValue,
													z,
													angle,
												});
											}
										}}
										availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
										step={0.1}
									/>
								</EditorInspectorBlockField>
								<EditorInspectorBlockField>
									<div className="px-2">Axis Z</div>
									<VFXValueEditor
										value={z}
										onChange={(newZ) => {
											if (axisAngleValue) {
												onChange({ ...axisAngleValue, z: newZ as VFXValue });
											} else {
												onChange({
													type: "AxisAngle",
													x,
													y,
													z: newZ as VFXValue,
													angle,
												});
											}
										}}
										availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
										step={0.1}
									/>
								</EditorInspectorBlockField>
								<EditorInspectorBlockField>
									<div className="px-2">Angle</div>
									<VFXValueEditor
										value={angle}
										onChange={(newAngle) => {
											if (axisAngleValue) {
												onChange({ ...axisAngleValue, angle: newAngle as VFXValue });
											} else {
												onChange({
													type: "AxisAngle",
													x,
													y,
													z,
													angle: newAngle as VFXValue,
												});
											}
										}}
										availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
										step={0.1}
									/>
								</EditorInspectorBlockField>
							</>
						);
					})()}
				</>
			)}

			{currentType === "RandomQuat" && (
				<>
					<div className="px-2 text-sm text-muted-foreground">Random quaternion rotation will be applied to each particle</div>
				</>
			)}
		</>
	);
}

