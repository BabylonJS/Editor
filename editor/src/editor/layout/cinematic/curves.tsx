import { Component, MouseEvent } from "react";

import { Vector2 } from "babylonjs";
import { ICinematicTrack } from "babylonjs-editor-tools";

import { isDomElementDescendantOf } from "../../../tools/dom";

import { CinematicEditor } from "./editor";
import { CinematicEditorTracker } from "./tracker";

import { CinematicEditorCurvesRoot } from "./curves/root";

export interface ICinematicEditorCurvesProps {
	scale: number;
	currentTime: number;

	selectedTrack: ICinematicTrack | null;

	cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorCurvesState {
	translation: Vector2;
}

export class CinematicEditorCurves extends Component<ICinematicEditorCurvesProps, ICinematicEditorCurvesState> {
	public tracker: CinematicEditorTracker;

	private _divRef: HTMLDivElement | null = null;

	public constructor(props: ICinematicEditorCurvesProps) {
		super(props);

		this.state = {
			translation: Vector2.Zero(),
		};
	}

	public render(): React.ReactNode {
		return (
			<div
				ref={(r) => (this._divRef = r)}
				className={`
                    relative flex flex-col flex-1 w-full min-h-fit h-full overflow-x-hidden overflow-y-hidden
                    ${this.props.cinematicEditor.state.editType !== "curves" ? "hidden pointer-events-none" : ""}
                `}
				onMouseDown={(ev) => this._handleMainDivPointerDown(ev)}
			>
				<CinematicEditorCurvesRoot scale={this.props.scale} translation={this.state.translation} cinematicEditor={this.props.cinematicEditor} />
				<CinematicEditorTracker ref={(r) => (this.tracker = r!)} scale={this.props.scale} translationX={this.state.translation.x} currentTime={this.props.currentTime} />
			</div>
		);
	}

	private _handleMainDivPointerDown(event: MouseEvent<HTMLDivElement>): void {
		if (event.button !== 0 || !isDomElementDescendantOf(event.nativeEvent.target as HTMLElement, this._divRef!)) {
			return;
		}

		document.body.style.cursor = "ew-resize";

		let mouseUpListener: (event: globalThis.MouseEvent) => void;
		let mouseMoveListener: (event: globalThis.MouseEvent) => void;

		let moving = false;
		let clientX: number | null = null;

		const startPosition = (event.nativeEvent.offsetX - this.state.translation.x) / this.props.scale;

		this.props.cinematicEditor.createTemporaryAnimationGroup();
		this.props.cinematicEditor.setCurrentTime(startPosition);

		document.body.addEventListener(
			"mousemove",
			(mouseMoveListener = (ev) => {
				if (clientX === null) {
					clientX = ev.clientX;
				}

				const delta = clientX - ev.clientX;
				if (moving || Math.abs(delta) > 5 * devicePixelRatio) {
					moving = true;
				} else {
					return;
				}

				const currentTime = Math.round(Math.max(0, startPosition - delta / this.props.scale));

				this.props.cinematicEditor.setCurrentTime(currentTime);
			})
		);

		document.body.addEventListener(
			"mouseup",
			(mouseUpListener = (ev) => {
				ev.stopPropagation();

				document.body.style.cursor = "auto";

				document.body.removeEventListener("mouseup", mouseUpListener);
				document.body.removeEventListener("mousemove", mouseMoveListener);

				this.props.cinematicEditor.disposeTemporaryAnimationGroup();
			})
		);
	}
}
