import { DragEvent, useState } from "react";
import { HiSpeakerWave } from "react-icons/hi2";

import { ICinematicTrack } from "babylonjs-editor-tools";

import { getSoundById } from "../../../../tools/sound/tools";
import { registerUndoRedo } from "../../../../tools/undoredo";

import { CinematicEditor } from "../editor";

import { CinematicEditorRemoveTrackButton } from "./remove";
import { Button } from "../../../../ui/shadcn/ui/button";

export interface ICinematicEditorSoundTrackProps {
	track: ICinematicTrack;
	cinematicEditor: CinematicEditor;
}

export function CinematicEditorSoundTrack(props: ICinematicEditorSoundTrackProps) {
	const [dragOver, setDragOver] = useState(false);

	function handleDragOver(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		event.stopPropagation();
		setDragOver(true);
	}

	function handleDragLeave(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setDragOver(false);
	}

	function handleDrop(event: DragEvent<HTMLDivElement>) {
		event.preventDefault();
		event.stopPropagation();

		setDragOver(false);

		const data = JSON.parse(event.dataTransfer.getData("graph/node")) as string[];
		const sound = getSoundById(data[0], props.cinematicEditor.editor.layout.preview.scene);

		if (sound && sound !== props.track.sound) {
			const oldSound = props.track.node;
			const oldSounds = props.track.sounds;

			registerUndoRedo({
				executeRedo: true,
				undo: () => {
					props.track.sound = oldSound;
					props.track.sounds = oldSounds;
				},
				redo: () => {
					props.track.sound = sound;
					props.track.sounds = [];
				},
			});

			props.cinematicEditor.forceUpdate();
		}
	}

	return (
		<div className="flex gap-2 items-center w-full h-full">
			<div
				draggable
				onDragOver={(ev) => handleDragOver(ev)}
				onDragLeave={(ev) => handleDragLeave(ev)}
				onDrop={(ev) => handleDrop(ev)}
				className={`
                    flex justify-center items-center w-8 h-8 rounded-md
                    ${dragOver ? "bg-accent" : ""}
                `}
			>
				<HiSpeakerWave className="w-4 h-4" />
			</div>

			<div className="flex-1">
				<Button variant="ghost" className="w-full h-8 bg-accent/35">
					<span className="w-full text-xs whitespace-nowrap overflow-hidden overflow-ellipsis">{props.track.sound?.name ?? "No sound"}</span>
				</Button>
			</div>

			<CinematicEditorRemoveTrackButton {...props} />
		</div>
	);
}
