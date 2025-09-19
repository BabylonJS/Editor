import { Component, ReactNode } from "react";

import { ICinematicKey, isCinematicKey } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../../tools/undoredo";
import { waitNextAnimationFrame } from "../../../../tools/tools";

import { getKeyFrame } from "../timelines/tools";

import { CinematicEditor } from "../editor";

export interface ICinematicEditorCurvePointProps {
	cx: number;
	cy: number;

	scale: number;
	height: number;

	cinematicKey: ICinematicKey;
	cinematicEditor: CinematicEditor;
}

export class CinematicEditorCurvePoint extends Component<ICinematicEditorCurvePointProps> {
	private _circleRef!: SVGCircleElement;

	public render(): ReactNode {
		return (
			<circle
				ref={(ref) => (this._circleRef = ref!)}
				r={10 / this.props.scale}
				className="fill-primary"
				cursor="pointer"
				cx={this.props.cx}
				cy={this.props.cy}
				onDoubleClick={() => this._handleDoubleClick()}
			/>
		);
	}

	public componentDidMount(): void {
		this._circleRef.addEventListener("mousedown", (ev) => {
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

			const startPosition = getKeyFrame(this.props.cinematicKey);
			const startValue = this.props.cinematicKey.value;

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

					const value = startValue + deltaY;
					const frame = Math.round(Math.max(0, startPosition - deltaX / this.props.cinematicEditor.state.scale));

					if (isCinematicKey(this.props.cinematicKey)) {
						this.props.cinematicKey.frame = frame;
						this.props.cinematicKey.value = value;
					}

					this.props.cinematicEditor.curves.forceUpdate();
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
							const newFrame = this.props.cinematicKey.frame;
							const newValue = this.props.cinematicKey.value;

							registerUndoRedo({
								executeRedo: true,
								undo: () => {
									this.props.cinematicKey.frame = startPosition;
									if (isCinematicKey(this.props.cinematicKey)) {
										this.props.cinematicKey.value = startValue;
									}
								},
								redo: () => {
									this.props.cinematicKey.frame = newFrame;
									if (isCinematicKey(this.props.cinematicKey)) {
										this.props.cinematicKey.value = newValue;
									}
								},
							});
						}
					});
				})
			);
		});
	}

	private _handleDoubleClick(): void {
		const frame = getKeyFrame(this.props.cinematicKey);
		this.props.cinematicEditor.setCurrentTime(frame);
		this.props.cinematicEditor.disposeTemporaryAnimationGroup();
	}
}
