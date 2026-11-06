import { Component, ReactNode } from "react";

import { ICinematicTrack } from "babylonjs-editor-tools";

import { CinematicEditor } from "./editor";
import { CinematicEditorTracker } from "./tracker";

import { CinematicEditorCurvesRoot } from "./curves/root";
import { ICinematicEditorCurvesView } from "./curves/tools/view";

export interface ICinematicEditorCurvesProps {
	currentTime: number;

	selectedTrack: ICinematicTrack | null;

	cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorCurvesState {
	/**
	 * Defines how the curves are displayed (zoom and position on each axis).
	 */
	view: ICinematicEditorCurvesView;
}

export class CinematicEditorCurves extends Component<ICinematicEditorCurvesProps, ICinematicEditorCurvesState> {
	public tracker!: CinematicEditorTracker;

	public constructor(props: ICinematicEditorCurvesProps) {
		super(props);

		this.state = {
			// Replaced by the framing of the curves once a track is displayed.
			view: { zoomX: 4, zoomY: 1, panX: 56, panY: 300 },
		};
	}

	public render(): ReactNode {
		return (
			<div
				className={`
					relative flex-1 w-full h-full overflow-hidden
					${this.props.cinematicEditor.state.editType !== "curves" ? "hidden pointer-events-none" : ""}
				`}
			>
				{/* Same margin as the tracker so frames line up. */}
				<div className="absolute top-0 right-0 bottom-0 left-2">
					<CinematicEditorCurvesRoot view={this.state.view} cinematicEditor={this.props.cinematicEditor} onViewChange={(view) => this.setState({ view })} />
				</div>

				<CinematicEditorTracker ref={(r) => (this.tracker = r!)} scale={this.state.view.zoomX} translationX={this.state.view.panX} currentTime={this.props.currentTime} />
			</div>
		);
	}
}
