import { ICinematicKeyCut, ICinematicTrack } from "babylonjs-editor-tools";

import { CinematicEditor } from "../editor";

import { CinematicEditorKeyInspector } from "./key";

export interface ICinematicEditorKeyCutInspectorProps {
    cinematicEditor: CinematicEditor;
    cinematicKey: ICinematicKeyCut;
    track: ICinematicTrack;
    title: string;
}

export function CinematicEditorKeyCutInspector(props: ICinematicEditorKeyCutInspectorProps) {
    return (
        <>
            <CinematicEditorKeyInspector
                title="Key 1"
                track={props.track}
                cinematicKey={props.cinematicKey.key1}
                cinematicEditor={props.cinematicEditor}
                hideOutTangent
            />

            <CinematicEditorKeyInspector
                title="Key 2"
                track={props.track}
                cinematicKey={props.cinematicKey.key2}
                cinematicEditor={props.cinematicEditor}
                hideInTangent
            />
        </>
    );
}
