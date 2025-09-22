import { AnimationGroup } from "babylonjs";
import { ICinematicAnimationGroup, ICinematicTrack } from "babylonjs-editor-tools";

import { CinematicEditor } from "../editor";

import { EditorInspectorNumberField } from "../../inspector/fields/number";
import { EditorInspectorSectionField } from "../../inspector/fields/section";

export interface ICinematicEditorAnimationGroupKeyInspectorProps {
	cinematicEditor: CinematicEditor;
	cinematicKey: ICinematicAnimationGroup;
	track: ICinematicTrack;
}

export function CinematicEditorAnimationGroupKeyInspector(props: ICinematicEditorAnimationGroupKeyInspectorProps) {
	const animationGroup = props.track.animationGroup as AnimationGroup;
	if (!animationGroup) {
		return null;
	}

	return (
		<EditorInspectorSectionField title="Animation Group">
			<EditorInspectorNumberField
				object={props.cinematicKey}
				property="frame"
				label="Frame"
				min={0}
				step={1}
				onChange={() => {
					props.cinematicEditor.timelines.sortAnimationsKeys();
					props.cinematicEditor.timelines.updateTracksAtCurrentTime();
				}}
			/>

			<EditorInspectorNumberField
				object={props.cinematicKey}
				property="speed"
				label="Speed"
				step={0.01}
				min={0.1}
				onChange={() => {
					props.cinematicEditor.timelines.sortAnimationsKeys();
					props.cinematicEditor.timelines.updateTracksAtCurrentTime();
				}}
			/>

			<EditorInspectorNumberField
				object={props.cinematicKey}
				property="startFrame"
				label="Start Frame"
				step={1}
				min={animationGroup.from}
				max={props.cinematicKey.endFrame}
				onChange={() => {
					props.cinematicEditor.inspector.forceUpdate();
					props.cinematicEditor.timelines.updateTracksAtCurrentTime();
				}}
			/>

			<EditorInspectorNumberField
				object={props.cinematicKey}
				property="endFrame"
				label="End Frame"
				step={1}
				min={props.cinematicKey.startFrame}
				max={animationGroup.to}
				onChange={() => {
					props.cinematicEditor.inspector.forceUpdate();
					props.cinematicEditor.timelines.updateTracksAtCurrentTime();
				}}
			/>
		</EditorInspectorSectionField>
	);
}
