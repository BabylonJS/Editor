import { writeJSON } from "fs-extra";

import { Component, ReactNode } from "react";

import { toast } from "sonner";

import { Observer, AnimationGroup, Animation } from "babylonjs";
import {
	generateCinematicAnimationGroup,
	ICinematic,
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

import { CinematicEditorTimelineOptions } from "./timelines/options";

import { RenderType } from "./render/render";
import { CinematicEditorRenderer } from "./render/renderer";
import { CinematicEditorRenderDialog } from "./render/dialog";

import { CinematicEditorTracks } from "./tracks";
import { CinematicEditorCurves } from "./curves";
import { CinematicEditorToolbar } from "./toolbar";
import { CinematicEditorTimelines } from "./timelines";
import { CinematicEditorInspector } from "./inspector";

export interface ICinematicEditorProps {
	editor: Editor;
	absolutePath: string;
	cinematic: ICinematic;
}

export interface ICinematicEditorState {
	scale: number;
	currentTime: number;

	editType: "keyframes" | "curves";

	hoverTrack: ICinematicTrack | null;
	selectedTrack: ICinematicTrack | null;

	playing: boolean;
	renderType: RenderType;
}

export class CinematicEditor extends Component<ICinematicEditorProps, ICinematicEditorState> {
	/**
	 * Defines the reference to the tracks panel used to display and edit the cinematic tracks.
	 */
	public tracks: CinematicEditorTracks;
	/**
	 * Defines the reference to the timelines panel used to display and edit the cinematic timelines.
	 */
	public timelines: CinematicEditorTimelines;
	/**
	 * Defines the reference to the curves panel used to edit animation curves in selected track.
	 */
	public curves: CinematicEditorCurves;
	/**
	 * Defines the reference to the inspector used to display and edit the cinematic properties.
	 */
	public inspector: CinematicEditorInspector;

	/**
	 * Defines the reference to the editor instance that owns this cinematic editor.
	 */
	public readonly editor: Editor;
	/**
	 * Defines the reference to the cinematic object being edited.
	 */
	public readonly cinematic: ICinematic;

	private _renderer: CinematicEditorRenderer;
	private _renderDialog: CinematicEditorRenderDialog;

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
			scale: 1,
			currentTime: 0,

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

				<div className="flex flex-1 overflow-hidden">
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
								<CinematicEditorTracks cinematicEditor={this} ref={(ref) => (this.tracks = ref!)} />

								<CinematicEditorTimelines
									ref={(ref) => (this.timelines = ref!)}
									cinematicEditor={this}
									scale={this.state.scale}
									currentTime={this.state.currentTime}
								/>
								<CinematicEditorCurves
									ref={(ref) => (this.curves = ref!)}
									cinematicEditor={this}
									scale={this.state.scale}
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
			this.forceUpdate();
		});

		this._redoObserver = onRedoObservable.add(() => {
			this.forceUpdate();
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

	public forceUpdate(): void {
		super.forceUpdate();
		this.tracks.forceUpdate();
		this.timelines.forceUpdate();
		this.curves.forceUpdate();
	}

	public setCurrentTime(time: number): void {
		this.stop();

		const group = this.createTemporaryAnimationGroup();
		group.start(false);
		group.goToFrame(time);
		group.pause();

		this.editor.layout.preview.scene.lights.forEach((light) => {
			updateLightShadowMapRefreshRate(light);
		});

		if (time !== this.state.currentTime) {
			this.setState({
				currentTime: time,
			});
		}
	}

	public updateTracksAtCurrentTime(): void {
		this.setCurrentTime(this.state.currentTime);
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
		if (this.state.playing || !this.cinematic.tracks.length) {
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
		const maxFrame = this.timelines.getMaxWidthForTimelines() / this.state.scale;

		this._playAnimation ??= new Animation("editor-currentTime", "_animatedCurrentTime", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
		this._playAnimation.setKeys([
			{ frame: currentTime, value: currentTime },
			{ frame: maxFrame, value: maxFrame },
		]);

		const frame = Math.min(currentTime, maxFrame);

		const group = this.createTemporaryAnimationGroup();
		group.start(false, 1.0, frame);

		// Start all sounds that were created before the current frame
		this.cinematic.tracks.forEach((track) => {
			track.sounds?.forEach((sound) => {
				const endFrame = sound.frame + (sound.endFrame - sound.startFrame);
				if (sound.frame > frame || endFrame < frame) {
					return;
				}

				const frameDiff = frame - sound.frame;

				if (frameDiff > 0) {
					const offset = frameDiff / this.cinematic.framesPerSecond;
					track.sound?.play(0, offset);
				}
			});
		});

		scene.beginDirectAnimation(this, [this._playAnimation], currentTime, maxFrame, false, 1.0);

		if (this._playRenderLoop) {
			engine.stopRenderLoop(this._playRenderLoop);
		}

		engine.runRenderLoop(
			(this._playRenderLoop = () => {
				this.setState({
					currentTime: this._animatedCurrentTime,
				});

				scene.lights.forEach((light) => {
					updateLightShadowMapRefreshRate(light);
				});
			})
		);
	}

	public stop(): void {
		if (!this.state.playing) {
			return;
		}

		this.setState({
			playing: false,
		});

		const engine = this.props.editor.layout.preview.engine;

		if (this._playRenderLoop) {
			engine.stopRenderLoop(this._playRenderLoop);
			this._playRenderLoop = null;
		}

		// Stop all sounds
		this.cinematic.tracks.forEach((track) => {
			track.sound?.stop();
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
