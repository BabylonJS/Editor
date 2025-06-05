import { ICinematicKeyCut, ICinematicTrack } from "babylonjs-editor-tools";

import { registerSimpleUndoRedo } from "../../../../tools/undoredo";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";

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

    return (
        <EditorInspectorSectionField title="Key Cut">
            <EditorInspectorNumberField object={props.cinematicKey.key1} property="frame" label="Frame" min={0} step={1} onChange={(v) => {
                props.cinematicKey.key2.frame = v;

                props.cinematicEditor.timelines.sortAnimationsKeys();
                props.cinematicEditor.timelines.updateTracksAtCurrentTime();
            }} />

            {getPropertyInspector({
                animationType,
                object: props.cinematicKey.key1,
                property: "value",
                label: "End",
                step: props.track.propertyPath === "depthOfField.focusDistance"
                    ? (props.cinematicEditor.editor.layout.preview.scene.activeCamera?.maxZ ?? 0) / 1000
                    : 0.01,
                onChange: () => props.cinematicEditor.timelines.updateTracksAtCurrentTime(),
            })}

            {getPropertyInspector({
                animationType,
                object: props.cinematicKey.key2,
                property: "value",
                label: "New",
                step: props.track.propertyPath === "depthOfField.focusDistance"
                    ? (props.cinematicEditor.editor.layout.preview.scene.activeCamera?.maxZ ?? 0) / 1000
                    : 0.01,
                onChange: () => props.cinematicEditor.timelines.updateTracksAtCurrentTime(),
            })}

            <EditorInspectorSwitchField label="In Tangents" object={{ checked: (props.cinematicKey.key1.inTangent ?? null) !== null }} property="checked" noUndoRedo onChange={(v) => {
                registerSimpleUndoRedo({
                    object: props.cinematicKey.key1,
                    property: "inTangent",
                    oldValue: props.cinematicKey.key1.inTangent,
                    newValue: v ? getTangentDefaultValue(props.cinematicKey.key1) : undefined,
                    executeRedo: true,
                });

                props.cinematicEditor.inspector.forceUpdate();
            }} />

            {(props.cinematicKey.key1.inTangent ?? null) !== null &&
                getTangentInspector(props.cinematicKey.key1, "inTangent", props.cinematicEditor)
            }

            <EditorInspectorSwitchField label="Out Tangents" object={{ checked: (props.cinematicKey.key2.outTangent ?? null) !== null }} property="checked" noUndoRedo onChange={(v) => {
                registerSimpleUndoRedo({
                    object: props.cinematicKey.key2,
                    property: "outTangent",
                    oldValue: props.cinematicKey?.key2.outTangent,
                    newValue: v ? getTangentDefaultValue(props.cinematicKey.key2) : undefined,
                    executeRedo: true,
                });

                props.cinematicEditor.inspector.forceUpdate();
            }} />

            {(props.cinematicKey.key2.outTangent ?? null) !== null &&
                getTangentInspector(props.cinematicKey.key2, "outTangent", props.cinematicEditor)
            }
        </EditorInspectorSectionField>
    );
}
