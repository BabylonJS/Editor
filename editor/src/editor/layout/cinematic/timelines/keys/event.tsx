import { ICinematicKeyEvent } from "babylonjs-editor-tools";

import { CinematicEditor } from "../../editor";

export interface ICinematicEditorEventKeyProps {
    cinematicEditor: CinematicEditor;
    scale: number;
    move: boolean;
    cinematicKey: ICinematicKeyEvent;
}

export function CinematicEditorEventKey(props: ICinematicEditorEventKeyProps) {
	return (
		<div
			className={`
                w-4 h-4 rotate-45 -translate-x-1/2 bg-muted ring-1 ring-accent dark:ring-black
                ${props.move ? "" : "cursor-pointer hover:scale-125 transition-transform duration-300 ease-in-out"}
            `}
		/>
	);
}
