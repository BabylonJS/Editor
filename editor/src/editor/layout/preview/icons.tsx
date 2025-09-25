import { Component, ReactNode } from "react";

import { HiSpeakerWave } from "react-icons/hi2";
import { FaCamera, FaLightbulb } from "react-icons/fa";

import { Mesh, Node, Scene, Vector2, Sound, Vector3 } from "babylonjs";

import { Editor } from "../../main";

import { isSound } from "../../../tools/guards/sound";
import { isNodeLocked } from "../../../tools/node/metadata";
import { projectVectorOnScreen } from "../../../tools/maths/projection";
import { isCamera, isEditorCamera, isLight, isNode } from "../../../tools/guards/nodes";

export interface IEditorPreviewIconsProps {
	editor: Editor;
}

export interface IEditorPreviewIconsState {
	buttons: _IButtonData[];
}

interface _IButtonData {
	position: Vector2;
	node: Node | Sound;
}

export class EditorPreviewIcons extends Component<IEditorPreviewIconsProps, IEditorPreviewIconsState> {
	private _tempMesh: Mesh | null = null;
	private _renderFunction: (() => void) | null = null;

	public constructor(props: IEditorPreviewIconsProps) {
		super(props);

		this.state = {
			buttons: [],
		};
	}

	public render(): ReactNode {
		return (
			<div hidden={this.props.editor.layout.preview?.play?.state.playing} className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
				{this.state.buttons.map((button) => (
					<div
						key={button.node.id}
						style={{
							top: `${button.position.y}px`,
							left: `${button.position.x}px`,
						}}
						onContextMenu={() => {
							if (isNode(button.node)) {
								this.props.editor.layout.preview.setState({
									rightClickedObject: button.node,
								});
							}
						}}
						onClick={() => {
							if (isCamera(button.node)) {
								this.props.editor.layout.preview.setCameraPreviewActive(button.node);
							}

							this.props.editor.layout.graph.setSelectedNode(button.node);
							this.props.editor.layout.inspector.setEditedObject(button.node);

							if (isNode(button.node)) {
								this.props.editor.layout.preview.gizmo.setAttachedNode(button.node);
							}
						}}
						className={`
							absolute w-16 h-16 rounded-lg -translate-x-1/2 hover:bg-black/20 transition-colors duration-300
							${isNode(button.node) && isNodeLocked(button.node) ? "pointer-events-none" : "pointer-events-auto"}	
						`}
					>
						{this._getIcon(button.node)}
					</div>
				))}
			</div>
		);
	}

	public componentWillUnmount(): void {
		this.stop();
	}

	/**
	 * Gets wether or not icons are enabled.
	 */
	public get enabled(): boolean {
		return this._renderFunction !== null;
	}

	/**
	 * Starts rendering icons on the preview scene.
	 */
	public start(): void {
		const scene = this.props.editor.layout.preview.scene;

		if (this._renderFunction || !scene) {
			return;
		}

		this._tempMesh?.dispose(true, true);

		this._tempMesh = new Mesh("editor-preview-icons-temp-node", this.props.editor.layout.preview.scene);
		this._tempMesh._removeFromSceneRootNodes();
		this.props.editor.layout.preview.scene.meshes.pop();

		const buttons: _IButtonData[] = [];

		scene.getEngine().runRenderLoop(
			(this._renderFunction = () => {
				buttons.splice(0, buttons.length);

				scene.lights.forEach((light) => {
					if (!this._isInFrustrum(light.getAbsolutePosition(), scene)) {
						return;
					}

					buttons.push({
						node: light,
						position: projectVectorOnScreen(light.getAbsolutePosition(), scene),
					});
				});

				scene.cameras.forEach((camera) => {
					if (isEditorCamera(camera) || camera === scene.activeCamera) {
						return;
					}

					if (!this._isInFrustrum(camera.computeWorldMatrix().getTranslation(), scene) || this.props.editor.layout.preview.gizmo.attachedNode === camera) {
						return;
					}

					buttons.push({
						node: camera,
						position: projectVectorOnScreen(camera.computeWorldMatrix().getTranslation(), scene),
					});
				});

				scene.soundTracks?.forEach((soundtrack) => {
					soundtrack.soundCollection.forEach((sound) => {
						const attachedNode = sound["_connectedTransformNode"];

						if (!sound.spatialSound || !attachedNode) {
							return;
						}

						if (!this._isInFrustrum(sound["_connectedTransformNode"].getAbsolutePosition(), scene)) {
							return;
						}

						buttons.push({
							node: sound as any,
							position: projectVectorOnScreen(sound["_connectedTransformNode"].computeWorldMatrix().getTranslation(), scene),
						});
					});
				});

				this.setState({ buttons });
			})
		);
	}

	private _isInFrustrum(absolutePosition: Vector3, scene: Scene): boolean {
		if (this._tempMesh && scene.activeCamera) {
			this._tempMesh.setAbsolutePosition(absolutePosition);
		}

		this._tempMesh!.computeWorldMatrix(true);
		return scene.activeCamera!.isInFrustum(this._tempMesh!);
	}

	/**
	 * Stops rendering icons on the preview scene.
	 */
	public stop(): void {
		if (this._renderFunction) {
			this.props.editor.layout.preview.engine.stopRenderLoop(this._renderFunction);
		}

		this._renderFunction = null;

		this.setState({
			buttons: [],
		});
	}

	private _getIcon(node: Node | Sound): ReactNode {
		if (isLight(node)) {
			return <FaLightbulb color="white" stroke="black" strokeWidth={0.35} className="w-full h-full" />;
		}

		if (isCamera(node)) {
			return <FaCamera color="white" stroke="black" strokeWidth={0.1} className="w-full h-full" />;
		}

		if (isSound(node)) {
			return <HiSpeakerWave color="white" stroke="black" strokeWidth={0.1} className="w-full h-full" />;
		}
	}
}
