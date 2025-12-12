import { Component, ReactNode } from "react";

import { EditorInspectorVectorField } from "../../../layout/inspector/fields/vector";

import type { VFXEffectNode } from "../VFX";
import { VFXParticleSystem, VFXSolidParticleSystem } from "../VFX";

export interface IFXEditorEmitterShapePropertiesProps {
	nodeData: VFXEffectNode;
	onChange: () => void;
}

export class FXEditorEmitterShapeProperties extends Component<IFXEditorEmitterShapePropertiesProps> {
	public render(): ReactNode {
		const { nodeData } = this.props;

		if (nodeData.type !== "particle" || !nodeData.system) {
			return null;
		}

		const system = nodeData.system;

		// For VFXSolidParticleSystem, emitter shape is a property
		if (system instanceof VFXSolidParticleSystem) {
			return (
				<>
					<div className="px-2 text-sm text-muted-foreground">Emitter shape: {system.shape?.type || "Default"}</div>
					{/* TODO: Add shape-specific property editors based on system.shape.type */}
				</>
			);
		}

		// For VFXParticleSystem, emitter is a separate object
		if (system instanceof VFXParticleSystem) {
			const emitter = (system as any).emitter;

			if (!emitter) {
				return <div className="px-2 text-muted-foreground">No emitter found. Emitter shape properties are set during system creation.</div>;
			}

			// Show basic emitter properties
			return (
				<>
					<div className="px-2 text-sm text-muted-foreground">Emitter: {emitter.name || emitter.constructor.name}</div>
					{emitter.position && <EditorInspectorVectorField object={emitter} property="position" label="Position" onChange={this.props.onChange} />}
					{emitter.rotationQuaternion && <EditorInspectorVectorField object={emitter} property="rotation" label="Rotation" asDegrees onChange={this.props.onChange} />}
					{emitter.scaling && <EditorInspectorVectorField object={emitter} property="scaling" label="Scale" onChange={this.props.onChange} />}
					{/* TODO: Add shape-specific properties based on emitter type (BoxEmitter, ConeEmitter, etc.) */}
				</>
			);
		}

		return null;
	}
}
