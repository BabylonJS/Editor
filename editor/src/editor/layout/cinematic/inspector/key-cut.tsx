import { IAnimationKey } from "babylonjs";
import { ICinematicKeyCut, ICinematicTrack, getAnimationTypeForObject } from "babylonjs-editor-tools";

import { Button } from "../../../../ui/shadcn/ui/button";

import { getInspectorPropertyValue } from "../../../../tools/property";
import { registerSimpleUndoRedo, registerUndoRedo } from "../../../../tools/undoredo";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

import { CinematicEditor } from "../editor";

import { EditorInspectorSwitchField } from "../../inspector/fields/switch";
import { EditorInspectorNumberField } from "../../inspector/fields/number";
import { EditorInspectorSectionField } from "../../inspector/fields/section";

import { getPropertyInspector, getTangentDefaultValue, getTangentInspector } from "./tools";

export interface ICinematicEditorKeyCutInspectorProps {
	cinematicEditor: CinematicEditor;
	cinematicKey: ICinematicKeyCut;
	track: ICinematicTrack;
}

export function CinematicEditorKeyCutInspector(props: ICinematicEditorKeyCutInspectorProps) {
	const animationType = getAnimationTypeForObject(props.cinematicKey.key1.value);

	function copyCurrentValue(key: IAnimationKey) {
		const node = props.track.defaultRenderingPipeline ? getDefaultRenderingPipeline() : props.track.node;

		if (!node || !props.track?.propertyPath) {
			return;
		}

		const oldValue = key.value.clone?.() ?? key.value;

		let newValue = getInspectorPropertyValue(node, props.track.propertyPath);
		newValue = newValue.clone?.() ?? newValue;

		registerUndoRedo({
			executeRedo: false,
			action: () => {
				props.cinematicEditor.updateTracksAtCurrentTime();
			},
			undo: () => {
				key.value = oldValue;
			},
			redo: () => {
				key.value = newValue;
			},
		});

		key.value = newValue;
		props.cinematicEditor.inspector.forceUpdate();
	}

	return (
		<EditorInspectorSectionField title="Key Cut">
			<EditorInspectorNumberField
				object={props.cinematicKey.key1}
				property="frame"
				label="Frame"
				min={0}
				step={1}
				onChange={(v) => {
					props.cinematicKey.key2.frame = v;

					props.cinematicEditor.timelines.sortAnimationsKeys();
					props.cinematicEditor.curves.forceUpdate();
					props.cinematicEditor.updateTracksAtCurrentTime();
				}}
			/>

			{getPropertyInspector({
				animationType,
				object: props.cinematicKey.key1,
				property: "value",
				label: "End",
				step: props.track.propertyPath === "depthOfField.focusDistance" ? (props.cinematicEditor.editor.layout.preview.scene.activeCamera?.maxZ ?? 0) / 1000 : 0.01,
				onChange: () => {
					props.cinematicEditor.curves.forceUpdate();
					props.cinematicEditor.updateTracksAtCurrentTime();
				},
			})}

			<Button variant="secondary" onClick={() => copyCurrentValue(props.cinematicKey.key1)}>
				Set current value
			</Button>

			{getPropertyInspector({
				animationType,
				object: props.cinematicKey.key2,
				property: "value",
				label: "New",
				step: props.track.propertyPath === "depthOfField.focusDistance" ? (props.cinematicEditor.editor.layout.preview.scene.activeCamera?.maxZ ?? 0) / 1000 : 0.01,
				onChange: () => {
					props.cinematicEditor.curves.forceUpdate();
					props.cinematicEditor.updateTracksAtCurrentTime();
				},
			})}

			<Button variant="secondary" onClick={() => copyCurrentValue(props.cinematicKey.key2)}>
				Set current value
			</Button>

			<EditorInspectorSwitchField
				label="In Tangents"
				object={{ checked: (props.cinematicKey.key1.inTangent ?? null) !== null }}
				property="checked"
				noUndoRedo
				onChange={(v) => {
					registerSimpleUndoRedo({
						object: props.cinematicKey.key1,
						property: "inTangent",
						oldValue: props.cinematicKey.key1.inTangent,
						newValue: v ? getTangentDefaultValue(props.cinematicKey.key1) : undefined,
						executeRedo: true,
					});

					props.cinematicEditor.forceUpdate();
				}}
			/>

			{(props.cinematicKey.key1.inTangent ?? null) !== null && getTangentInspector(props.cinematicKey.key1, "inTangent", props.cinematicEditor)}

			<EditorInspectorSwitchField
				label="Out Tangents"
				object={{ checked: (props.cinematicKey.key2.outTangent ?? null) !== null }}
				property="checked"
				noUndoRedo
				onChange={(v) => {
					registerSimpleUndoRedo({
						object: props.cinematicKey.key2,
						property: "outTangent",
						oldValue: props.cinematicKey?.key2.outTangent,
						newValue: v ? getTangentDefaultValue(props.cinematicKey.key2) : undefined,
						executeRedo: true,
					});

					props.cinematicEditor.forceUpdate();
				}}
			/>

			{(props.cinematicKey.key2.outTangent ?? null) !== null && getTangentInspector(props.cinematicKey.key2, "outTangent", props.cinematicEditor)}
		</EditorInspectorSectionField>
	);
}
