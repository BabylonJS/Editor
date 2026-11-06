import { writeJSON } from "fs-extra";

import { Component, ReactNode } from "react";

import { toast } from "sonner";

import { Observer, AnimationGroup, Animation } from "babylonjs";
import {
	generateCinematicAnimationGroup,
	getCinematicFramesCount,
	getCinematicSequenceFramesCount,
	getCinematicSequenceStartFrame,
	ICinematic,
	ICinematicSequence,
	ICinematicTrack,
	setDefaultRenderingPipelineRef,
	setMotionBlurPostProcessRef,
	setSSAO2RenderingPipelineRef,
	setSSRRenderingPipelineRef,
	setVLSPostProcessRef,
} from "babylonjs-editor-tools";

import { Editor } from "../../main";

import { TooltipProvider } from "../../../ui/shadcn/ui/tooltip";

import { saveSingleFileDialog } from "../../../tools/dialog";
import { onRedoObservable, onUndoObservable } from "../../../tools/undoredo";
import { updateLightShadowMapRefreshRate } from "../../../tools/light/shadows";

import { getVLSPostProcess } from "../../rendering/vls";
import { getSSRRenderingPipeline } from "../../rendering/ssr";
import { getSSAO2RenderingPipeline } from "../../rendering/ssao";
import { getMotionBlurPostProcess } from "../../rendering/motion-blur";
import { getDefaultRenderingPipeline } from "../../rendering/default-pipeline";

import { serializeCinematic } from "./serialization/serialize";

import { restoreSceneState, saveSceneState } from "./tools/state";
import { syncAnimationGroupsToFrame, syncSoundsToFrame } from "./tools/sync";

import { CinematicEditorTimelineOptions } from "./timelines/options";

import { RenderType } from "./render/render";
import { CinematicEditorRenderer } from "./render/renderer";
import { CinematicEditorRenderDialog } from "./render/dialog";

import { CinematicEditorTracks } from "./tracks";
import { CinematicEditorCurves } from "./curves";
import { CinematicEditorToolbar } from "./toolbar";
import { CinematicEditorSequences } from "./sequences";
import { CinematicEditorTimelines } from "./timelines";
import { CinematicEditorInspector } from "./inspector";

export interface ICinematicEditorProps {
	editor: Editor;
	absolutePath: string;
	cinematic: ICinematic;
}

export interface ICinematicEditorState {
	timelinesScale: number;

	/**
	 * Defines the time of the tracker: relative to the start of the edited sequence, or to the start of the cinematic
	 * when the sequences are displayed.
	 */
	currentTime: number;

	/**
	 * Defines the sequence whose tracks are edited. When null, the sequences of the cinematic are displayed.
	 */
	sequence: ICinematicSequence | null;

	editType: "keyframes" | "curves";

	tracksFilter: string;

	hoverTrack: ICinematicTrack | null;
	selectedTrack: ICinematicTrack | null;

	playing: boolean;
	renderType: RenderType;
}

export class CinematicEditor extends Component<ICinematicEditorProps, ICinematicEditorState> {
	/**
	 * Defines the reference to the tracks panel used to display and edit the cinematic tracks.
	 */
	public tracks!: CinematicEditorTracks;
	/**
	 * Defines the reference to the timelines panel used to display and edit the cinematic timelines.
	 */
	public timelines!: CinematicEditorTimelines;
	/**
	 * Defines the reference to the curves panel used to edit animation curves in selected track.
	 */
	public curves!: CinematicEditorCurves;
	/**
	 * Defines the reference to the inspector used to display and edit the cinematic properties.
	 */
	public inspector!: CinematicEditorInspector;
	/**
	 * Defines the reference to the list of the sequences of the cinematic, displayed when no sequence is edited.
	 */
	public sequences: CinematicEditorSequences | null = null;

	/**
	 * Defines the reference to the editor instance that owns this cinematic editor.
	 */
	public readonly editor: Editor;
	/**
	 * Defines the reference to the cinematic object being edited.
	 */
	public readonly cinematic: ICinematic;

	private _renderer!: CinematicEditorRenderer;
	private _renderDialog!: CinematicEditorRenderDialog;

	private _undoObserver: Observer<void> | null = null;
	private _redoObserver: Observer<void> | null = null;
	private _keydownListener: ((event: KeyboardEvent) => void) | null = null;

	private _temporaryAnimationGroup: AnimationGroup | null = null;

