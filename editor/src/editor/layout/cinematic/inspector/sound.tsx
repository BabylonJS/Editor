import { ICinematicSound, ICinematicTrack } from "babylonjs-editor-tools";

import { CinematicEditor } from "../editor";

import { SoundNode } from "../../../nodes/sound";

import { EditorInspectorNumberField } from "../../inspector/fields/number";
import { EditorInspectorSectionField } from "../../inspector/fields/section";

export interface ICinematicEditorSoundKeyInspectorProps {
	cinematicEditor: CinematicEditor;
	cinematicKey: ICinematicSound;
	track: ICinematicTrack;
}

export function CinematicEditorSoundKeyInspector(props: ICinematicEditorSoundKeyInspectorProps) {
	const node = props.track.sound as SoundNode | null;

	if (!node || !node.sound?.buffer) {
		return null;
	}

	const endFrame = node.sound.duration * props.cinematicEditor.cinematic.framesPerSecond;

	return (
		<EditorInspectorSectionField title="Sound">
			<EditorInspectorNumberField
				object={props.cinematicKey}
				property="frame"
				label="Frame"
				min={0}
				step={1}
				onChange={() => {
					props.cinematicEditor.timelines.sortAnimationsKeys();
					props.cinematicEditor.updateTracksAtCurrentTime();
				}}
			/>

			<EditorInspectorNumberField
				object={props.cinematicKey}
				property="startFrame"
				label="Start Frame"
				step={1}
				min={0}
				max={props.cinematicKey.endFrame}
				onChange={() => {
					props.cinematicEditor.inspector.forceUpdate();
					props.cinematicEditor.updateTracksAtCurrentTime();
				}}
			/>

			<EditorInspectorNumberField
				object={props.cinematicKey}
				property="endFrame"
				label="End Frame"
				step={1}
				min={props.cinematicKey.startFrame}
				max={endFrame}
				onChange={() => {
					props.cinematicEditor.inspector.forceUpdate();
					props.cinematicEditor.updateTracksAtCurrentTime();
				}}
			/>
		</EditorInspectorSectionField>
	);
}
