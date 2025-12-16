import { ReactNode } from "react";
import { Vector3 } from "babylonjs";

import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorVectorField } from "../../../layout/inspector/fields/vector";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";
import { EditorInspectorSectionField } from "../../../layout/inspector/fields/section";

import {
	type EffectNode,
	EffectSolidParticleSystem,
	EffectParticleSystem,
	SolidSphereParticleEmitter,
	SolidConeParticleEmitter,
	EmissionBurst,
	Value,
} from "babylonjs-editor-tools";
import { EffectValueEditor } from "../editors/value";

export interface IEffectEditorEmissionPropertiesProps {
	nodeData: EffectNode;
	onChange: () => void;
}

/**
 * Renders emitter shape properties for SolidParticleSystem
 */
function renderSolidParticleSystemEmitter(system: EffectSolidParticleSystem, onChange: () => void): ReactNode {
	const emitter = system.particleEmitterType;
	const emitterType = emitter ? emitter.constructor.name : "Point";

	const emitterTypeMap: Record<string, string> = {
		SolidPointParticleEmitter: "Point",
		SolidSphereParticleEmitter: "Sphere",
		SolidConeParticleEmitter: "Cone",
	};

	const currentType = emitterTypeMap[emitterType] || "Point";
	const emitterTypes = [
		{ text: "Point", value: "point" },
		{ text: "Sphere", value: "sphere" },
		{ text: "Cone", value: "cone" },
	];

	return (
		<>
			<EditorInspectorListField
				object={{ shapeType: currentType }}
				property="shapeType"
				label="Shape"
				items={emitterTypes.map((t) => ({ text: t.text, value: t.value }))}
				onChange={(value) => {
					const currentRadius = emitter instanceof SolidSphereParticleEmitter || emitter instanceof SolidConeParticleEmitter ? emitter.radius : 1;
					const currentArc = emitter instanceof SolidSphereParticleEmitter || emitter instanceof SolidConeParticleEmitter ? emitter.arc : Math.PI * 2;
					const currentThickness = emitter instanceof SolidSphereParticleEmitter || emitter instanceof SolidConeParticleEmitter ? emitter.thickness : 1;
					const currentAngle = emitter instanceof SolidConeParticleEmitter ? emitter.angle : Math.PI / 6;

					switch (value) {
						case "point":
							system.createPointEmitter();
							break;
						case "sphere":
							system.createSphereEmitter(currentRadius, currentArc, currentThickness);
							break;
						case "cone":
							system.createConeEmitter(currentRadius, currentArc, currentThickness, currentAngle);
							break;
					}
					onChange();
				}}
			/>

			{emitter instanceof SolidSphereParticleEmitter && (
				<>
					<EditorInspectorNumberField object={emitter} property="radius" label="Radius" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="arc" label="Arc" min={0} max={Math.PI * 2} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="thickness" label="Thickness" min={0} max={1} step={0.01} onChange={onChange} />
				</>
			)}

			{emitter instanceof SolidConeParticleEmitter && (
				<>
					<EditorInspectorNumberField object={emitter} property="radius" label="Radius" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="arc" label="Arc" min={0} max={Math.PI * 2} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="thickness" label="Thickness" min={0} max={1} step={0.01} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="angle" label="Angle" min={0} max={Math.PI} step={0.1} onChange={onChange} />
				</>
			)}
		</>
	);
}

/**
 * Renders emitter shape properties for ParticleSystem
 */
