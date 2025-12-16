import { ReactNode } from "react";

import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { type Rotation, type EulerRotation, type AxisAngleRotation, type RandomQuatRotation, ValueUtils, type Value } from "babylonjs-editor-tools";
import { EffectValueEditor } from "./value";

export type EffectRotationType = EulerRotation["type"] | AxisAngleRotation["type"] | RandomQuatRotation["type"];

export interface IEffectRotationEditorProps {
	value: Rotation | undefined;
	onChange: (newValue: Rotation) => void;
	label?: string;
}

/**
 * Editor for VEffectRotation (Euler, AxisAngle, RandomQuat)
 * Works directly with VEffectRotation types, not wrappers
 */
export function EffectRotationEditor(props: IEffectRotationEditorProps): ReactNode {
	const { value, onChange, label } = props;

	// Determine current type from value
	let currentType: EffectRotationType = "Euler";
	if (value) {
		if (
			typeof value === "number" ||
			(typeof value === "object" && "type" in value && (value.type === "ConstantValue" || value.type === "IntervalValue" || value.type === "PiecewiseBezier"))
		) {
			// Simple VEffectValue - convert to Euler
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
		set type(newType: EffectRotationType) {
			currentType = newType;
			// Convert value to new type
			let newValue: Rotation;
			if (newType === "Euler") {
				// Convert current value to Euler
				if (value && typeof value === "object" && "type" in value && value.type === "Euler") {
					newValue = value;
				} else {
					const angleZ = value ? (typeof value === "number" ? value : ValueUtils.parseConstantValue(value as Value)) : 0;
					newValue = {
						type: "Euler",
						angleZ: { type: "ConstantValue", value: angleZ },
						order: "xyz",
					};
				}
			} else if (newType === "AxisAngle") {
				// Convert to AxisAngle
				const angle = value ? (typeof value === "number" ? value : ValueUtils.parseConstantValue(value as Value)) : 0;
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
									<EffectValueEditor
										value={angleX}
										onChange={(newAngleX) => {
											if (eulerValue) {
												onChange({ ...eulerValue, angleX: newAngleX as Value });
											} else {
												onChange({
													type: "Euler",
													angleX: newAngleX as Value,
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
									<EffectValueEditor
										value={angleY}
										onChange={(newAngleY) => {
											if (eulerValue) {
												onChange({ ...eulerValue, angleY: newAngleY as Value });
											} else {
												onChange({
													type: "Euler",
													angleX,
													angleY: newAngleY as Value,
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
									<EffectValueEditor
										value={angleZ}
										onChange={(newAngleZ) => {
											if (eulerValue) {
												onChange({ ...eulerValue, angleZ: newAngleZ as Value });
											} else {
												onChange({
													type: "Euler",
													angleX,
													angleY,
													angleZ: newAngleZ as Value,
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
									<EffectValueEditor
										value={x}
										onChange={(newX) => {
											if (axisAngleValue) {
												onChange({ ...axisAngleValue, x: newX as Value });
											} else {
												onChange({
													type: "AxisAngle",
													x: newX as Value,
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
									<EffectValueEditor
										value={y}
										onChange={(newY) => {
											if (axisAngleValue) {
												onChange({ ...axisAngleValue, y: newY as Value });
											} else {
												onChange({
													type: "AxisAngle",
													x,
													y: newY as Value,
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
									<EffectValueEditor
										value={z}
										onChange={(newZ) => {
											if (axisAngleValue) {
												onChange({ ...axisAngleValue, z: newZ as Value });
											} else {
												onChange({
													type: "AxisAngle",
													x,
													y,
													z: newZ as Value,
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
									<EffectValueEditor
										value={angle}
										onChange={(newAngle) => {
											if (axisAngleValue) {
												onChange({ ...axisAngleValue, angle: newAngle as Value });
											} else {
												onChange({
													type: "AxisAngle",
													x,
													y,
													z,
													angle: newAngle as Value,
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
