import { ReactNode } from "react";

import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { type EffectNode, EffectSolidParticleSystem, EffectParticleSystem, ValueUtils, Value, Color, Rotation } from "babylonjs-editor-tools";
import { EffectValueEditor, type IVec3Function } from "./value-editor";
import { EffectColorEditor } from "./color-editor";
import { EffectRotationEditor } from "./rotation-editor";

export interface IEffectEditorParticleInitializationPropertiesProps {
	nodeData: EffectNode;
	onChange?: () => void;
}

export function EffectEditorParticleInitializationProperties(props: IEffectEditorParticleInitializationPropertiesProps): ReactNode {
	const { nodeData } = props;
	const onChange = props.onChange || (() => {});

	if (nodeData.type !== "particle" || !nodeData.system) {
		return null;
	}

	const system = nodeData.system;

	// Helper to get/set startLife as VEffectValue for both systems
	const getStartLife = (): Value | undefined => {
		if (system instanceof EffectSolidParticleSystem) {
			return system.startLife;
		}
		// For VEffectParticleSystem, convert minLifeTime/maxLifeTime to IntervalValue
		if (system instanceof EffectParticleSystem) {
			return { type: "IntervalValue", min: system.minLifeTime, max: system.maxLifeTime };
		}
		return undefined;
	};

	const setStartLife = (value: Value): void => {
		if (system instanceof EffectSolidParticleSystem) {
			system.startLife = value;
		} else if (system instanceof EffectParticleSystem) {
			const interval = ValueUtils.parseIntervalValue(value);
			system.minLifeTime = interval.min;
			system.maxLifeTime = interval.max;
		}
		onChange();
	};

	// Helper to get/set startSize as VEffectValue | IVec3Function for both systems
	const getStartSize = (): Value | IVec3Function | undefined => {
		if (system instanceof EffectSolidParticleSystem) {
			return system.startSize;
		}
		// For VEffectParticleSystem, convert minSize/maxSize to IntervalValue
		if (system instanceof EffectParticleSystem) {
			return { type: "IntervalValue", min: system.minSize, max: system.maxSize };
		}
		return undefined;
	};

	const setStartSize = (value: Value | IVec3Function): void => {
		if (system instanceof EffectSolidParticleSystem) {
			// For Vec3Function, we need to handle it differently - but VEffectSolidParticleSystem doesn't support Vec3Function yet
			// For now, convert Vec3Function to a single value
			if (typeof value === "object" && "type" in value && value.type === "Vec3Function") {
				const x = ValueUtils.parseConstantValue(value.x);
				const y = ValueUtils.parseConstantValue(value.y);
				const z = ValueUtils.parseConstantValue(value.z);
				const avg = (x + y + z) / 3;
				system.startSize = { type: "ConstantValue", value: avg };
			} else {
				system.startSize = value as Value;
			}
		} else if (system instanceof EffectParticleSystem) {
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
		}
		onChange();
	};

	// Helper to get/set startSpeed as VEffectValue for both systems
	const getStartSpeed = (): Value | undefined => {
		if (system instanceof EffectSolidParticleSystem) {
			return system.startSpeed;
		}
		// For VEffectParticleSystem, convert minEmitPower/maxEmitPower to IntervalValue
		if (system instanceof EffectParticleSystem) {
			return { type: "IntervalValue", min: system.minEmitPower, max: system.maxEmitPower };
		}
		return undefined;
	};

	const setStartSpeed = (value: Value): void => {
		if (system instanceof EffectSolidParticleSystem) {
			system.startSpeed = value;
		} else if (system instanceof EffectParticleSystem) {
			const interval = ValueUtils.parseIntervalValue(value);
			system.minEmitPower = interval.min;
			system.maxEmitPower = interval.max;
		}
		onChange();
	};

	// Helper to get/set startColor as VEffectColor for both systems
	const getStartColor = (): Color | undefined => {
		if (system instanceof EffectSolidParticleSystem) {
			return system.startColor;
		}
		// For VEffectParticleSystem, convert Color4 to ConstantColor
		if (system instanceof EffectParticleSystem && system.color1) {
			return { type: "ConstantColor", value: [system.color1.r, system.color1.g, system.color1.b, system.color1.a] };
		}
		return undefined;
	};

	const setStartColor = (value: Color): void => {
		if (system instanceof EffectSolidParticleSystem) {
			system.startColor = value;
		} else if (system instanceof EffectParticleSystem) {
			const color = ValueUtils.parseConstantColor(value);
			system.color1 = color;
		}
		onChange();
	};

	// Helper to get/set startRotation as VEffectRotation for both systems
	const getStartRotation = (): Rotation | undefined => {
		if (system instanceof EffectSolidParticleSystem) {
			return system.startRotation;
		}
		// For VEffectParticleSystem, convert minInitialRotation/maxInitialRotation to Euler with angleZ
		if (system instanceof EffectParticleSystem) {
			return {
				type: "Euler",
				angleZ: { type: "IntervalValue", min: system.minInitialRotation, max: system.maxInitialRotation },
				order: "xyz",
			};
		}
		return undefined;
	};

	const setStartRotation = (value: Rotation): void => {
		if (system instanceof EffectSolidParticleSystem) {
			system.startRotation = value;
		} else if (system instanceof EffectParticleSystem) {
			// Extract angleZ from rotation for VEffectParticleSystem
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
		}
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
				<div className="px-2">Start Speed</div>
				<EffectValueEditor value={getStartSpeed()} onChange={setStartSpeed} availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]} min={0} step={0.1} />
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Start Color</div>
				<EffectColorEditor value={getStartColor()} onChange={setStartColor} />
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Start Rotation</div>
				{system instanceof EffectSolidParticleSystem ? (
					<EffectRotationEditor value={getStartRotation()} onChange={setStartRotation} />
				) : (
					(() => {
						// For VEffectParticleSystem, extract angleZ from rotation
						const rotation = getStartRotation();
						const angleZ =
							rotation && typeof rotation === "object" && "type" in rotation && rotation.type === "Euler" && rotation.angleZ
								? rotation.angleZ
								: rotation &&
									  (typeof rotation === "number" ||
											(typeof rotation === "object" &&
												"type" in rotation &&
												(rotation.type === "ConstantValue" || rotation.type === "IntervalValue" || rotation.type === "PiecewiseBezier")))
									? (rotation as Value)
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
					})()
				)}
			</EditorInspectorBlockField>
		</>
	);
}