function renderParticleSystemEmitter(system: EffectParticleSystem, onChange: () => void): ReactNode {
	const emitter = system.particleEmitterType;
	if (!emitter) {
		return <div className="px-2 text-muted-foreground">No emitter found.</div>;
	}

	const emitterType = emitter.getClassName();
	const emitterTypeMap: Record<string, string> = {
		PointParticleEmitter: "point",
		BoxParticleEmitter: "box",
		SphereParticleEmitter: "sphere",
		SphereDirectedParticleEmitter: "sphere",
		ConeParticleEmitter: "cone",
		ConeDirectedParticleEmitter: "cone",
		HemisphericParticleEmitter: "hemisphere",
		CylinderParticleEmitter: "cylinder",
		CylinderDirectedParticleEmitter: "cylinder",
	};

	const currentType = emitterTypeMap[emitterType] || "point";
	const emitterTypes = [
		{ text: "Point", value: "point" },
		{ text: "Box", value: "box" },
		{ text: "Sphere", value: "sphere" },
		{ text: "Cone", value: "cone" },
		{ text: "Hemisphere", value: "hemisphere" },
		{ text: "Cylinder", value: "cylinder" },
	];

	return (
		<>
			<EditorInspectorListField
				object={{ shapeType: currentType }}
				property="shapeType"
				label="Shape"
				items={emitterTypes.map((t) => ({ text: t.text, value: t.value }))}
				onChange={(value) => {
					const currentRadius = "radius" in emitter ? (emitter as any).radius : 1;
					const currentAngle = "angle" in emitter ? (emitter as any).angle : Math.PI / 6;
					const currentHeight = "height" in emitter ? (emitter as any).height : 1;
					const currentDirection1 = "direction1" in emitter ? (emitter as any).direction1?.clone() : Vector3.Zero();
					const currentDirection2 = "direction2" in emitter ? (emitter as any).direction2?.clone() : Vector3.Zero();
					const currentMinEmitBox = "minEmitBox" in emitter ? (emitter as any).minEmitBox?.clone() : new Vector3(-0.5, -0.5, -0.5);
					const currentMaxEmitBox = "maxEmitBox" in emitter ? (emitter as any).maxEmitBox?.clone() : new Vector3(0.5, 0.5, 0.5);

					switch (value) {
						case "point":
							system.createPointEmitter(currentDirection1, currentDirection2);
							break;
						case "box":
							system.createBoxEmitter(currentDirection1, currentDirection2, currentMinEmitBox, currentMaxEmitBox);
							break;
						case "sphere":
							system.createSphereEmitter(currentRadius);
							break;
						case "cone":
							system.createConeEmitter(currentRadius, currentAngle);
							break;
						case "hemisphere":
							system.createHemisphericEmitter(currentRadius);
							break;
						case "cylinder":
							system.createCylinderEmitter(currentRadius, currentHeight);
							break;
					}
					onChange();
				}}
			/>

			{emitterType === "BoxParticleEmitter" && (
				<>
					<EditorInspectorBlockField>
						<div className="px-2">Direction</div>
						<EditorInspectorVectorField grayLabel object={emitter} property="direction1" label="Min" onChange={onChange} />
						<EditorInspectorVectorField grayLabel object={emitter} property="direction2" label="Max" onChange={onChange} />
					</EditorInspectorBlockField>
					<EditorInspectorBlockField>
						<div className="px-2">Emit Box</div>
						<EditorInspectorVectorField grayLabel object={emitter} property="minEmitBox" label="Min" onChange={onChange} />
						<EditorInspectorVectorField grayLabel object={emitter} property="maxEmitBox" label="Max" onChange={onChange} />
					</EditorInspectorBlockField>
				</>
			)}

			{(emitterType === "ConeParticleEmitter" || emitterType === "ConeDirectedParticleEmitter") && (
				<>
					<EditorInspectorNumberField object={emitter} property="radius" label="Radius" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="angle" label="Angle" min={0} max={Math.PI} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" min={0} max={1} step={0.01} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="heightRange" label="Height Range" min={0} max={1} step={0.01} onChange={onChange} />
					<EditorInspectorSwitchField object={emitter} property="emitFromSpawnPointOnly" label="Emit From Spawn Point Only" onChange={onChange} />

					{emitterType === "ConeDirectedParticleEmitter" && (
						<EditorInspectorBlockField>
							<div className="px-2">Direction</div>
							<EditorInspectorVectorField grayLabel object={emitter} property="direction1" label="Min" onChange={onChange} />
							<EditorInspectorVectorField grayLabel object={emitter} property="direction2" label="Max" onChange={onChange} />
						</EditorInspectorBlockField>
					)}
				</>
			)}

			{(emitterType === "CylinderParticleEmitter" || emitterType === "CylinderDirectedParticleEmitter") && (
				<>
					<EditorInspectorNumberField object={emitter} property="radius" label="Radius" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="height" label="Height" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" min={0} max={1} step={0.01} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="directionRandomizer" label="Direction Randomizer" min={0} max={1} step={0.01} onChange={onChange} />

					{emitterType === "CylinderDirectedParticleEmitter" && (
						<EditorInspectorBlockField>
							<div className="px-2">Direction</div>
							<EditorInspectorVectorField grayLabel object={emitter} property="direction1" label="Min" onChange={onChange} />
							<EditorInspectorVectorField grayLabel object={emitter} property="direction2" label="Max" onChange={onChange} />
						</EditorInspectorBlockField>
					)}
				</>
			)}

			{(emitterType === "SphereParticleEmitter" || emitterType === "SphereDirectedParticleEmitter") && (
				<>
					<EditorInspectorNumberField object={emitter} property="radius" label="Radius" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" min={0} max={1} step={0.01} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="directionRandomizer" label="Direction Randomizer" min={0} max={1} step={0.01} onChange={onChange} />

					{emitterType === "SphereDirectedParticleEmitter" && (
						<EditorInspectorBlockField>
							<div className="px-2">Direction</div>
							<EditorInspectorVectorField grayLabel object={emitter} property="direction1" label="Min" onChange={onChange} />
							<EditorInspectorVectorField grayLabel object={emitter} property="direction2" label="Max" onChange={onChange} />
						</EditorInspectorBlockField>
					)}
				</>
			)}

			{emitterType === "PointParticleEmitter" && (
				<EditorInspectorBlockField>
					<div className="px-2">Direction</div>
					<EditorInspectorVectorField grayLabel object={emitter} property="direction1" label="Min" onChange={onChange} />
					<EditorInspectorVectorField grayLabel object={emitter} property="direction2" label="Max" onChange={onChange} />
				</EditorInspectorBlockField>
			)}

			{emitterType === "HemisphericParticleEmitter" && (
				<>
					<EditorInspectorNumberField object={emitter} property="radius" label="Radius" min={0} step={0.1} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="radiusRange" label="Radius Range" min={0} max={1} step={0.01} onChange={onChange} />
					<EditorInspectorNumberField object={emitter} property="directionRandomizer" label="Direction Randomizer" min={0} max={1} step={0.01} onChange={onChange} />
				</>
			)}
		</>
	);
}

