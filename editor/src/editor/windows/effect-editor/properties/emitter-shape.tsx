import { Component, ReactNode } from "react";
import { Vector3 } from "babylonjs";

import { EditorInspectorVectorField } from "../../../layout/inspector/fields/vector";
import { EditorInspectorNumberField } from "../../../layout/inspector/fields/number";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";
import { EditorInspectorListField } from "../../../layout/inspector/fields/list";
import { EditorInspectorBlockField } from "../../../layout/inspector/fields/block";

import { type EffectNode, EffectSolidParticleSystem, EffectParticleSystem, SolidSphereParticleEmitter, SolidConeParticleEmitter } from "babylonjs-editor-tools";

export interface IEffectEditorEmitterShapePropertiesProps {
	nodeData: EffectNode;
	onChange: () => void;
}

export class EffectEditorEmitterShapeProperties extends Component<IEffectEditorEmitterShapePropertiesProps> {
	public render(): ReactNode {
		const { nodeData, onChange } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;

		// For VEffectSolidParticleSystem
		if (system instanceof EffectSolidParticleSystem) {
			return this._renderSolidParticleSystemEmitter(system, onChange);
		}

		// For VEffectParticleSystem
		if (system instanceof EffectParticleSystem) {
			return this._renderParticleSystemEmitter(system, onChange);
		}

		return null;
	}

	private _renderSolidParticleSystemEmitter(system: EffectSolidParticleSystem, onChange: () => void): ReactNode {
		const emitter = system.particleEmitterType;
		const emitterType = emitter ? emitter.constructor.name : "Point";

		// Map emitter class names to display names
		const emitterTypeMap: Record<string, string> = {
			SolidPointParticleEmitter: "Point",
			SolidSphereParticleEmitter: "Sphere",
			SolidConeParticleEmitter: "Cone",
		};

		const currentType = emitterTypeMap[emitterType] || "Point";

		// Available emitter types for SolidParticleSystem
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
						// Save current properties
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

	private _renderParticleSystemEmitter(system: EffectParticleSystem, onChange: () => void): ReactNode {
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

		// Available emitter types for ParticleSystem
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
						// Save current properties that might be common
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
}
