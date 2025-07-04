import { Scene } from "babylonjs";
import { ICinematicKeyEvent } from "babylonjs-editor-tools";

import { EditorInspectorSwitchField } from "../../../inspector/fields/switch";
import { EditorInspectorSceneEntityField } from "../../../inspector/fields/entity";

export interface ICinematicEditorSetEnabledKeyInspectorProps {
	scene: Scene;
	cinematicKey: ICinematicKeyEvent;
}

export function CinematicEditorSetEnabledKeyInspector(props: ICinematicEditorSetEnabledKeyInspectorProps) {
	return (
		<>
			<EditorInspectorSwitchField object={props.cinematicKey.data} property="value" label="Enabled" />
			<EditorInspectorSceneEntityField object={props.cinematicKey.data} property="node" scene={props.scene} label="Node" />
		</>
	);
}
