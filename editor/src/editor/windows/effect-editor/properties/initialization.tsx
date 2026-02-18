import { ReactNode } from "react";

import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { type IEffectNode, parseConstantValue, parseIntervalValue, parseConstantColor, Value, Color, Rotation } from "babylonjs-editor-tools";
import { EffectValueEditor, type IVec3Function } from "../editors/value";
import { EffectColorEditor } from "../editors/color";

export interface IEffectEditorParticleInitializationPropertiesProps {
	nodeData: IEffectNode;
	onChange?: () => void;
}

export function EffectEditorParticleInitializationProperties(props: IEffectEditorParticleInitializationPropertiesProps): ReactNode {
	const { nodeData } = props;
	const onChange = props.onChange || (() => {});

	if (nodeData.type !== "particle" || !nodeData.data) {
		return null;
	}

	const system = nodeData.data;

	// Helper to get/set startLife - both systems use native minLifeTime/maxLifeTime
	const getStartLife = (): Value | undefined => {
		// Both systems have native minLifeTime/maxLifeTime properties
		return { type: "IntervalValue", min: (system as any).minLifeTime, max: (system as any).maxLifeTime };
	};

	const setStartLife = (value: Value): void => {
		const interval = parseIntervalValue(value);
		(system as any).minLifeTime = interval.min;
		(system as any).maxLifeTime = interval.max;
		onChange();
	};

	// Helper to get/set startSize - both systems use native minSize/maxSize
	const getStartSize = (): Value | IVec3Function | undefined => {
		// Both systems have native minSize/maxSize properties
		return { type: "IntervalValue", min: (system as any).minSize, max: (system as any).maxSize };
	};

	const setStartSize = (value: Value | IVec3Function): void => {
		if (typeof value === "object" && "type" in value && value.type === "Vec3Function") {
			// For Vec3Function, use average of x, y, z
			const x = parseConstantValue(value.x);
			const y = parseConstantValue(value.y);
			const z = parseConstantValue(value.z);
			const avg = (x + y + z) / 3;
			(system as any).minSize = avg;
			(system as any).maxSize = avg;
		} else {
			const interval = parseIntervalValue(value as Value);
			(system as any).minSize = interval.min;
			(system as any).maxSize = interval.max;
		}
		onChange();
	};

	// Helper to get/set startSpeed - both systems use native minEmitPower/maxEmitPower
	const getStartSpeed = (): Value | undefined => {
		// Both systems have native minEmitPower/maxEmitPower properties
		return { type: "IntervalValue", min: (system as any).minEmitPower, max: (system as any).maxEmitPower };
	};

	const setStartSpeed = (value: Value): void => {
		const interval = parseIntervalValue(value);
		(system as any).minEmitPower = interval.min;
		(system as any).maxEmitPower = interval.max;
		onChange();
	};

	// Helper to get/set startColor - both systems use native color1
	const getStartColor = (): Color | undefined => {
		// Both systems have native color1 property
		if ((system as any).color1) {
			return { type: "ConstantColor", value: [(system as any).color1.r, (system as any).color1.g, (system as any).color1.b, (system as any).color1.a] };
		}
		return undefined;
	};

	const setStartColor = (value: Color): void => {
		const color = parseConstantColor(value);
		// Convert to linear space for PBR material with unlit
		color.toLinearSpaceToRef(color);
		(system as any).color1 = color;
		onChange();
	};

	// Helper to get/set startRotation - both systems use native minInitialRotation/maxInitialRotation
	const getStartRotation = (): Rotation | undefined => {
		// Both systems have native minInitialRotation/maxInitialRotation properties
		return {
			type: "Euler",
			angleZ: { type: "IntervalValue", min: (system as any).minInitialRotation, max: (system as any).maxInitialRotation },
			order: "xyz",
		};
	};

	const setStartRotation = (value: Rotation): void => {
		// Extract angleZ from rotation
		if (typeof value === "object" && "type" in value && value.type === "Euler" && value.angleZ) {
			const interval = parseIntervalValue(value.angleZ);
			(system as any).minInitialRotation = interval.min;
			(system as any).maxInitialRotation = interval.max;
		} else if (
			typeof value === "number" ||
			(typeof value === "object" && "type" in value && (value.type === "ConstantValue" || value.type === "IntervalValue" || value.type === "PiecewiseBezier"))
		) {
			const interval = parseIntervalValue(value as Value);
			(system as any).minInitialRotation = interval.min;
			(system as any).maxInitialRotation = interval.max;
		}
		onChange();
	};

	// Helper to get/set angular speed - both systems use native minAngularSpeed/maxAngularSpeed
	const getAngularSpeed = (): Value | undefined => {
		return { type: "IntervalValue", min: (system as any).minAngularSpeed, max: (system as any).maxAngularSpeed };
	};

	const setAngularSpeed = (value: Value): void => {
		const interval = parseIntervalValue(value);
		(system as any).minAngularSpeed = interval.min;
		(system as any).maxAngularSpeed = interval.max;
		onChange();
	};

	// Helper to get/set scale X - both systems use native minScaleX/maxScaleX
	const getScaleX = (): Value | undefined => {
		return { type: "IntervalValue", min: (system as any).minScaleX, max: (system as any).maxScaleX };
	};

	const setScaleX = (value: Value): void => {
		const interval = parseIntervalValue(value);
		(system as any).minScaleX = interval.min;
		(system as any).maxScaleX = interval.max;
		onChange();
	};

	// Helper to get/set scale Y - both systems use native minScaleY/maxScaleY
	const getScaleY = (): Value | undefined => {
		return { type: "IntervalValue", min: (system as any).minScaleY, max: (system as any).maxScaleY };
	};

	const setScaleY = (value: Value): void => {
		const interval = parseIntervalValue(value);
		(system as any).minScaleY = interval.min;
		(system as any).maxScaleY = interval.max;
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
