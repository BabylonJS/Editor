import { Component, ReactNode } from "react";

import { ICinematicKey, isCinematicKey } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../../tools/tools";

import { CinematicEditor } from "../editor";
import { convertBezierToTangents, SVGYToValue } from "./tools";
import { getKeyFrame } from "../timelines/tools";

export interface ICinematicEditorCurveHandleProps {
	c1: [number, number];
	c2: [number, number];

	tangentType: "in" | "out";

	scale: number;
	height: number;

	cinematicKey: ICinematicKey;
	nextCinematicKey: ICinematicKey;

	cinematicEditor: CinematicEditor;
}

export class CinematicEditorCurveHandle extends Component<ICinematicEditorCurveHandleProps> {
	private _circleRef!: SVGCircleElement;

	public render(): ReactNode {
		const x = this.props.tangentType === "out" ? this.props.c1[0] : this.props.c2[0];
		const y = this.props.tangentType === "out" ? this.props.c1[1] : this.props.c2[1];

		return <circle ref={(ref) => (this._circleRef = ref!)} r={10 / this.props.scale} className="fill-border" cursor="pointer" cx={x} cy={y} />;
	}

	public componentDidMount(): void {
		this._circleRef.addEventListener(
			"mousedown",
			(ev) => {
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

				const startC1 = [this.props.c1[0], this.props.c1[1]];
				const startC2 = [this.props.c2[0], this.props.c2[1]];

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

						const c1 = this.props.tangentType === "out" ? [startC1[0] / this.props.scale, startC1[1] - deltaY / this.props.scale] : startC1;
						const c2 = this.props.tangentType === "in" ? [startC2[0] / this.props.scale, startC2[1] - deltaY / this.props.scale] : startC2;

						if (isCinematicKey(this.props.cinematicKey)) {
							const tangents = convertBezierToTangents({
								p0: [getKeyFrame(this.props.cinematicKey), this.props.cinematicKey.value],
								p1: [getKeyFrame(this.props.nextCinematicKey), this.props.nextCinematicKey.value],
								c1: [c1[0], this.props.height * 0.5 - c1[1]],
								c2: [c2[0], this.props.height * 0.5 - c2[1]],
							});

							switch (this.props.tangentType) {
								case "out":
									this.props.cinematicKey.outTangent = tangents.outTangent;
									break;
								case "in":
									this.props.nextCinematicKey.inTangent = tangents.inTangent;
									break;
							}
						}

						this.props.cinematicEditor.updateTracksAtCurrentTime();
					})
				);

				document.body.addEventListener(
					"mouseup",
					(mouseUpListener = (ev) => {
						ev.stopPropagation();

						document.body.style.cursor = "auto";

						document.body.removeEventListener("mouseup", mouseUpListener);
						document.body.removeEventListener("mousemove", mouseMoveListener);

						waitNextAnimationFrame().then(() => {
							if (moving) {
								registerUndoRedo({
									executeRedo: true,
									undo: () => {
										// TODO
									},
									redo: () => {
										// TODO
									},
								});
							}
						});
					})
				);
			},
			{
				capture: true,
			}
		);
	}
}
