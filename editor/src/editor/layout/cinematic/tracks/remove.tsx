import { HiOutlineTrash } from "react-icons/hi2";

import { ICinematicTrack } from "babylonjs-editor-tools";

import { Button } from "../../../../ui/shadcn/ui/button";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorRemoveTrackButtonProps {
    track: ICinematicTrack;
    cinematicEditor: CinematicEditor;
}

export function CinematicEditorRemoveTrackButton(props: ICinematicEditorRemoveTrackButtonProps) {
	return (
		<Button
			variant="ghost"
			className={`
                    w-8 h-8 p-1
                    ${props.cinematicEditor.state.hoverTrack === props.track ? "opacity-100" : "opacity-0"}
                    transition-all duration-300 ease-in-out
                `}
			onClick={() => props.cinematicEditor.tracks.removeTrack(props.track)}
		>
			<HiOutlineTrash className="w-5 h-5" />
		</Button>
	);
}
