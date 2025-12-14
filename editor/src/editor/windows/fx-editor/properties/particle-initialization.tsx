import { ReactNode } from "react";

import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import type { VFXEffectNode } from "../VFX";
import { VFXParticleSystem, VFXSolidParticleSystem } from "../VFX";
import { VFXValueEditor, type IVec3Function } from "./vfx-value-editor";
import { VFXColorEditor } from "./vfx-color-editor";
import { VFXRotationEditor } from "./vfx-rotation-editor";
import type { VFXValue } from "../VFX/types/values";
import type { VFXColor } from "../VFX/types/colors";
import type { VFXRotation } from "../VFX/types/rotations";
import { VFXValueUtils } from "../VFX/utils/valueParser";

export interface IFXEditorParticleInitializationPropertiesProps {
	nodeData: VFXEffectNode;
	onChange?: () => void;
}

export function FXEditorParticleInitializationProperties(props: IFXEditorParticleInitializationPropertiesProps): ReactNode {
	const { nodeData } = props;
	const onChange = props.onChange || (() => {});

	if (nodeData.type !== "particle" || !nodeData.system) {
		return null;
	}

	const system = nodeData.system;

	// Helper to get/set startLife as VFXValue for both systems
	const getStartLife = (): VFXValue | undefined => {
		if (system instanceof VFXSolidParticleSystem) {
			return system.startLife;
		}
		// For VFXParticleSystem, convert minLifeTime/maxLifeTime to IntervalValue
		if (system instanceof VFXParticleSystem) {
			return { type: "IntervalValue", min: system.minLifeTime, max: system.maxLifeTime };
		}
		return undefined;
	};

	const setStartLife = (value: VFXValue): void => {
		if (system instanceof VFXSolidParticleSystem) {
			system.startLife = value;
		} else if (system instanceof VFXParticleSystem) {
			const interval = VFXValueUtils.parseIntervalValue(value);
			system.minLifeTime = interval.min;
			system.maxLifeTime = interval.max;
		}
		onChange();
	};

	// Helper to get/set startSize as VFXValue | IVec3Function for both systems
	const getStartSize = (): VFXValue | IVec3Function | undefined => {
		if (system instanceof VFXSolidParticleSystem) {
			return system.startSize;
		}
		// For VFXParticleSystem, convert minSize/maxSize to IntervalValue
		if (system instanceof VFXParticleSystem) {
			return { type: "IntervalValue", min: system.minSize, max: system.maxSize };
		}
		return undefined;
	};

	const setStartSize = (value: VFXValue | IVec3Function): void => {
		if (system instanceof VFXSolidParticleSystem) {
			// For Vec3Function, we need to handle it differently - but VFXSolidParticleSystem doesn't support Vec3Function yet
			// For now, convert Vec3Function to a single value
			if (typeof value === "object" && "type" in value && value.type === "Vec3Function") {
				const x = VFXValueUtils.parseConstantValue(value.x);
				const y = VFXValueUtils.parseConstantValue(value.y);
				const z = VFXValueUtils.parseConstantValue(value.z);
				const avg = (x + y + z) / 3;
				system.startSize = { type: "ConstantValue", value: avg };
			} else {
				system.startSize = value as VFXValue;
			}
		} else if (system instanceof VFXParticleSystem) {
			if (typeof value === "object" && "type" in value && value.type === "Vec3Function") {
				// For Vec3Function, use average of x, y, z
				const x = VFXValueUtils.parseConstantValue(value.x);
				const y = VFXValueUtils.parseConstantValue(value.y);
				const z = VFXValueUtils.parseConstantValue(value.z);
				const avg = (x + y + z) / 3;
				system.minSize = avg;
				system.maxSize = avg;
			} else {
				const interval = VFXValueUtils.parseIntervalValue(value as VFXValue);
				system.minSize = interval.min;
				system.maxSize = interval.max;
			}
		}
		onChange();
	};

	// Helper to get/set startSpeed as VFXValue for both systems
	const getStartSpeed = (): VFXValue | undefined => {
		if (system instanceof VFXSolidParticleSystem) {
			return system.startSpeed;
		}
		// For VFXParticleSystem, convert minEmitPower/maxEmitPower to IntervalValue
		if (system instanceof VFXParticleSystem) {
			return { type: "IntervalValue", min: system.minEmitPower, max: system.maxEmitPower };
		}
		return undefined;
	};

	const setStartSpeed = (value: VFXValue): void => {
		if (system instanceof VFXSolidParticleSystem) {
			system.startSpeed = value;
		} else if (system instanceof VFXParticleSystem) {
			const interval = VFXValueUtils.parseIntervalValue(value);
			system.minEmitPower = interval.min;
			system.maxEmitPower = interval.max;
		}
		onChange();
	};

	// Helper to get/set startColor as VFXColor for both systems
	const getStartColor = (): VFXColor | undefined => {
		if (system instanceof VFXSolidParticleSystem) {
			return system.startColor;
		}
		// For VFXParticleSystem, convert Color4 to ConstantColor
		if (system instanceof VFXParticleSystem && system.color1) {
			return { type: "ConstantColor", value: [system.color1.r, system.color1.g, system.color1.b, system.color1.a] };
		}
		return undefined;
	};

	const setStartColor = (value: VFXColor): void => {
		if (system instanceof VFXSolidParticleSystem) {
			system.startColor = value;
		} else if (system instanceof VFXParticleSystem) {
			const color = VFXValueUtils.parseConstantColor(value);
			system.color1 = color;
		}
		onChange();
	};

	// Helper to get/set startRotation as VFXRotation for both systems
	const getStartRotation = (): VFXRotation | undefined => {
		if (system instanceof VFXSolidParticleSystem) {
			return system.startRotation;
		}
		// For VFXParticleSystem, convert minInitialRotation/maxInitialRotation to Euler with angleZ
		if (system instanceof VFXParticleSystem) {
			return {
				type: "Euler",
				angleZ: { type: "IntervalValue", min: system.minInitialRotation, max: system.maxInitialRotation },
				order: "xyz",
			};
		}
		return undefined;
	};

	const setStartRotation = (value: VFXRotation): void => {
		if (system instanceof VFXSolidParticleSystem) {
			system.startRotation = value;
		} else if (system instanceof VFXParticleSystem) {
			// Extract angleZ from rotation for VFXParticleSystem
			if (typeof value === "object" && "type" in value && value.type === "Euler" && value.angleZ) {
				const interval = VFXValueUtils.parseIntervalValue(value.angleZ);
				system.minInitialRotation = interval.min;
				system.maxInitialRotation = interval.max;
			} else if (
				typeof value === "number" ||
				(typeof value === "object" && "type" in value && (value.type === "ConstantValue" || value.type === "IntervalValue" || value.type === "PiecewiseBezier"))
			) {
				const interval = VFXValueUtils.parseIntervalValue(value as VFXValue);
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
				<VFXValueEditor value={getStartLife()} onChange={setStartLife} availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]} min={0} step={0.1} />
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Start Size</div>
				<VFXValueEditor
					value={getStartSize()}
					onChange={setStartSize}
					availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier", "Vec3Function"]}
					min={0}
					step={0.01}
				/>
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Start Speed</div>
				<VFXValueEditor value={getStartSpeed()} onChange={setStartSpeed} availableTypes={["ConstantValue", "IntervalValue", "PiecewiseBezier"]} min={0} step={0.1} />
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Start Color</div>
				<VFXColorEditor value={getStartColor()} onChange={setStartColor} />
			</EditorInspectorBlockField>

			<EditorInspectorBlockField>
				<div className="px-2">Start Rotation</div>
				{system instanceof VFXSolidParticleSystem ? (
					<VFXRotationEditor value={getStartRotation()} onChange={setStartRotation} />
				) : (
					(() => {
						// For VFXParticleSystem, extract angleZ from rotation
						const rotation = getStartRotation();
						const angleZ =
							rotation && typeof rotation === "object" && "type" in rotation && rotation.type === "Euler" && rotation.angleZ
								? rotation.angleZ
								: rotation &&
									  (typeof rotation === "number" ||
											(typeof rotation === "object" &&
												"type" in rotation &&
												(rotation.type === "ConstantValue" || rotation.type === "IntervalValue" || rotation.type === "PiecewiseBezier")))
									? (rotation as VFXValue)
									: { type: "IntervalValue" as const, min: 0, max: 0 };
						return (
							<VFXValueEditor
								value={angleZ}
								onChange={(newAngleZ) => {
									setStartRotation({
										type: "Euler",
										angleZ: newAngleZ as VFXValue,
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