/**
 * Renders emitter shape properties
 */
function renderEmitterShape(nodeData: EffectNode, onChange: () => void): ReactNode {
	if (nodeData.type !== "particle" || !nodeData.system) {
		return null;
	}

	const system = nodeData.system;

	if (system instanceof EffectSolidParticleSystem) {
		return renderSolidParticleSystemEmitter(system, onChange);
	}

	if (system instanceof EffectParticleSystem) {
		return renderParticleSystemEmitter(system, onChange);
	}

	return null;
}

/**
 * Renders emission bursts
 */
function renderBursts(system: EffectParticleSystem | EffectSolidParticleSystem, onChange: () => void): ReactNode {
	const bursts: (EmissionBurst & { cycle?: number; interval?: number; probability?: number })[] = Array.isArray((system as any).emissionBursts)
		? (system as any).emissionBursts
		: [];

	const addBurst = () => {
		bursts.push({
			time: 0,
			count: 1,
			cycle: 1,
			interval: 0,
			probability: 1,
		});
		(system as any).emissionBursts = bursts;
		onChange();
	};

	const removeBurst = (index: number) => {
		bursts.splice(index, 1);
		(system as any).emissionBursts = bursts;
		onChange();
	};

	return (
		<EditorInspectorSectionField title="Bursts">
			<div className="flex flex-col gap-3 px-2">
				{bursts.map((burst, idx) => (
					<div key={idx} className="border border-border rounded p-2 flex flex-col gap-2">
						<div className="flex justify-between items-center text-sm font-medium">
							<div>Burst #{idx + 1}</div>
							<button className="text-red-500" onClick={() => removeBurst(idx)}>
								Remove
							</button>
						</div>
						<div className="flex flex-col gap-2">
							<EffectValueEditor
								label="Time"
								value={burst.time as Value}
								onChange={(val) => {
									burst.time = val as Value;
									onChange();
								}}
							/>
							<EffectValueEditor
								label="Count"
								value={burst.count as Value}
								onChange={(val) => {
									burst.count = val as Value;
									onChange();
								}}
							/>
							<EditorInspectorNumberField object={burst as any} property="cycle" label="Cycle" min={0} step={1} onChange={onChange} />
							<EditorInspectorNumberField object={burst as any} property="interval" label="Interval" min={0} step={0.01} onChange={onChange} />
							<EditorInspectorNumberField object={burst as any} property="probability" label="Probability" min={0} max={1} step={0.01} onChange={onChange} />
						</div>
					</div>
				))}
				<button className="px-2 py-1 border border-border rounded" onClick={addBurst}>
					Add Burst
				</button>
			</div>
		</EditorInspectorSectionField>
	);
}

