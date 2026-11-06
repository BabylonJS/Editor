import { ReactNode } from "react";

import { AiOutlineClose } from "react-icons/ai";

import { ICinematicTrack, isCinematicKeyCut } from "babylonjs-editor-tools";

import { ContextMenuCheckboxItem, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator } from "../../../../ui/shadcn/ui/context-menu";

import { CinematicEditor } from "../editor";

import { addAnimationKey } from "../timelines/add";

import { CinematicCurveKey, CinematicCurveTangentMode, getCurveKeyFrame, isKeyTangentLinked } from "./tools/keys";

export interface ICinematicEditorCurvesContextMenuProps {
	cinematicEditor: CinematicEditor;
	track: ICinematicTrack;
	keys: CinematicCurveKey[] | null;
	selection: CinematicCurveKey[];

	/**
	 * The key that was right-clicked, or null when the curves or the background were right-clicked.
	 */
	clickedKey: CinematicCurveKey | null;
	/**
	 * The frame that was right-clicked.
	 */
	frame: number | null;
	/**
	 * Horizontal zoom of the curves, in pixels per frame.
	 */
	zoomX: number;

	onInsertKey: (frame: number) => void;
	onApplyTangentMode: (mode: CinematicCurveTangentMode) => void;
	onSetTangentsLinked: (linked: boolean) => void;
	onRemoveKeys: () => void;
	onFrameAll: () => void;
}

/**
 * Content of the context menu of the curves: tangents and removal of the selected keys when a key is right-clicked,
 * adding keys otherwise.
 */
export function CinematicEditorCurvesContextMenu(props: ICinematicEditorCurvesContextMenuProps): ReactNode {
	if (props.clickedKey) {
		const linkable = props.selection.filter((key) => !isCinematicKeyCut(key));
		const allLinked = linkable.length > 0 && linkable.every((key) => isKeyTangentLinked(key));
		const frame = getCurveKeyFrame(props.clickedKey);

		return (
			<>
				<ContextMenuLabel>{props.selection.length > 1 ? `${props.selection.length} keys` : `Key at frame ${frame}`}</ContextMenuLabel>
				<ContextMenuSeparator />
				<ContextMenuItem onClick={() => props.onApplyTangentMode("auto")}>Auto tangents</ContextMenuItem>
				<ContextMenuItem onClick={() => props.onApplyTangentMode("flat")}>Flat tangents</ContextMenuItem>
				<ContextMenuItem onClick={() => props.onApplyTangentMode("linear")}>Linear (no tangents)</ContextMenuItem>
				{linkable.length > 0 && (
					<ContextMenuCheckboxItem checked={allLinked} onClick={() => props.onSetTangentsLinked(!allLinked)}>
						Linked tangents
					</ContextMenuCheckboxItem>
				)}
				<ContextMenuSeparator />
				<ContextMenuItem onClick={() => props.cinematicEditor.setCurrentTime(frame)}>Go to frame</ContextMenuItem>
				<ContextMenuItem className="flex items-center gap-2 !text-red-400" onClick={() => props.onRemoveKeys()}>
					<AiOutlineClose className="w-5 h-5" fill="rgb(248, 113, 113)" /> Remove {props.selection.length > 1 ? `${props.selection.length} keys` : "key"}
				</ContextMenuItem>
			</>
		);
	}

	// addAnimationKey takes positions in pixels from the frame 0 and divides them by the zoom of the curves.
	const addKey = (type: "key" | "cut", frame: number | null): void => {
		if (frame !== null) {
			addAnimationKey(props.cinematicEditor, type, props.track, frame * props.zoomX);
		}
	};

	return (
		<>
			{!!props.keys?.length && props.frame !== null && (
				<>
					<ContextMenuItem onClick={() => props.onInsertKey(props.frame!)}>Add Key on Curve at Frame {props.frame}</ContextMenuItem>
					<ContextMenuSeparator />
				</>
			)}

			<ContextMenuItem className="flex items-center gap-2" onClick={() => addKey("key", props.frame)}>
				<div className="w-4 h-4 rounded-full border-[2px] bg-muted-foreground" />
				Add Key Here
			</ContextMenuItem>
			<ContextMenuItem className="flex items-center gap-2" onClick={() => addKey("cut", props.frame)}>
				<div className="w-4 h-4 rotate-45 border-[2px] border-orange-500 bg-muted" />
				Add Key Cut Here
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem className="flex items-center gap-2" onClick={() => addKey("key", props.cinematicEditor.state.currentTime)}>
				<div className="w-4 h-4 rounded-full border-[2px] bg-muted-foreground" />
				Add Key at Tracker Position
			</ContextMenuItem>
			<ContextMenuItem className="flex items-center gap-2" onClick={() => addKey("cut", props.cinematicEditor.state.currentTime)}>
				<div className="w-4 h-4 rotate-45 border-[2px] border-orange-500 bg-muted" />
				Add Key Cut at Tracker Position
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => props.onFrameAll()}>Frame All</ContextMenuItem>
		</>
	);
}
