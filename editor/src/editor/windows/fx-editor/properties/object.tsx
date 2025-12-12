import { ReactNode } from "react";

import { EditorInspectorStringField } from "../../../layout/inspector/fields/string";
import { EditorInspectorVectorField } from "../../../layout/inspector/fields/vector";
import { EditorInspectorSwitchField } from "../../../layout/inspector/fields/switch";

import { IFXParticleData } from "./types";

export interface IFXEditorObjectPropertiesProps {
	particleData: IFXParticleData;
	onChange?: () => void;
}

export function FXEditorObjectProperties(props: IFXEditorObjectPropertiesProps): ReactNode {
	const { particleData, onChange } = props;

	return (
		<>
			<EditorInspectorStringField object={particleData} property="name" label="Name" onChange={onChange} />
			<EditorInspectorSwitchField object={particleData} property="visibility" label="Visibility" />
			<EditorInspectorVectorField object={particleData} property="position" label="Position" />
			<EditorInspectorVectorField object={particleData} property="rotation" label="Rotation" asDegrees />
			<EditorInspectorVectorField object={particleData} property="scale" label="Scale" />
		</>
	);
}
