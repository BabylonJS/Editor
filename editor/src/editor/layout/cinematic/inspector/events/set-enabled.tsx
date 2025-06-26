import { Scene } from "babylonjs";
import { ICinematicKeyEvent } from "babylonjs-editor-tools";

import { EditorInspectorNodeField } from "../../../inspector/fields/node";
import { EditorInspectorSwitchField } from "../../../inspector/fields/switch";

export interface ICinematicEditorSetEnabledKeyInspectorProps {
    scene: Scene;
    cinematicKey: ICinematicKeyEvent;
}

export function CinematicEditorSetEnabledKeyInspector(props: ICinematicEditorSetEnabledKeyInspectorProps) {
	return (
		<>
			<EditorInspectorSwitchField object={props.cinematicKey.data} property="value" label="Enabled" />
			<EditorInspectorNodeField object={props.cinematicKey.data} property="node" scene={props.scene} label="Node" />
		</>
	);
}
