import { MouseEvent } from "react";

import { IAnimationKey, Scalar } from "babylonjs";
import { ICinematicKey, ICinematicKeyCut, isCinematicKeyCut } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../../tools/tools";
import { isColor3, isColor4 } from "../../../../tools/guards/math";

import { CinematicEditor } from "../editor";

import { getKeyFrame } from "../timelines/tools";

import { getEditablePropertyValue, ICinematicEditorEditableProperty, setEditablePropertyValue } from "./tools/property";

export interface ICinematicEditorPropertyPointProps {
	scale: number;
	yScale: number;

	cx: number;
	cy: number;

	animationKey: IAnimationKey;
	cinematicKey: ICinematicKey | ICinematicKeyCut;
	editableProperty: ICinematicEditorEditableProperty;

	cinematicEditor: CinematicEditor;
}

export function CinematicEditorPropertyPoint(props: ICinematicEditorPropertyPointProps) {
	function handleMouseDown(ev: MouseEvent<SVGCircleElement>) {
		ev.stopPropagation();

		if (ev.button !== 0) {
			return;
		}

		let mouseUpListener: (event: globalThis.MouseEvent) => void;
		let mouseMoveListener: (event: globalThis.MouseEvent) => void;

		document.body.style.cursor = "move";

		let moving = false;
		let clientX: number | null = null;
		let clientY: number | null = null;

		const startFrame = props.animationKey.frame;
		const startValue = getEditablePropertyValue(props.editableProperty);

		document.body.addEventListener(
			"mousemove",
			(mouseMoveListener = (ev) => {
				if (clientX === null) {
					clientX = ev.clientX;
				}

				if (clientY === null) {
					clientY = ev.clientY;
				}

				const deltaX = clientX - ev.clientX;
				const deltaY = clientY - ev.clientY;
				if (moving || Math.abs(deltaX) > 5 * devicePixelRatio || Math.abs(deltaY) > 5 * devicePixelRatio) {
					moving = true;
				} else {
					return;
				}

				let value = startValue + deltaY / props.scale / props.yScale;
				if (isColor3(props.animationKey.value) || isColor4(props.animationKey.value)) {
					value = Scalar.Clamp(value, 0, 1);
				}

				const frame = Math.round(Math.max(0, startFrame - deltaX / props.scale));

				if (isCinematicKeyCut(props.cinematicKey)) {
					props.cinematicKey.key1.frame = frame;
					props.cinematicKey.key2.frame = frame;
				} else {
					props.animationKey.frame = frame;
				}

				setEditablePropertyValue(props.editableProperty, value);

				props.cinematicEditor.curves.forceUpdate();
				props.cinematicEditor.updateTracksAtCurrentTime();
			})
		);

		document.body.addEventListener(
			"mouseup",
			(mouseUpListener = (ev) => {
				ev.stopPropagation();

				document.body.style.cursor = "auto";

				document.body.removeEventListener("mouseup", mouseUpListener);
				document.body.removeEventListener("mousemove", mouseMoveListener);

				if (!moving) {
					return;
				}

				waitNextAnimationFrame().then(() => {
					const newFrame = props.animationKey.frame;
					const newValue = getEditablePropertyValue(props.editableProperty);

					registerUndoRedo({
						executeRedo: true,
						action: () => {
							props.cinematicEditor.cinematic.tracks.forEach((track) => {
								track.animationGroups?.sort((a, b) => a.frame - b.frame);
								track.keyFrameAnimations?.sort((a, b) => {
									const frameA = isCinematicKeyCut(a) ? a.key1.frame : a.frame;
									const frameB = isCinematicKeyCut(b) ? b.key1.frame : b.frame;

									return frameA - frameB;
								});
							});
						},
						undo: () => {
							props.animationKey.frame = startFrame;
							setEditablePropertyValue(props.editableProperty, startValue);
						},
						redo: () => {
							props.animationKey.frame = newFrame;
							setEditablePropertyValue(props.editableProperty, newValue);
						},
					});
				});
			})
		);
	}

	function handleClick() {
		props.cinematicEditor.inspector.setEditedObject(props.cinematicKey, props.cinematicEditor.state.selectedTrack!);

		// TODO: fix that
		setTimeout(() => {
			props.cinematicEditor.forceUpdate();
		}, 0);
	}

	return (
		<circle
			className="fill-primary stroke-orange-500"
			cursor="pointer"
			cx={props.cx}
			cy={props.cy}
			r={10 / props.scale}
			strokeWidth={props.cinematicEditor.inspector.state.editedObject === props.cinematicKey ? 4 / props.scale : 0}
			onClick={handleClick}
			onMouseDown={handleMouseDown}
			onDoubleClick={() => props.cinematicEditor.setCurrentTime(getKeyFrame(props.cinematicKey))}
		></circle>
	);
}