	private _playAnimation: Animation | null = null;
	private _currentTimeBeforePlay: number | null = null;
	private _animatedCurrentTime: number = 0;
	private _playRenderLoop: (() => void) | null = null;

	private _focused: boolean = false;

	public constructor(props: ICinematicEditorProps) {
		super(props);

		this.editor = props.editor;
		this.cinematic = props.cinematic;

		this.state = {
			timelinesScale: 1,
			currentTime: 0,

			sequence: null,

			tracksFilter: "",

			hoverTrack: null,
			selectedTrack: null,

			editType: "keyframes",

			playing: false,
			renderType: "1080p",
		};
	}

	public render(): ReactNode {
		return (
			<div onMouseEnter={() => (this._focused = true)} onMouseLeave={() => (this._focused = false)} className="flex flex-col w-full h-full overflow-hidden">
				<CinematicEditorToolbar cinematicEditor={this} playing={this.state.playing} />

				{!this.state.sequence && (
					<CinematicEditorSequences ref={(ref) => (this.sequences = ref)} cinematicEditor={this} scale={this.state.timelinesScale} currentTime={this.state.currentTime} />
				)}

				{/* The edition of a sequence stays mounted while the sequences are displayed: its panels are used by the undo/redo actions. */}
				<div className={`flex flex-1 overflow-hidden ${this.state.sequence ? "" : "hidden"}`}>
					<div className="flex flex-col flex-1 overflow-hidden">
						{/* Headers */}
						<div className="flex w-full h-10">
							<div className="flex justify-center items-center w-96 h-10 font-semibold bg-secondary border-r-2 border-r-muted">Tracks</div>

							<div className="flex flex-1 justify-center items-center gap-2 w-full h-10 font-semibold bg-secondary">
								<div>Timelines</div>

								<CinematicEditorTimelineOptions cinematicEditor={this} />
							</div>
						</div>

						<div className={`flex flex-1 ${this.state.editType === "keyframes" ? "overflow-y-auto" : "overflow-hidden"}`}>
							<TooltipProvider>
								<CinematicEditorTracks ref={(ref) => (this.tracks = ref!)} cinematicEditor={this} tracksFilter={this.state.tracksFilter} />

								<CinematicEditorTimelines
									ref={(ref) => (this.timelines = ref!)}
									cinematicEditor={this}
									scale={this.state.timelinesScale}
									currentTime={this.state.currentTime}
									tracksFilter={this.state.tracksFilter}
								/>
								<CinematicEditorCurves
									ref={(ref) => (this.curves = ref!)}
									cinematicEditor={this}
									currentTime={this.state.currentTime}
									selectedTrack={this.state.selectedTrack}
								/>
							</TooltipProvider>
						</div>
					</div>

					<CinematicEditorInspector cinematicEditor={this} ref={(r) => (this.inspector = r!)} />
				</div>

				<CinematicEditorRenderDialog ref={(r) => (this._renderDialog = r!)} cinematicEditor={this} onRender={(from, to) => this.renderCinematic(from, to)} />

				<CinematicEditorRenderer ref={(r) => (this._renderer = r!)} cinematicEditor={this} />
			</div>
		);
	}

	public componentDidMount(): void {
		this._undoObserver = onUndoObservable.add(() => {
			this._handleUndoRedo();
		});

		this._redoObserver = onRedoObservable.add(() => {
			this._handleUndoRedo();
		});

		window.addEventListener(
			"keydown",
			(this._keydownListener = (event) => {
				if (event.key === " ") {
					event.preventDefault();

					if (this.state.playing && this._focused) {
						this.stop();
					} else {
						this.play();
					}
				}
			})
		);
	}

	public componentWillUnmount(): void {
		onUndoObservable.remove(this._undoObserver);
		onRedoObservable.remove(this._redoObserver);

		if (this._keydownListener) {
			window.removeEventListener("keydown", this._keydownListener);
		}

		this.stop();
	}

	private _handleUndoRedo(): void {
		// The edited sequence was removed: display the sequences.
		if (this.state.sequence && !this.cinematic.sequences.includes(this.state.sequence)) {
			this.stop();
			this.inspector.setEditedObject(null, null);

			return this.setState({ sequence: null, hoverTrack: null, selectedTrack: null, currentTime: 0 }, () => {
				this.forceUpdate();
			});
		}

		this.forceUpdate();
	}

	public forceUpdate(): void {
		super.forceUpdate();
		this.tracks.forceUpdate();
		this.timelines.forceUpdate();
		this.curves.forceUpdate();
		this.sequences?.forceUpdate();
	}

