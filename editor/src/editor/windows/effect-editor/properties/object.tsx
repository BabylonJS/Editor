import { ReactNode } from "react";

import { EditorInspectorStringField } from "../../../layout/inspector/fields/string";
import { EditorInspectorVectorField } from "../../../layout/inspector/fields/vector";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";

import { type IEffectNode, EffectSolidParticleSystem, EffectParticleSystem, isSystem } from "babylonjs-editor-tools";

export interface IEffectEditorObjectPropertiesProps {
	nodeData: IEffectNode;
	onChange?: () => void;
}

export function EffectEditorObjectProperties(props: IEffectEditorObjectPropertiesProps): ReactNode {
	const { nodeData, onChange } = props;

	if(!nodeData.data) {
		return (
			<>
				<EditorInspectorStringField object={nodeData} property="name" label="Name" onChange={onChange} />
				<div className="px-2 text-muted-foreground">Data not available</div>
			</>
		);
	}

	const object = isSystem(nodeData.data) ? nodeData.data.emitter : nodeData.data;

	return (
		<>
			<EditorInspectorStringField object={nodeData} property="name" label="Name" onChange={onChange} />
			<EditorInspectorSwitchField object={object} property="isVisible" label="Visibility" />
			<EditorInspectorVectorField object={object} property="position" label="Position" onChange={onChange} />
			<EditorInspectorVectorField object={object} property="rotation" label="Rotation" asDegrees onChange={onChange} />
			<EditorInspectorVectorField object={object} property="scaling" label="Scale" onChange={onChange} />
		</>
	);
}
