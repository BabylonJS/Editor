import { ReactNode } from "react";

import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { type IEffectNode, ValueUtils, Value, Color, Rotation } from "babylonjs-editor-tools";
import { EffectValueEditor, type IVec3Function } from "../editors/value";
import { EffectColorEditor } from "../editors/color";

export interface IEffectEditorParticleInitializationPropertiesProps {
	nodeData: IEffectNode;
	onChange?: () => void;
}

export function EffectEditorParticleInitializationProperties(props: IEffectEditorParticleInitializationPropertiesProps): ReactNode {
	const { nodeData } = props;
	const onChange = props.onChange || (() => {});

	if (nodeData.type !== "particle" || !nodeData.system) {
		return null;
	}

	const system = nodeData.system;

	// Helper to get/set startLife - both systems use native minLifeTime/maxLifeTime
	const getStartLife = (): Value | undefined => {
		// Both systems have native minLifeTime/maxLifeTime properties
		return { type: "IntervalValue", min: system.minLifeTime, max: system.maxLifeTime };
	};

	const setStartLife = (value: Value): void => {
		const interval = ValueUtils.parseIntervalValue(value);
		system.minLifeTime = interval.min;
		system.maxLifeTime = interval.max;
		onChange();
	};

	// Helper to get/set startSize - both systems use native minSize/maxSize
	const getStartSize = (): Value | IVec3Function | undefined => {
		// Both systems have native minSize/maxSize properties
		return { type: "IntervalValue", min: system.minSize, max: system.maxSize };
	};

	const setStartSize = (value: Value | IVec3Function): void => {
		if (typeof value === "object" && "type" in value && value.type === "Vec3Function") {
			// For Vec3Function, use average of x, y, z
			const x = ValueUtils.parseConstantValue(value.x);
			const y = ValueUtils.parseConstantValue(value.y);
			const z = ValueUtils.parseConstantValue(value.z);
			const avg = (x + y + z) / 3;
			system.minSize = avg;
			system.maxSize = avg;
		} else {
			const interval = ValueUtils.parseIntervalValue(value as Value);
			system.minSize = interval.min;
			system.maxSize = interval.max;
		}
		onChange();
	};

	// Helper to get/set startSpeed - both systems use native minEmitPower/maxEmitPower
	const getStartSpeed = (): Value | undefined => {
		// Both systems have native minEmitPower/maxEmitPower properties
		return { type: "IntervalValue", min: system.minEmitPower, max: system.maxEmitPower };
	};

	const setStartSpeed = (value: Value): void => {
		const interval = ValueUtils.parseIntervalValue(value);
		system.minEmitPower = interval.min;
		system.maxEmitPower = interval.max;
		onChange();
	};

	// Helper to get/set startColor - both systems use native color1
	const getStartColor = (): Color | undefined => {
		// Both systems have native color1 property
		if (system.color1) {
			return { type: "ConstantColor", value: [system.color1.r, system.color1.g, system.color1.b, system.color1.a] };
		}
		return undefined;
	};

	const setStartColor = (value: Color): void => {
		const color = ValueUtils.parseConstantColor(value);
		system.color1 = color;
		onChange();
	};

	// Helper to get/set startRotation - both systems use native minInitialRotation/maxInitialRotation
	const getStartRotation = (): Rotation | undefined => {
		// Both systems have native minInitialRotation/maxInitialRotation properties
		return {
			type: "Euler",
			angleZ: { type: "IntervalValue", min: system.minInitialRotation, max: system.maxInitialRotation },
			order: "xyz",
		};
	};

	const setStartRotation = (value: Rotation): void => {
		// Extract angleZ from rotation
		if (typeof value === "object" && "type" in value && value.type === "Euler" && value.angleZ) {
			const interval = ValueUtils.parseIntervalValue(value.angleZ);
			system.minInitialRotation = interval.min;
			system.maxInitialRotation = interval.max;
		} else if (
			typeof value === "number" ||
			(typeof value === "object" && "type" in value && (value.type === "ConstantValue" || value.type === "IntervalValue" || value.type === "PiecewiseBezier"))
		) {
			const interval = ValueUtils.parseIntervalValue(value as Value);
			system.minInitialRotation = interval.min;
			system.maxInitialRotation = interval.max;
		}
		onChange();
	};

	// Helper to get/set angular speed - both systems use native minAngularSpeed/maxAngularSpeed
	const getAngularSpeed = (): Value | undefined => {
		return { type: "IntervalValue", min: system.minAngularSpeed, max: system.maxAngularSpeed };
	};

	const setAngularSpeed = (value: Value): void => {
		const interval = ValueUtils.parseIntervalValue(value);
		system.minAngularSpeed = interval.min;
		system.maxAngularSpeed = interval.max;
		onChange();
	};

	// Helper to get/set scale X - both systems use native minScaleX/maxScaleX
	const getScaleX = (): Value | undefined => {
		return { type: "IntervalValue", min: system.minScaleX, max: system.maxScaleX };
	};

	const setScaleX = (value: Value): void => {
		const interval = ValueUtils.parseIntervalValue(value);
		system.minScaleX = interval.min;
		system.maxScaleX = interval.max;
		onChange();
	};

	// Helper to get/set scale Y - both systems use native minScaleY/maxScaleY
	const getScaleY = (): Value | undefined => {
		return { type: "IntervalValue", min: system.minScaleY, max: system.maxScaleY };
	};

	const setScaleY = (value: Value): void => {
		const interval = ValueUtils.parseIntervalValue(value);
		system.minScaleY = interval.min;
		system.maxScaleY = interval.max;
		onChange();
	};

	return (
		<>
			<EditorInspectorBlockField>
				<div className="px-2">Start Life</div>
				<EffectValueEditor value={getStartLife()} onChange={setStartLife} availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]} min={0} step={0.1} />
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Start Size</div>
				<EffectValueEditor
					value={getStartSize()}
					onChange={setStartSize}
					availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier", "Vec3Function"]}
					min={0}
					step={0.01}
				/>
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Scale X</div>
				<EffectValueEditor value={getScaleX()} onChange={setScaleX} availableTypes={["ConstantValue", "IntervalValue"]} min={0} step={0.01} />
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Scale Y</div>
				<EffectValueEditor value={getScaleY()} onChange={setScaleY} availableTypes={["ConstantValue", "IntervalValue"]} min={0} step={0.01} />
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Start Speed</div>
				<EffectValueEditor value={getStartSpeed()} onChange={setStartSpeed} availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]} min={0} step={0.1} />
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Start Color</div>
				<EffectColorEditor value={getStartColor()} onChange={setStartColor} />
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Start Rotation</div>
				{(() => {
					// Both systems use native minInitialRotation/maxInitialRotation
					const rotation = getStartRotation();
					const angleZ =
						rotation && typeof rotation === "object" && "type" in rotation && rotation.type === "Euler" && rotation.angleZ
							? rotation.angleZ
							: { type: "IntervalValue" as const, min: 0, max: 0 };
					return (
						<EffectValueEditor
							value={angleZ}
							onChange={(newAngleZ) => {
								setStartRotation({
									type: "Euler",
									angleZ: newAngleZ as Value,
									order: "xyz",
								});
							}}
							availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]}
							step={0.1}
						/>
					);
				})()}
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Angular Speed</div>
				<EffectValueEditor value={getAngularSpeed()} onChange={setAngularSpeed} availableTypes={["ConstantValue", "IntervalValue"]} step={0.1} />
			</EditorInspectorBlockField>
		</>
	);
}