/**
 * Renders emission parameters (looping, duration, emit over time/distance, bursts)
 */
function renderEmissionParameters(nodeData: EffectNode, onChange: () => void): ReactNode {
	if (nodeData.type !== "particle" || !nodeData.system) {
		return null;
	}

	const system = nodeData.system;

	return (
		<>
			<EditorInspectorSwitchField object={system as any} property="isLooping" label="Looping" onChange={onChange} />
			<EditorInspectorNumberField
				object={system as any}
				property={"targetStopDuration" in system ? "targetStopDuration" : "duration"}
				label="Duration"
				min={0}
				step={0.1}
				onChange={onChange}
			/>
			<EditorInspectorSwitchField object={system as any} property="prewarm" label="Prewarm" onChange={onChange} />
			<EditorInspectorSwitchField object={system as any} property="onlyUsedByOther" label="Only Used By Other System" onChange={onChange} />

			<EditorInspectorSectionField title="Emit Over Time">
				<EffectValueEditor
					label="Emit Over Time"
					value={(system as any).emissionOverTime as Value | undefined}
					onChange={(val) => {
						(system as any).emissionOverTime = val;
						onChange();
					}}
				/>
			</EditorInspectorSectionField>

			<EditorInspectorSectionField title="Emit Over Distance">
				<EffectValueEditor
					label="Emit Over Distance"
					value={(system as any).emissionOverDistance as Value | undefined}
					onChange={(val) => {
						(system as any).emissionOverDistance = val;
						onChange();
					}}
				/>
			</EditorInspectorSectionField>

			{system instanceof EffectParticleSystem && (
				<EditorInspectorBlockField>
					<div className="px-2">Emit Power</div>
					<div className="flex items-center">
						<EditorInspectorNumberField grayLabel object={system} property="minEmitPower" label="Min" min={0} onChange={onChange} />
						<EditorInspectorNumberField grayLabel object={system} property="maxEmitPower" label="Max" min={0} onChange={onChange} />
					</div>
				</EditorInspectorBlockField>
			)}

			{renderBursts(system as any, onChange)}
		</>
	);
}

/**
 * Combined emission properties component
 * Includes both emitter shape and emission parameters
 */
export function EffectEditorEmissionProperties(props: IEffectEditorEmissionPropertiesProps): ReactNode {
	const { nodeData, onChange } = props;

	if (nodeData.type !== "particle" || !nodeData.system) {
		return null;
	}

	return (
		<>
			<EditorInspectorSectionField title="Emitter Shape">{renderEmitterShape(nodeData, onChange)}</EditorInspectorSectionField>

			<EditorInspectorSectionField title="Emission Parameters">{renderEmissionParameters(nodeData, onChange)}</EditorInspectorSectionField>
		</>
	);
}
