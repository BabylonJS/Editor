import { Component, ReactNode } from "react";

import { Tools } from "babylonjs";
import { ICinematicTrack } from "babylonjs-editor-tools";

import { registerUndoRedo } from "../../../tools/undoredo";
import { getInspectorPropertyValue } from "../../../tools/property";

import { getDefaultRenderingPipeline } from "../../rendering/default-pipeline";

import { CinematicEditor } from "./editor";

import { CinematicEditorTrackAdd } from "./tracks/add";
import { CinematicEditorSoundTrack } from "./tracks/sound";
import { CinematicEditorEventTrack } from "./tracks/event";
import { CinematicEditorPropertyTrack } from "./tracks/property";
import { CinematicEditorAnimationGroupTrack } from "./tracks/animation-group";

export interface ICinematicEditorTracksProps {
	cinematicEditor: CinematicEditor;
}

export interface ICinematicEditorTracksState {}

export class CinematicEditorTracks extends Component<ICinematicEditorTracksProps, ICinematicEditorTracksState> {
	public constructor(props: ICinematicEditorTracksProps) {
		super(props);

		this.state = {};
	}

	public render(): ReactNode {
		const cinematic = this.props.cinematicEditor.cinematic;

		return (
			<div
				className={`relative flex flex-col w-96 h-full border-r-2 border-r-border ${this.props.cinematicEditor.state.editType === "keyframes" ? "min-h-fit" : "overflow-y-auto"}`}
			>
				<div className="flex w-full h-10 py-5" />

				{cinematic.tracks.map((track, index) => {
					return this._getTrack(track, index === 0);
				})}

				<div className="fixed flex justify-between items-center w-96 h-10 bg-background px-2 border-r-2 border-r-border">
					<div className="italic font-thin">
						{cinematic.tracks.length} track{cinematic.tracks.length !== 1 ? "s" : ""}
					</div>

					<CinematicEditorTrackAdd cinematicEditor={this.props.cinematicEditor} />
				</div>
			</div>
		);
	}

	public componentDidMount(): void {
		const selectedTrack = this.props.cinematicEditor.cinematic?.tracks?.[0] || null;

		if (selectedTrack) {
			this.setState({ selectedTrack });
		}
	}

	private _getTrack(track: ICinematicTrack, borderTop: boolean): ReactNode {
		track._id ??= Tools.RandomId();

		const isSelectedTrack = this.props.cinematicEditor.state.selectedTrack === track;

		return (
			<div
				key={track._id}
				className={`
                    flex items-center w-full h-10 px-2 py-2
                    ${borderTop ? "border-t border-t-border/50" : ""}
                    border-b border-b-border/50
                    ${this.props.cinematicEditor.state.hoverTrack === track || isSelectedTrack ? "bg-primary-foreground" : ""}
					${this.props.cinematicEditor.state.selectedTrack !== track ? "opacity-35" : ""}
                    transition-all duration-300 ease-in-out
                `}
				onMouseLeave={() => this.props.cinematicEditor.setState({ hoverTrack: null })}
				onClickCapture={() => {
					this.props.cinematicEditor.setState({ selectedTrack: track });
				}}
				onMouseEnter={() => {
					this.props.cinematicEditor.setState({ hoverTrack: track });
				}}
			>
				{track.keyFrameAnimations && <CinematicEditorPropertyTrack cinematicEditor={this.props.cinematicEditor} track={track} />}

				{track.animationGroups && <CinematicEditorAnimationGroupTrack cinematicEditor={this.props.cinematicEditor} track={track} />}

				{track.sounds && <CinematicEditorSoundTrack cinematicEditor={this.props.cinematicEditor} track={track} />}

				{track.keyFrameEvents && this.props.cinematicEditor.state.editType === "keyframes" && (
					<CinematicEditorEventTrack cinematicEditor={this.props.cinematicEditor} track={track} />
				)}
			</div>
		);
	}

	public addPropertyTrack(options: Partial<ICinematicTrack> = {}): void {
		const track = {
			keyFrameAnimations: [],
			node: options.defaultRenderingPipeline ? getDefaultRenderingPipeline() : null,
			...options,
		} as ICinematicTrack;

		if (track.defaultRenderingPipeline && track.propertyPath) {
			const value = getInspectorPropertyValue(getDefaultRenderingPipeline(), track.propertyPath);
			if (value !== null && value !== undefined) {
				track.keyFrameAnimations = [
					{ type: "key", frame: 0, value: value.clone?.() ?? value },
					{ type: "key", frame: 60, value: value.clone?.() ?? value },
				];
			}
		}

		this._handleAddTrackUndoRedo(track);
	}

	public addAnimationGroupTrack(): void {
		const track = {
			animationGroups: [],
		} as ICinematicTrack;

		this._handleAddTrackUndoRedo(track);
	}

	public addSoundTrack(): void {
		const track = {
			sounds: [],
		} as ICinematicTrack;

		this._handleAddTrackUndoRedo(track);
	}

	public addEventTrack(): void {
		const track = {
			keyFrameEvents: [],
		} as ICinematicTrack;

		this._handleAddTrackUndoRedo(track);
	}

	private _handleAddTrackUndoRedo(track: ICinematicTrack): void {
		const cinematic = this.props.cinematicEditor.cinematic;

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				const index = cinematic.tracks.indexOf(track);
				if (index !== -1) {
					cinematic.tracks.splice(index, 1);
				}
			},
			redo: () => cinematic.tracks.push(track),
		});

		this.props.cinematicEditor.forceUpdate();
	}

	public removeTrack(track: ICinematicTrack): void {
		const cinematic = this.props.cinematicEditor.cinematic;

		const index = cinematic.tracks?.indexOf(track) ?? -1;
		if (index === -1) {
			return;
		}

		registerUndoRedo({
			executeRedo: true,
			undo: () => {
				cinematic.tracks.splice(index, 0, track);
			},
			redo: () => {
				cinematic.tracks.splice(index, 1);
			},
		});

		this.props.cinematicEditor.forceUpdate();
	}
}