	/**
	 * Opens the given sequence to edit its tracks. The tracker keeps its position when it is in the sequence, otherwise
	 * it goes to the start of the sequence.
	 * @param sequence defines the reference to the sequence to edit.
	 */
	public editSequence(sequence: ICinematicSequence): void {
		this.stop();

		const time = this.getCinematicFrame(this.state.currentTime);
		const startFrame = getCinematicSequenceStartFrame(this.cinematic, sequence);
		const framesCount = getCinematicSequenceFramesCount(sequence);

		const inSequence = time >= startFrame && time <= startFrame + framesCount;

		this.inspector.setEditedObject(null, null);

		this.setState(
			{
				sequence,
				hoverTrack: null,
				selectedTrack: null,
				currentTime: inSequence ? time - startFrame : 0,
			},
			() => {
				if (!inSequence) {
					this.updateTracksAtCurrentTime();
				}

				this.forceUpdate();
			}
		);
	}

	/**
	 * Closes the edited sequence and displays the sequences of the cinematic.
	 */
	public closeSequence(): void {
		const sequence = this.state.sequence;
		if (!sequence) {
			return;
		}

		this.stop();

		const startFrame = getCinematicSequenceStartFrame(this.cinematic, sequence);
		const framesCount = getCinematicSequenceFramesCount(sequence);

		this.inspector.setEditedObject(null, null);

		this.setState(
			{
				sequence: null,
				hoverTrack: null,
				selectedTrack: null,
				currentTime: startFrame + Math.min(this.state.currentTime, framesCount),
			},
			() => {
				this.sequences?.setState({ selectedSequence: sequence });
				this.forceUpdate();
			}
		);
	}

	/**
	 * Returns the frame, in the whole cinematic, where the tracker is when it is at the given time. In a sequence, the
	 * time is relative to the start of the sequence: after the end of the sequence, the tracker shows its last frame, not
	 * the next sequence.
	 * @param time defines the time of the tracker.
	 */
	public getCinematicFrame(time: number): number {
		const sequence = this.state.sequence;
		if (!sequence) {
			return time;
		}

		const startFrame = getCinematicSequenceStartFrame(this.cinematic, sequence);
		const endFrame = startFrame + getCinematicSequenceFramesCount(sequence);

		// The end of a sequence is the start of the next one: stay just before.
		if (endFrame < getCinematicFramesCount(this.cinematic)) {
			return Math.min(startFrame + time, Math.max(startFrame, endFrame - 0.001));
		}

		return startFrame + time;
	}

	/**
	 * Returns the last frame the tracker can be played to: the end of the edited sequence or the end of the cinematic.
	 */
	public getMaxFrame(): number {
		return this.state.sequence ? getCinematicSequenceFramesCount(this.state.sequence) : getCinematicFramesCount(this.cinematic);
	}

	public setCurrentTime(time: number): void {
		this.stop();

		const frame = this.getCinematicFrame(time);

		const group = this.createTemporaryAnimationGroup();
		group.start(false);
		group.goToFrame(frame);
		group.pause();

		syncAnimationGroupsToFrame(frame, this.cinematic, {
			pauseAfterSync: true,
		});

		this.editor.layout.preview.scene.lights.forEach((light) => {
			updateLightShadowMapRefreshRate(light);
		});

		if (time !== this.state.currentTime) {
			this.setState({
				currentTime: time,
			});
		}
	}

	/**
	 * Updates the scene to show the cinematic, as edited, at the current time.
	 */
	public updateTracksAtCurrentTime(): void {
		this.disposeTemporaryAnimationGroup();
		this.setCurrentTime(this.state.currentTime);
		this.disposeTemporaryAnimationGroup();
	}

	public prepareTemporaryAnimationGroup(): void {
		setDefaultRenderingPipelineRef(getDefaultRenderingPipeline() as any);
		setSSAO2RenderingPipelineRef(getSSAO2RenderingPipeline() as any);
		setSSRRenderingPipelineRef(getSSRRenderingPipeline() as any);
		setMotionBlurPostProcessRef(getMotionBlurPostProcess() as any);
		setVLSPostProcessRef(getVLSPostProcess() as any);
	}

	public createTemporaryAnimationGroup(): AnimationGroup {
		this.prepareTemporaryAnimationGroup();

		const scene = this.props.editor.layout.preview.scene;

		this._temporaryAnimationGroup ??= generateCinematicAnimationGroup(this.cinematic, scene as any) as any;

		if (this._temporaryAnimationGroup) {
			const index = scene.animationGroups.indexOf(this._temporaryAnimationGroup);
			if (index !== -1) {
				scene.animationGroups.splice(index, 1);
			}
		}

		return this._temporaryAnimationGroup!;
	}

