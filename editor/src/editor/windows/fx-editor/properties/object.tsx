import { ReactNode } from "react";
import { Quaternion } from "babylonjs";

import { EditorInspectorStringField } from "../../../layout/inspector/fields/string";
import { EditorInspectorVectorField } from "../../../layout/inspector/fields/vector";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";

import type { VFXEffectNode } from "../VFX";
import { VFXParticleSystem, VFXSolidParticleSystem } from "../VFX";

export interface IFXEditorObjectPropertiesProps {
	nodeData: VFXEffectNode;
	onChange?: () => void;
}

/**
 * Creates a rotation inspector that handles rotationQuaternion properly
 */
function getRotationInspector(object: any, onChange?: () => void): ReactNode {
	if (!object) {
		return null;
	}

	// Check if rotationQuaternion exists and is valid
	if (object.rotationQuaternion && object.rotationQuaternion instanceof Quaternion) {
		const valueRef = object.rotationQuaternion.toEulerAngles();

		const proxy = new Proxy(valueRef, {
			get(target, prop) {
				return target[prop as keyof typeof target];
			},
			set(obj, prop, value) {
				(obj as any)[prop] = value;
				if (object.rotationQuaternion) {
					object.rotationQuaternion.copyFrom((obj as any).toQuaternion());
				}
				onChange?.();
				return true;
			},
		});

		const o = { proxy };

		return <EditorInspectorVectorField object={o} property="proxy" label="Rotation" asDegrees onChange={onChange} />;
	}

	// Fallback to rotation if it exists
	if (object.rotation && typeof object.rotation === "object" && object.rotation.x !== undefined) {
		return <EditorInspectorVectorField object={object} property="rotation" label="Rotation" asDegrees onChange={onChange} />;
	}

	return null;
}

export function FXEditorObjectProperties(props: IFXEditorObjectPropertiesProps): ReactNode {
	const { nodeData, onChange } = props;

	// For groups, use transformNode directly
	if (nodeData.type === "group" && nodeData.group) {
		const group = nodeData.group;

		return (
			<>
				<EditorInspectorStringField object={nodeData} property="name" label="Name" onChange={onChange} />
				<EditorInspectorSwitchField object={group} property="isVisible" label="Visibility" />
				{group.position && <EditorInspectorVectorField object={group} property="position" label="Position" onChange={onChange} />}
				{getRotationInspector(group, onChange)}
				{group.scaling && <EditorInspectorVectorField object={group} property="scaling" label="Scale" onChange={onChange} />}
			</>
		);
	}

	// For particles, use system.emitter for VFXParticleSystem or system.mesh for VFXSolidParticleSystem
	if (nodeData.type === "particle" && nodeData.system) {
		const system = nodeData.system;

		// For VFXSolidParticleSystem, use mesh (common mesh for all particles)
		if (system instanceof VFXSolidParticleSystem) {
			const mesh = system.mesh;
			if (!mesh) {
				return (
					<>
						<EditorInspectorStringField object={nodeData} property="name" label="Name" onChange={onChange} />
						<div className="px-2 text-muted-foreground">Mesh not available</div>
					</>
				);
			}

			return (
				<>
					<EditorInspectorStringField object={nodeData} property="name" label="Name" onChange={onChange} />
					<EditorInspectorSwitchField object={mesh} property="isVisible" label="Visibility" onChange={onChange} />
					{mesh.position && <EditorInspectorVectorField object={mesh} property="position" label="Position" onChange={onChange} />}
					{getRotationInspector(mesh, onChange)}
					{mesh.scaling && <EditorInspectorVectorField object={mesh} property="scaling" label="Scale" onChange={onChange} />}
				</>
			);
		}

		// For VFXParticleSystem, use emitter
		if (system instanceof VFXParticleSystem) {
			const emitter = (system as any).emitter;
			if (!emitter) {
				return (
					<>
						<EditorInspectorStringField object={nodeData} property="name" label="Name" onChange={onChange} />
						<div className="px-2 text-muted-foreground">Emitter not available</div>
					</>
				);
			}

			return (
				<>
					<EditorInspectorStringField object={nodeData} property="name" label="Name" onChange={onChange} />
					{emitter.position && <EditorInspectorVectorField object={emitter} property="position" label="Position" onChange={onChange} />}
					{getRotationInspector(emitter, onChange)}
					{emitter.scaling && <EditorInspectorVectorField object={emitter} property="scaling" label="Scale" onChange={onChange} />}
				</>
			);
		}
	}

	return null;
}
