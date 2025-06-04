import { ICinematicAnimationGroup } from "babylonjs-editor-tools";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorAnimationGroupKeyProps {
    cinematicEditor: CinematicEditor;
    scale: number;
    move: boolean;
    cinematicKey: ICinematicAnimationGroup;
}

export function CinematicEditorAnimationGroupKey(props: ICinematicEditorAnimationGroupKeyProps) {
    function getAnimationGroupFramesCount() {
        return props.cinematicKey.endFrame - props.cinematicKey.startFrame;
    }

    return (
        <div
            style={{
                width: `${getAnimationGroupFramesCount() * props.scale / props.cinematicKey.speed}px`,
            }}
            className={`
                h-4 rounded-md bg-muted ring-1 ring-accent dark:ring-black
                ${props.move ? "" : "cursor-pointer"}
            `}
        />
    );
}
