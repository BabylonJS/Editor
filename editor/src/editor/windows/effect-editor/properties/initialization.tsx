import { ReactNode } from "react";

import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import { type Color, type Rotation, type Value } from "../types";
import type { IQuarksNode } from "../quarks-bridge";
import { EffectValueEditor, type IVec3Function } from "../editors/value";
import { EffectColorEditor } from "../editors/color";
import { ParticleSystem as QuarksParticleSystem, Vector3Function } from "babylon.quarks";
import {
	colorGeneratorToEditorColor,
	createConstantValue,
	editorColorToGenerator,
	editorRotationToGenerator,
	editorValueToGenerator,
	editorValueToVector3Generator,
	generatorToEditorValue,
	generatorToEditorVector3Value,
	rotationGeneratorToEditorRotation,
	type EditorVector3Value,
} from "../quarks-adapter";

export interface IEffectEditorParticleInitializationPropertiesProps {
	nodeData: IQuarksNode;
	onChange?: () => void;
}

function getVector3EditorValue(system: QuarksParticleSystem): EditorVector3Value {
	const value = generatorToEditorVector3Value(system.startSize);
	if (value.type === "Vec3Function") {
		return value;
	}
	return { type: "Vec3Function", x: value, y: value, z: value };
}

export function EffectEditorParticleInitializationProperties(props: IEffectEditorParticleInitializationPropertiesProps): ReactNode {
	const { nodeData } = props;
	const onChange = props.onChange || (() => {});

	if (nodeData.type !== "particle" || !nodeData.data) {
		return null;
	}

	const system = nodeData.data as QuarksParticleSystem;

	const getStartLife = (): Value => generatorToEditorValue(system.startLife);
	const setStartLife = (value: Value): void => {
		system.startLife = editorValueToGenerator(value);
		onChange();
	};

	const getStartSize = (): Value | IVec3Function => {
		return generatorToEditorVector3Value(system.startSize) as Value | IVec3Function;
	};
	const setStartSize = (value: Value | IVec3Function): void => {
		if (typeof value === "object" && "type" in value && value.type === "Vec3Function") {
			system.startSize = new Vector3Function(editorValueToGenerator(value.x), editorValueToGenerator(value.y), editorValueToGenerator(value.z));
		} else {
			system.startSize = editorValueToGenerator(value as Value);
		}
		onChange();
	};

	const getStartSpeed = (): Value => generatorToEditorValue(system.startSpeed);
	const setStartSpeed = (value: Value): void => {
		system.startSpeed = editorValueToGenerator(value);
		onChange();
	};

	const getStartColor = (): Color | undefined => colorGeneratorToEditorColor(system.startColor);
	const setStartColor = (value: Color): void => {
		system.startColor = editorColorToGenerator(value);
		onChange();
	};

	const getStartRotation = (): Rotation => rotationGeneratorToEditorRotation(system.startRotation);
	const setStartRotation = (value: Rotation): void => {
		system.startRotation = editorRotationToGenerator(value);
		onChange();
	};

	const getAngularSpeed = (): Value => {
		const rotation = getStartRotation();
		return rotation.type === "Euler" ? (rotation.angleZ ?? createConstantValue(0)) : createConstantValue(0);
	};
	const setAngularSpeed = (value: Value): void => {
		setStartRotation({ type: "Euler", angleZ: value, order: "xyz" });
	};

	const getScaleX = (): Value => getVector3EditorValue(system).x;
	const setScaleX = (value: Value): void => {
		const current = getVector3EditorValue(system);
		system.startSize = editorValueToVector3Generator({ ...current, x: value });
		onChange();
	};

	const getScaleY = (): Value => getVector3EditorValue(system).y;
	const setScaleY = (value: Value): void => {
		const current = getVector3EditorValue(system);
		system.startSize = editorValueToVector3Generator({ ...current, y: value });
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
					const rotation = getStartRotation();
					const angleZ =
						rotation && typeof rotation === "object" && "type" in rotation && rotation.type === "Euler" && rotation.angleZ
							? rotation.angleZ
							: { type: "IntervalValue" as const, a: 0, b: 0 };
					return (
						<EffectValueEditor
							value={angleZ}
							onChange={(newAngleZ) => setStartRotation({ type: "Euler", angleZ: newAngleZ as Value, order: "xyz" })}
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
