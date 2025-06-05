import { IAnimationKey } from "babylonjs";
import { ICinematicTrack } from "babylonjs-editor-tools";

import { Button } from "../../../../ui/shadcn/ui/button";

import { getDefaultRenderingPipeline } from "../../../rendering/default-pipeline";

import { getInspectorPropertyValue } from "../../../../tools/property";
import { getAnimationTypeForObject } from "../../../../tools/animation/tools";
import { registerSimpleUndoRedo, registerUndoRedo } from "../../../../tools/undoredo";

import { CinematicEditor } from "../editor";

import { EditorInspectorNumberField } from "../../inspector/fields/number";
import { EditorInspectorSwitchField } from "../../inspector/fields/switch";
import { EditorInspectorSectionField } from "../../inspector/fields/section";

import { getPropertyInspector, getTangentDefaultValue, getTangentInspector } from "./tools";

export interface ICinematicEditorKeyInspectorProps {
    cinematicEditor: CinematicEditor;
    cinematicKey: IAnimationKey;
    track: ICinematicTrack;
}

export function CinematicEditorKeyInspector(props: ICinematicEditorKeyInspectorProps) {
    const animationType = getAnimationTypeForObject(props.cinematicKey.value);

    function copyCurrentValue() {
        const node = props.track.defaultRenderingPipeline
            ? getDefaultRenderingPipeline()
            : props.track.node;

        if (!node || !props.track?.propertyPath) {
            return;
        }

        const oldValue = props.cinematicKey.value.clone?.() ?? props.cinematicKey.value;

        let newValue = getInspectorPropertyValue(node, this.state.track.propertyPath);
        newValue = newValue.clone?.() ?? newValue;

        registerUndoRedo({
            executeRedo: false,
            action: () => {
                this.props.cinematicEditor.timelines.updateTracksAtCurrentTime();
            },
            undo: () => {
                props.cinematicKey.value = oldValue;
            },
            redo: () => {
                props.cinematicKey.value = newValue;
            },
        });

        props.cinematicKey.value = newValue;
        props.cinematicEditor.inspector.forceUpdate();
    }

    return (
        <EditorInspectorSectionField title="Key">
            <EditorInspectorNumberField object={props.cinematicKey} property="frame" label="Frame" min={0} step={1} onChange={() => {
                props.cinematicEditor.timelines.sortAnimationsKeys();
                props.cinematicEditor.timelines.updateTracksAtCurrentTime();
            }} />

            {getPropertyInspector({
                animationType,
                object: props.cinematicKey,
                property: "value",
                label: "Value",
                step: props.track.propertyPath === "depthOfField.focusDistance"
                    ? (props.cinematicEditor.editor.layout.preview.scene.activeCamera?.maxZ ?? 0) / 1000
                    : 0.01,
                onChange: () => props.cinematicEditor.timelines.updateTracksAtCurrentTime(),
            })}

            <Button variant="secondary" onClick={() => copyCurrentValue()}>
                Set current value
            </Button>

            <EditorInspectorSwitchField label="In Tangents" object={{ checked: (props.cinematicKey.inTangent ?? null) !== null }} property="checked" noUndoRedo onChange={(v) => {
                registerSimpleUndoRedo({
                    object: props.cinematicKey,
                    property: "inTangent",
                    oldValue: props.cinematicKey?.inTangent,
                    newValue: v ? getTangentDefaultValue(props.cinematicKey!) : undefined,
                    executeRedo: true,
                });

                props.cinematicEditor.inspector.forceUpdate();
            }} />

            {(props.cinematicKey.inTangent ?? null) !== null &&
                getTangentInspector(props.cinematicKey, "inTangent", props.cinematicEditor)
            }

            <EditorInspectorSwitchField label="Out Tangents" object={{ checked: (props.cinematicKey.outTangent ?? null) !== null }} property="checked" noUndoRedo onChange={(v) => {
                registerSimpleUndoRedo({
                    object: props.cinematicKey,
                    property: "outTangent",
                    oldValue: props.cinematicKey?.outTangent,
                    newValue: v ? getTangentDefaultValue(props.cinematicKey!) : undefined,
                    executeRedo: true,
                });

                props.cinematicEditor.inspector.forceUpdate();
            }} />

            {(props.cinematicKey.outTangent ?? null) !== null &&
                getTangentInspector(props.cinematicKey, "outTangent", props.cinematicEditor)
            }
        </EditorInspectorSectionField>
    );
}
