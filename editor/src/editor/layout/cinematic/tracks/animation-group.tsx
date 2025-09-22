import { MdAnimation } from "react-icons/md";

import { ICinematicTrack } from "babylonjs-editor-tools";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../ui/shadcn/ui/select";

import { registerUndoRedo } from "../../../../tools/undoredo";

import { CinematicEditor } from "../editor";

import { CinematicEditorRemoveTrackButton } from "./remove";

export interface ICinematicEditorAnimationGroupTrackProps {
	track: ICinematicTrack;
	cinematicEditor: CinematicEditor;
}

export function CinematicEditorAnimationGroupTrack(props: ICinematicEditorAnimationGroupTrackProps) {
	function handleAnimationGroupChanged(name: string) {
		const animationGroup = props.cinematicEditor.editor.layout.preview.scene.getAnimationGroupByName(name);
		if (!animationGroup) {
			return;
		}

		const oldAnimationGroup = props.track.animationGroup;

		registerUndoRedo({
			executeRedo: true,
			undo: () => (props.track.animationGroup = oldAnimationGroup),
			redo: () => (props.track.animationGroup = animationGroup),
		});

		props.cinematicEditor.forceUpdate();
	}

	return (
		<div className="flex gap-2 items-center w-full h-full">
			<div className="flex justify-center items-center w-8 h-8 rounded-md">
				<MdAnimation className="w-4 h-4" />
			</div>

			<div className="flex-1">
				<Select value={props.track.animationGroup?.name} onValueChange={(v) => handleAnimationGroupChanged(v)}>
					<SelectTrigger
						className={`
                            border-none w-full h-8
                            [&>span]:text-center [&>span]:w-full [&>span]:text-xs [&>svg]:invisible [&>svg]:hover:visible
                        `}
					>
						<SelectValue placeholder="Animation Group..." />
					</SelectTrigger>
					<SelectContent>
						{props.cinematicEditor.editor.layout.preview.scene.animationGroups.map((animationGroup, index) => (
							<SelectItem key={`${animationGroup.name}${index}`} value={animationGroup.name}>
								{animationGroup.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<CinematicEditorRemoveTrackButton {...props} />
		</div>
	);
}
