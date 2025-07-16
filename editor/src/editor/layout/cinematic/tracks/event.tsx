import { IoIosRocket } from "react-icons/io";

import { ICinematicTrack } from "babylonjs-editor-tools";

import { Button } from "../../../../ui/shadcn/ui/button";

import { CinematicEditor } from "../editor";

import { CinematicEditorRemoveTrackButton } from "./remove";

export interface ICinematicEditorEventTrackProps {
    track: ICinematicTrack;
    cinematicEditor: CinematicEditor;
}

export function CinematicEditorEventTrack(props: ICinematicEditorEventTrackProps) {
	return (
		<div className="flex gap-2 items-center w-full h-full">
			<div className="flex justify-center items-center w-8 h-8 rounded-md">
				<IoIosRocket className="w-4 h-4" />
			</div>

			<div className="flex-1">
				<Button variant="ghost" className="w-full h-8 bg-accent/35">
					<span className="w-full text-xs whitespace-nowrap overflow-hidden overflow-ellipsis">
                        Events
					</span>
				</Button>
			</div>

			<CinematicEditorRemoveTrackButton {...props} />
		</div>
	);
}
