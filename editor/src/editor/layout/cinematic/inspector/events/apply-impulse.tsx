import { Scene } from "babylonjs";
import { ICinematicKeyEvent } from "babylonjs-editor-tools";

import { EditorInspectorNodeField } from "../../../inspector/fields/node";
import { EditorInspectorVectorField } from "../../../inspector/fields/vector";
import { EditorInspectorNumberField } from "../../../inspector/fields/number";

export interface ICinematicEditorApplyImpulseKeyInspectorProps {
    scene: Scene;
    cinematicKey: ICinematicKeyEvent;
}

export function CinematicEditorApplyImpulseKeyInspector(props: ICinematicEditorApplyImpulseKeyInspectorProps) {
    return (
        <>
            <EditorInspectorVectorField object={props.cinematicKey.data} property="force" label="Force" />
            <EditorInspectorVectorField object={props.cinematicKey.data} property="contactPoint" label="Contact Point" />

            {!props.cinematicKey.data.mesh &&
                <EditorInspectorNumberField object={props.cinematicKey.data} property="radius" label="Radius" min={0} step={0.01} tooltip="Put 0 to ignore the radius and apply impulse on all meshes or selected mesh" />
            }

            <EditorInspectorNodeField object={props.cinematicKey.data} property="mesh" scene={props.scene} label="Mesh" />
        </>
    );
}
