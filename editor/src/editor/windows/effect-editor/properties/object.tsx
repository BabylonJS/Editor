import { ReactNode } from "react";

import { EditorInspectorStringField } from "../../../layout/inspector/fields/string";
import { EditorInspectorVectorField } from "../../../layout/inspector/fields/vector";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";

import { type IEffectNode, isSystem } from "babylonjs-editor-tools";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";

export interface IEffectEditorObjectPropertiesProps {
	nodeData: IEffectNode;
	onChange?: () => void;
}

export function EffectEditorObjectProperties(props: IEffectEditorObjectPropertiesProps): ReactNode {
	const { nodeData, onChange } = props;

	if (!nodeData.data) {
		return (
			<>
				<EditorInspectorStringField object={nodeData} property="name" label="Name" onChange={onChange} />
				<div className="px-2 text-muted-foreground">Data not available</div>
			</>
		);
	}

	const object = isSystem(nodeData.data) ? nodeData.data.emitter : nodeData.data;

	const GetRotationInspector = (object: TransformNode | AbstractMesh, onFinishChange?: () => void): ReactNode => {
		if (object.rotationQuaternion) {
			const valueRef = object.rotationQuaternion.toEulerAngles();

			const proxy = new Proxy(valueRef, {
				get(target, prop) {
					return target[prop];
				},
				set(obj, prop, value) {
					obj[prop] = value;
					object.rotationQuaternion?.copyFrom(obj.toQuaternion());

					return true;
				},
			});

			const o = { proxy };

			return (
				<EditorInspectorVectorField
					label={<div className="w-14">Rotation</div>}
					object={o}
					property="proxy"
					asDegrees
					step={0.1}
					onFinishChange={() => onFinishChange?.()}
				/>
			);
		}

		return (
			<EditorInspectorVectorField
				label={<div className="w-14">Rotation</div>}
				object={object}
				property="rotation"
				asDegrees
				step={0.1}
				onFinishChange={() => onFinishChange?.()}
			/>
		);
	};

	return (
		<>
			<EditorInspectorStringField object={nodeData} property="name" label="Name" onChange={onChange} />
			<EditorInspectorSwitchField object={object} property="isVisible" label="Visibility" />
			<EditorInspectorVectorField object={object} property="position" label="Position" onChange={onChange} />
			{GetRotationInspector(object as TransformNode, onChange)}
			<EditorInspectorVectorField object={object} property="scaling" label="Scale" onChange={onChange} />
		</>
	);
}