	public disposeTemporaryAnimationGroup(): void {
		this._temporaryAnimationGroup?.dispose();
		this._temporaryAnimationGroup = null;
	}

	public play(): void {
		const tracksCount = this.state.sequence?.tracks.length ?? this.cinematic.sequences.reduce((count, sequence) => count + sequence.tracks.length, 0);

		if (this.state.playing || !tracksCount) {
			return;
		}

		const scene = this.props.editor.layout.preview.scene;
		const engine = this.props.editor.layout.preview.engine;

		saveSceneState(scene);

		this.setState({
			playing: true,
		});

		this._currentTimeBeforePlay = this.state.currentTime;

		const currentTime = this.state.currentTime;
		const maxFrame = this.getMaxFrame();

		this._playAnimation ??= new Animation("editor-currentTime", "_animatedCurrentTime", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
		this._playAnimation.setKeys([
			{ frame: currentTime, value: currentTime },
			{ frame: maxFrame, value: maxFrame },
		]);

		const frame = this.getCinematicFrame(Math.min(currentTime, maxFrame));
		const endFrame = this.getCinematicFrame(maxFrame);

		// In a sequence followed by other sequences, only the sequence is played.
		const group = this.createTemporaryAnimationGroup();
		group.start(false, 1.0, frame, endFrame < getCinematicFramesCount(this.cinematic) ? endFrame : undefined);

		syncSoundsToFrame(frame, this.cinematic);
		syncAnimationGroupsToFrame(frame, this.cinematic, {
			pauseAfterSync: false,
		});

		scene.beginDirectAnimation(this, [this._playAnimation], currentTime, maxFrame, false, 1.0);

		engine.maxFPS = this.cinematic.outputFramesPerSecond;

		if (this._playRenderLoop) {
			engine.stopRenderLoop(this._playRenderLoop);
		}

		engine.runRenderLoop(
			(this._playRenderLoop = () => {
				this.curves.tracker.setForcedCurrentTime(this._animatedCurrentTime);
				this.timelines.tracker.setForcedCurrentTime(this._animatedCurrentTime);
				this.sequences?.tracker?.setForcedCurrentTime(this._animatedCurrentTime);
			})
		);
	}

	public stop(): void {
		if (!this.state.playing) {
			return;
		}

		this.curves.tracker.setForcedCurrentTime(null);
		this.timelines.tracker.setForcedCurrentTime(null);
		this.sequences?.tracker?.setForcedCurrentTime(null);

		this.setState({
			playing: false,
		});

		const engine = this.props.editor.layout.preview.engine;
		engine.maxFPS = undefined;

		if (this._playRenderLoop) {
			engine.stopRenderLoop(this._playRenderLoop);
			this._playRenderLoop = null;
		}

		// Stop all sounds
		this.cinematic.sequences.forEach((sequence) => {
			sequence.tracks.forEach((track) => {
				track.sound?.stop();
			});
		});

		restoreSceneState();

		if (this._currentTimeBeforePlay !== null) {
			const time = this._currentTimeBeforePlay;

			this._currentTimeBeforePlay = null;
			this.setCurrentTime(time);
		}

		this.disposeTemporaryAnimationGroup();
	}

	public async save(): Promise<void> {
		const data = serializeCinematic(this.cinematic);

		await writeJSON(this.props.absolutePath, data, {
			spaces: "\t",
			encoding: "utf-8",
		});

		toast.success("Cinematic file saved.");
	}

	public async saveAs(): Promise<void> {
		const destination = saveSingleFileDialog({
			title: "Save Cinematic File",
			filters: [{ name: "Cinematic Files", extensions: ["cinematic"] }],
		});

		if (!destination) {
			return;
		}

		const data = serializeCinematic(this.cinematic);

		await writeJSON(destination, data, {
			spaces: "\t",
			encoding: "utf-8",
		});

		toast.success("Cinematic file saved.");
	}

	public openRenderDialog(renderType: RenderType): void {
		this._renderDialog.open();
		this.setState({ renderType });
	}

	public renderCinematic(from: number, to: number): void {
		this._renderDialog.close();

		this._renderer.renderCinematic({
			from,
			to,
			type: this.state.renderType,
		});
	}
}
