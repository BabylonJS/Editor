import { ICinematicKey, ICinematicKeyCut, isCinematicKeyCut } from "babylonjs-editor-tools";

import { CinematicEditor } from "../../editor";

export interface ICinematicEditorPropertyKeyProps {
	cinematicEditor: CinematicEditor;
	scale: number;
	move: boolean;
	cinematicKey: ICinematicKey | ICinematicKeyCut;
}

export function CinematicEditorPropertyKey(props: ICinematicEditorPropertyKeyProps) {
	return (
		<div
			className={`
                w-4 h-4 rotate-45 -translate-x-1/2
                ${props.move ? "" : "cursor-pointer hover:scale-125 transition-transform duration-300 ease-in-out"}
                ${isCinematicKeyCut(props.cinematicKey) ? "border-[2px] border-orange-500 bg-muted" : "bg-muted-foreground"}
            `}
		/>
	);
}
