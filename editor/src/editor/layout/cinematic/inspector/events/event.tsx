import { Vector3 } from "babylonjs";
import { ICinematicKeyEvent, ICinematicTrack } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../../tools/undoredo";

import { CinematicEditor } from "../../editor";

import { EditorInspectorListField } from "../../../inspector/fields/list";
import { EditorInspectorNumberField } from "../../../inspector/fields/number";
import { EditorInspectorSectionField } from "../../../inspector/fields/section";

import { CinematicEditorSetEnabledKeyInspector } from "./set-enabled";
import { CinematicEditorApplyImpulseKeyInspector } from "./apply-impulse";

export interface ICinematicEditorEventKeyInspectorProps {
    cinematicEditor: CinematicEditor;
    cinematicKey: ICinematicKeyEvent;
    track: ICinematicTrack;
}

export function CinematicEditorEventKeyInspector(props: ICinematicEditorEventKeyInspectorProps) {
    const o = {
        type: props.cinematicKey.data?.type ?? "none",
    };

    function onEventTypeChange(value: string) {
        const oldData = props.cinematicKey.data;

        registerUndoRedo({
            executeRedo: true,
            undo: () => props.cinematicKey.data = oldData,
            redo: () => {
                switch (value) {
                    case "set-enabled":
                        props.cinematicKey.data = {
                            type: "set-enabled",
                            value: true,
                            node: null,
                        };
                        break;
                    case "apply-impulse":
                        props.cinematicKey.data = {
                            type: "apply-impulse",
                            radius: 0,
                            mesh: null,
                            force: Vector3.Zero(),
                            contactPoint: Vector3.Zero(),
                        };
                        break;

                    default:
                        props.cinematicKey.data = undefined;
                        break;
                }
            },
        });

        props.cinematicEditor.inspector.forceUpdate();
    }

    return (
        <EditorInspectorSectionField title="Event">
            <EditorInspectorNumberField object={props.cinematicKey} property="frame" label="Frame" min={0} step={1} onChange={() => {
                props.cinematicEditor.timelines.sortAnimationsKeys();
                props.cinematicEditor.timelines.updateTracksAtCurrentTime();
            }} />

            <EditorInspectorListField
                noUndoRedo
                object={o}
                property="type"
                label="Event Type"
                items={[
                    { text: "None", value: "none" },
                    { text: "Set Enabled", value: "set-enabled" },
                    { text: "Apply Impulse", value: "apply-impulse" },
                ]}
                onChange={onEventTypeChange}
            />

            {props.cinematicKey.data?.type === "set-enabled" &&
                <CinematicEditorSetEnabledKeyInspector
                    cinematicKey={props.cinematicKey}
                    scene={props.cinematicEditor.editor.layout.preview.scene}
                />
            }

            {props.cinematicKey.data?.type === "apply-impulse" &&
                <CinematicEditorApplyImpulseKeyInspector
                    cinematicKey={props.cinematicKey}
                    scene={props.cinematicEditor.editor.layout.preview.scene}
                />
            }
        </EditorInspectorSectionField>
    );
}
