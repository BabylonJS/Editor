import { Nullable } from "../../../shared/types";

import * as React from "react";
import SplitPane from "react-split-pane";
import { Button, ButtonGroup, Classes, Icon as BPIcon } from "@blueprintjs/core";

import { Icon } from "../../editor/gui/icon";

import { Cinematic } from "../../editor/cinematic/cinematic";

import { AbstractEditorPlugin, IEditorPluginProps } from "../../editor/tools/plugin";

import { Tracks } from "./panels/tracks";
import { Timelines } from "./panels/timelines";
import { CinematicCreator } from "./panels/creator";

export const title = "Cinematic Editor";

export interface ICinematicEditorPluginState {
	/**
	 * Defines wether or not the tool is ready.
	 */
	isReady: boolean;
	/**
	 * Defines wether or not the timeline is being played.
	 */
	isPlaying: boolean;
	/**
	 * Defines wether or not the tools is in editing mode.
	 */
	isEditing: boolean;

	/**
	 * Defines the reference to the cinematic
	 */
	cinematic: Nullable<Cinematic>;

	/**
	 * Defines the current with of the timelines panel.
	 */
	panelWidth: number;
}

export default class CinematicEditorPlugin extends AbstractEditorPlugin<ICinematicEditorPluginState> {
	/** @hidden */
	public _tracks: Nullable<Tracks> = null;
	/** @hidden */
	public _timelines: Nullable<Timelines> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IEditorPluginProps) {
		super(props);

		this.state = {
			cinematic: null,
			panelWidth: 350,
			isPlaying: false,
			isEditing: false,
			isReady: props.editor.isProjectReady,
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		if (!this.state.isReady) {
			return <div></div>;
		}

		return (
			<div style={{ width: "100%", height: "100%", overflow: "hidden", backgroundColor: "#3A3A3A" }}>
				<div className={Classes.FILL} style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
					<ButtonGroup style={{ display: this.state.isEditing ? "" : "none" }}>
						<Button small text="Previous" icon={<BPIcon icon="arrow-left" color="white" />} onClick={() => this.setState({ isEditing: false })} />
					</ButtonGroup>
					<ButtonGroup style={{ position: "absolute", left: "50%", transform: "translate(-50%)" }}>
						<Button small icon={<Icon src="play.svg" />} text="Play" disabled={this.state.isPlaying} onClick={() => this.play()} />
						<Button small icon={<Icon src="stop.svg" />} text="Stop" disabled={!this.state.isPlaying} onClick={() => this.stop()} />
					</ButtonGroup>
					<ButtonGroup style={{ position: "absolute", right: "0px" }}>
						<Button small icon={<Icon src="plus.svg" />} text="Add Key Frame" disabled={!this.state.isEditing} onClick={() => this._handleAddKeyFrame()} />
					</ButtonGroup>
				</div>
				{this.state.isEditing ? this._getCinematicEditor() : this._getCinematicCreator()}
			</div>
		);
	}

	/**
	 * Called on the plugin is ready.
	 */
	public onReady(): void {
		this.notifyDimensions();

		if (!this.state.isReady) {
			this.props.editor.editorInitializedObservable.addOnce(() => this.setState({ isReady: true }));
		}
	}

	/**
	 * Called on the plugin is closed.
	 */
	public onClose(): void {
		// Nothing to do for now...
	}

	/**
	 * Called on the panel has been resized.
	 * @param width the new with of the plugin's panel.
	 * @param height the new height of the plugin's panel.
	 */
	public resize(_1: number, height: number): void {
		this._timelines?.timeTracker?.setState({ height });
	}

	/**
	 * Called on the user wants to play the cinematic.
	 */
	public play(): void {
		this._timelines?.play();

		this.setState({ isPlaying: true });
		this.state.cinematic?.play(this.editor.scene!, this._timelines?.timeTracker?.getPosition());
	}

	/**
	 * Called on the user wants to stop the cinematic.
	 */
	public stop(): void {
		if (!this.state.isPlaying) {
			return;
		}

		this._timelines?.stop();

		this.setState({ isPlaying: false });
		this.state.cinematic?.stop();
	}

	/**
	 * Notifies the current dimensions to the components.
	 */
	public notifyDimensions(): void {
		const size = this.editor.getPanelSize(title);
		if (size) {
			this.setState({ panelWidth: size.width });
			this._timelines?.timeTracker?.setState({ height: size.height });
		}
	}

	/**
	 * Refreshes the overall tool.
	 */
	public refreshAll(): void {
		this._tracks?.refreshTracks();
		this._timelines?.refreshTimelines();
	}

	/**
	 * Called on the panel's width changed.
	 */
	private _handleWidthChanged(panelWidth: number): void {
		this.setState({ panelWidth });
		this._timelines?.setPanelWidth(panelWidth);
	}

	/**
	 * Called on the user wants to add a new keyframe.
	 */
	private _handleAddKeyFrame(): void {
		const node = this._tracks?.state.selectedNode;
		this._timelines?.addKeyFrame(node?.id as string, node?.nodeData?.track);
	}

	/**
	 * Returns the component used to edit the available cinematics.
	 */
	private _getCinematicCreator(): React.ReactNode {
		return (
			<CinematicCreator
				onCinematicSelected={(c) => {
					this.setState({ cinematic: c, isEditing: true });
				}}
			/>
		);
	}

	/**
	 * Returns the component used to edit the cinematic.
	 */
	private _getCinematicEditor(): React.ReactNode {
		if (!this.state.cinematic) {
			return undefined;
		}

		return (
			<SplitPane
				size="75%"
				minSize={350}
				split="vertical"
				primary="second"
				style={{ height: "calc(100% - 30px)" }}
				onChange={(panelWidth) => this._handleWidthChanged(panelWidth * 2)}
			>
				<Tracks
					editor={this.editor}
					cinematicEditor={this}
					ref={(r) => this._tracks = r}
					cinematic={this.state.cinematic}
				/>

				<Timelines
					editor={this.editor}
					cinematicEditor={this}
					cinematic={this.state.cinematic}
					ref={(r) => this._timelines = r}
				/>
			</SplitPane>
		);
	}
}
