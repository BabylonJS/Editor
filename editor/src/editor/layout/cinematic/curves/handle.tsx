import { MouseEvent } from "react";

import { ICinematicKey, ICinematicKeyCut } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../../tools/tools";

import { CinematicEditor } from "../editor";

import { getKeyFrame } from "../timelines/tools";

import { convertBezierToTangents } from "./tools/tools";

import { getEditablePropertyValue, ICinematicEditorEditableProperty, setEditablePropertyValue } from "./tools/property";

export interface ICinematicEditorCurveHandleProps {
	scale: number;
	yScale: number;

	height: number;

	c1: [number, number];
	c2: [number, number];

	strokeColor: string;

	tangentType: "in" | "out";

	cinematicKey: ICinematicKey | ICinematicKeyCut;
	nextCinematicKey: ICinematicKey | ICinematicKeyCut;

	editableProperty: ICinematicEditorEditableProperty;
	nextEditableProperty: ICinematicEditorEditableProperty;

	editableTangentProperty?: ICinematicEditorEditableProperty;
	nextEditableTangentProperty?: ICinematicEditorEditableProperty;

	cinematicEditor: CinematicEditor;
}

export function CinematicEditorCurveHandle(props: ICinematicEditorCurveHandleProps) {
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

		let oldOutTangent: number | null = null;
		let oldInTangent: number | null = null;

		const startC1 = [props.c1[0], props.c1[1]];
		const startC2 = [props.c2[0], props.c2[1]];

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

				const c1 = props.tangentType === "out" ? [startC1[0] / props.scale, startC1[1] - deltaY / props.scale] : startC1;
				const c2 = props.tangentType === "in" ? [startC2[0] / props.scale, startC2[1] - deltaY / props.scale] : startC2;

				const tangents = convertBezierToTangents({
					p0: [getKeyFrame(props.cinematicKey), getEditablePropertyValue(props.editableProperty)],
					p1: [getKeyFrame(props.nextCinematicKey), getEditablePropertyValue(props.nextEditableProperty)],
					c1: [c1[0], (props.height * 0.5 - c1[1]) / props.yScale],
					c2: [c2[0], (props.height * 0.5 - c2[1]) / props.yScale],
				});

				switch (props.tangentType) {
					case "out":
						if (props.editableTangentProperty) {
							oldOutTangent ??= getEditablePropertyValue(props.editableTangentProperty);
							setEditablePropertyValue(props.editableTangentProperty, tangents.outTangent);
						}
						break;
					case "in":
						if (props.nextEditableTangentProperty) {
							oldInTangent ??= getEditablePropertyValue(props.nextEditableTangentProperty);
							setEditablePropertyValue(props.nextEditableTangentProperty, tangents.inTangent);
						}
						break;
				}

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
					const newOutTangent = props.editableTangentProperty ? getEditablePropertyValue(props.editableTangentProperty) : null;
					const newInTangent = props.nextEditableTangentProperty ? getEditablePropertyValue(props.nextEditableTangentProperty) : null;

					registerUndoRedo({
						executeRedo: true,
						undo: () => {
							if (oldOutTangent !== null && props.editableTangentProperty) {
								setEditablePropertyValue(props.editableTangentProperty, oldOutTangent);
							}

							if (oldInTangent !== null && props.nextEditableTangentProperty) {
								setEditablePropertyValue(props.nextEditableTangentProperty, oldInTangent);
							}
						},
						redo: () => {
							if (oldOutTangent !== null && newOutTangent !== null && props.editableTangentProperty) {
								setEditablePropertyValue(props.editableTangentProperty, newOutTangent);
							}

							if (oldInTangent !== null && newInTangent !== null && props.nextEditableTangentProperty) {
								setEditablePropertyValue(props.nextEditableTangentProperty, newInTangent);
							}
						},
					});
				});
			})
		);
	}

	const x = props.tangentType === "out" ? props.c1[0] : props.c2[0];
	const y = props.tangentType === "out" ? props.c1[1] : props.c2[1];

	return (
		<circle
			r={10 / props.scale}
			className={`fill-border ${props.strokeColor}`}
			strokeWidth={2 / props.scale}
			cursor="pointer"
			cx={x}
			cy={y}
			onMouseDownCapture={handleMouseDown}
		/>
	);
}
