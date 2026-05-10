import { extname, join } from "path/posix";

import { Component, ReactNode } from "react";
import { HiSpeakerWave } from "react-icons/hi2";

import { Observer, Node, SoundState } from "babylonjs";

import { Button } from "../../../../ui/shadcn/ui/button";

import { getProjectAssetsRootUrl } from "../../../../project/configuration";

import { isSoundNode } from "../../../../tools/guards/sound";
import { onNodeModifiedObservable, onSelectedAssetChanged } from "../../../../tools/observables";

import { onGizmoNodeChangedObservable } from "../../preview/gizmo/gizmo";

import { SoundNode } from "../../../nodes/sound";

import { EditorInspectorListField } from "../fields/list";
import { EditorInspectorStringField } from "../fields/string";
import { EditorInspectorVectorField } from "../fields/vector";
import { EditorInspectorNumberField } from "../fields/number";
import { EditorInspectorSwitchField } from "../fields/switch";
import { EditorInspectorSectionField } from "../fields/section";

import { ScriptInspectorComponent } from "../script/script";

import { EditorTransformNodeInspector } from "../transform";

import { IEditorInspectorImplementationProps } from "../inspector";

const supportedSoundExtensions = [".mp3", ".ogg", ".wav"];

export interface IEditorSoundNodeInspectorState {
	dragOver: boolean;
}

export class EditorSoundNodeInspector extends Component<IEditorInspectorImplementationProps<SoundNode>, IEditorSoundNodeInspectorState> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: unknown): boolean {
		return isSoundNode(object);
	}

	public constructor(props: IEditorInspectorImplementationProps<SoundNode>) {
		super(props);

		this.state = {
			dragOver: false,
		};
	}

	private _gizmoObserver: Observer<Node> | null = null;

	public componentDidMount(): void {
		this._gizmoObserver = onGizmoNodeChangedObservable.add((node) => {
			if (node === this.props.object) {
				this.props.editor.layout.inspector.forceUpdate();
			}
		});
	}

	public componentWillUnmount(): void {
		if (this._gizmoObserver) {
			onGizmoNodeChangedObservable.remove(this._gizmoObserver);
		}

		this.props.object.sound?.stop();
	}

	public render(): ReactNode {
		return (
			<>
				<EditorInspectorSectionField title="Common">
					<EditorInspectorStringField
						object={this.props.object}
						property="name"
						label="Name"
						onChange={() => onNodeModifiedObservable.notifyObservers(this.props.object)}
					/>
				</EditorInspectorSectionField>

				<EditorInspectorSectionField title="Transforms">
					<EditorInspectorVectorField label={<div className="w-14">Position</div>} object={this.props.object} property="position" />
					{EditorTransformNodeInspector.GetRotationInspector(this.props.object)}
					<EditorInspectorVectorField label={<div className="w-14">Scaling</div>} object={this.props.object} property="scaling" />
				</EditorInspectorSectionField>

				<ScriptInspectorComponent editor={this.props.editor} object={this.props.object} />

				<EditorInspectorSectionField title="Sound">
					{this._getSoundDraggableZone()}
					{this.props.object.sound && this._getSoundInspector()}
				</EditorInspectorSectionField>
			</>
		);
	}

	private _getSoundInspector(): ReactNode {
		const sound = this.props.object.sound;
		if (!sound) {
			return;
		}

		const isPlaying = this.props.object.sound?.state === SoundState.Started;

		return (
			<>
				<Button variant={isPlaying ? "default" : "secondary"} onClick={() => (isPlaying ? this._handleStop() : this._handlePlay())}>
					{isPlaying ? "Stop" : "Play"}
				</Button>

				<EditorInspectorNumberField object={this.props.object} property="volume" label="Volume" step={0.01} min={0} max={1} />
				<EditorInspectorSwitchField object={this.props.object} property="isSpatial" label="Spatial" onChange={() => this.forceUpdate()} />

				{this.props.object.isSpatial && sound.spatial && (
					<>
						<EditorInspectorListField
							object={this.props.object}
							property="distanceModel"
							label="Distance Model"
							items={[
								{ text: "Linear", value: "linear" },
								{ text: "Inverse", value: "inverse" },
								{ text: "Exponential", value: "exponential" },
							]}
						/>

						<EditorInspectorListField
							label="Panning Model"
							object={this.props.object}
							property="panningModel"
							items={[
								{ text: "HRTF", value: "HRTF" },
								{ text: "Equal Power", value: "equalpower" },
							]}
						/>

						<EditorInspectorNumberField object={this.props.object} property="maxDistance" min={0} max={100000000} step={1} label="Max Distance" />
					</>
				)}
			</>
		);
	}

	private _handlePlay(): void {
		this.props.object.sound?.stop();
		this.props.object.sound?.play({
			loop: true,
		});

		this.forceUpdate();
	}

	private _handleStop(): void {
		this.props.object.sound?.stop();
		this.forceUpdate();
	}

	private _getSoundDraggableZone(): ReactNode {
		return (
			<div
				onDragOver={(ev) => {
					ev.preventDefault();
					this.setState({
						dragOver: true,
					});
				}}
				onDragLeave={(ev) => {
					ev.preventDefault();
					this.setState({
						dragOver: false,
					});
				}}
				onDrop={async (ev) => {
					ev.preventDefault();
					this.setState({
						dragOver: false,
					});

					const path = JSON.parse(ev.dataTransfer.getData("assets"))[0];
					const extension = extname(path).toLowerCase();

					if (supportedSoundExtensions.includes(extension)) {
						await this.props.object.setSoundAbsolutePath(path);
						this.forceUpdate();
					}
				}}
				className={`
                    flex flex-col gap-4 justify-center items-center p-2 rounded-lg
                    border-[1px] border-secondary-foreground/35 border-dashed
                    ${this.state.dragOver ? "bg-muted-foreground/75 dark:bg-muted-foreground/20" : ""}
                    transition-all duration-300 ease-in-out
                `}
			>
				<HiSpeakerWave size="64px" className="opacity-50" />
				<div className="flex flex-col items-center">
					{!this.props.object.soundRelativePath && <div>No Sound file assigned yet.</div>}
					{this.props.object.soundRelativePath && (
						<div
							className="hover:underline underline-offset-2"
							onClick={() => onSelectedAssetChanged.notifyObservers(join(getProjectAssetsRootUrl()!, this.props.object.soundRelativePath!))}
						>
							{this.props.object.soundRelativePath}
						</div>
					)}
					{!this.props.object.sound && <div className="font-semibold text-muted-foreground">Drag'n'drop a Sound file here from the Assets Browser.</div>}
				</div>
			</div>
		);
	}
}
