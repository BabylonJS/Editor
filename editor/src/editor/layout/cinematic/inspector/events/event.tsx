import { ICinematicKeyEvent } from "babylonjs-editor-tools";

import { EditorInspectorStringField } from "../../../inspector/fields/string";

export interface ICinematicEditorEventKeyInspectorProps {
	cinematicKey: ICinematicKeyEvent;
}

export function CinematicEditorEventKeyInspector(props: ICinematicEditorEventKeyInspectorProps) {
	return (
		<>
			<EditorInspectorStringField object={props.cinematicKey.data} property="eventName" label="Event Name" />
		</>
	);
}
