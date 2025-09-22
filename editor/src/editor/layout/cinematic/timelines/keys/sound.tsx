import { ICinematicSound } from "babylonjs-editor-tools";

import { CinematicEditor } from "../../editor";

export interface ICinematicEditorSoundKeyProps {
	cinematicEditor: CinematicEditor;
	scale: number;
	move: boolean;
	cinematicKey: ICinematicSound;
}

export function CinematicEditorSoundKey(props: ICinematicEditorSoundKeyProps) {
	function getSoundFramesCount() {
		return props.cinematicKey.endFrame - props.cinematicKey.startFrame;
	}

	return (
		<div
			style={{
				width: `${getSoundFramesCount() * props.scale}px`,
			}}
			className={`
                h-4 rounded-md bg-gradient-to-t from-green-400 dark:from-green-800 to-muted-foreground dark:to-muted-foreground
                ${props.move ? "" : "cursor-pointer"}
            `}
		/>
	);
}
