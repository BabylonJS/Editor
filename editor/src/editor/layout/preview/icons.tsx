import { Component, ReactNode } from "react";

import { HiSpeakerWave } from "react-icons/hi2";
import { FaCamera, FaLightbulb } from "react-icons/fa";

import { Mesh, Node, Scene, Vector3, Ray, Camera, Observer } from "babylonjs";

import { Editor } from "../../main";

import { isSoundNode } from "../../../tools/guards/sound";
import { isNodeLocked } from "../../../tools/node/metadata";
import { projectVectorOnScreen } from "../../../tools/maths/projection";
import { isCamera, isEditorCamera, isLight, isNode } from "../../../tools/guards/nodes";

interface _IButtonData {
	node: Node;
	absolutePosition: Vector3;
}

export interface IEditorPreviewIconsProps {
	editor: Editor;
}

export interface IEditorPreviewIconsState {
	buttons: _IButtonData[];
}

export class EditorPreviewIcons extends Component<IEditorPreviewIconsProps, IEditorPreviewIconsState> {
	private _tempMesh: Mesh | null = null;
	private _renderFunction: (() => void) | null = null;

	private _iconsRefs: (HTMLDivElement | null)[] = [];

	private _cameraViewMatrixObserver: Observer<Camera> | null = null;

	public constructor(props: IEditorPreviewIconsProps) {
		super(props);

		this.state = {
			buttons: [],
		};
	}

	public render(): ReactNode {
		return (
			<div hidden={this.props.editor.layout.preview?.play?.state.playing} className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
				{this.state.buttons.map((data, index) => (
					<div
						key={data.node.id}
						ref={(ref) => {
							if (ref) {
								setTimeout(() => {
									ref.style.opacity = "1";
									this._configureDivStyle(ref, data.absolutePosition, this.props.editor.layout.preview.scene);
								}, 0);
							}
							this._iconsRefs[index] = ref;
						}}
						className={`
							absolute w-16 h-16 rounded-lg -translate-x-1/2 -translate-y-1/2 hover:bg-black/20 opacity-0
							${isNode(data.node) && isNodeLocked(data.node) ? "pointer-events-none" : "pointer-events-auto"}
							transition-opacity duration-300 ease-in-out
						`}
						onContextMenu={(event) => {
							this._onNodeClicked(data.node, event.shiftKey);
							this.props.editor.layout.preview.setState({
								rightClickedObject: data.node,
							});
						}}
						onClick={(event) => this._onNodeClicked(data.node, event.shiftKey)}
					>
						{this._getIcon(data.node)}
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

		let lastTime = 0;
		let buttons: _IButtonData[] = [];

		let cameraDirty = true;
		let camera: Camera | null = null;

		scene.getEngine().runRenderLoop(
			(this._renderFunction = () => {
				if (!this.props.editor.layout.preview.renderScene) {
					return;
				}

				if (scene.activeCamera && camera !== scene.activeCamera) {
					camera = scene.activeCamera;

					this._cameraViewMatrixObserver?.remove();
					this._cameraViewMatrixObserver = camera.onViewMatrixChangedObservable.add(() => (cameraDirty = true));
				}

				if (!cameraDirty) {
					return;
				}

				lastTime += scene.deltaTime;

				const shouldUpdate = lastTime >= 1000;
				if (shouldUpdate) {
					buttons = [];
					lastTime = 0;

					if (camera) {
						cameraDirty = false;
					}

					// Collect data
					scene.lights.forEach((light) => {
						buttons.push({ node: light, absolutePosition: light.getAbsolutePosition() });
					});

					this.props.editor.layout.preview.clusteredLightContainer.lights.forEach((light) => {
						buttons.push({ node: light, absolutePosition: light.getAbsolutePosition() });
					});

					scene.cameras.forEach((camera) => {
						if (!isEditorCamera(camera) && camera !== scene.activeCamera) {
							buttons.push({ node: camera, absolutePosition: camera.computeWorldMatrix().getTranslation() });
						}
					});

					scene.transformNodes.forEach((node) => {
						if (isSoundNode(node) && node.sound && node.isSpatial) {
							buttons.push({ node: node, absolutePosition: node.getAbsolutePosition() });
						}
					});

					this._iconsRefs = new Array(buttons.length);

					buttons = buttons.filter((data) => {
						return this._isInFrustrum(data.absolutePosition, scene, true);
					});

					this.setState({
						buttons,
					});
				}

				buttons.forEach((data, index) => {
					const divRef = this._iconsRefs[index];
					if (divRef) {
						this._configureDivStyle(divRef, data.absolutePosition, scene);
					}
				});
			})
		);
	}

	private _configureDivStyle(divRef: HTMLDivElement, absolutePosition: Vector3, scene: Scene): void {
		divRef.style.display = this._isInFrustrum(absolutePosition, scene, false) ? "block" : "none";

		const pos2d = projectVectorOnScreen(absolutePosition, scene);
		divRef.style.top = `${pos2d.y}px`;
		divRef.style.left = `${pos2d.x}px`;
	}

	private _onNodeClicked(node: Node, shiftKey: boolean): void {
		if (shiftKey) {
			this.props.editor.layout.graph.addToSelectedNodes(node);
		} else {
			this.props.editor.layout.graph.setSelectedNode(node);
			if (isCamera(node)) {
				this.props.editor.layout.preview.setCameraPreviewActive(node);
			}
		}

		this.props.editor.layout.inspector.setEditedObject(node);

		if (isNode(node)) {
			this.props.editor.layout.preview.gizmo.setAttachedObject(node);
		}
	}

	private _isInFrustrum(absolutePosition: Vector3, scene: Scene, performPick: boolean): boolean {
		if (!this._tempMesh || !scene.activeCamera) {
			return false;
		}

		this._tempMesh.setAbsolutePosition(absolutePosition);
		this._tempMesh.computeWorldMatrix(true);

		const isInFrustrum = scene.activeCamera.isInFrustum(this._tempMesh);

		if (performPick) {
			const ray = Ray.CreateNewFromTo(scene.activeCamera.globalPosition, absolutePosition);
			const pickInfo = scene.pickWithRay(ray, (mesh) => scene.activeCamera!.isInFrustum(mesh) && this.props.editor.layout.preview._pickingMeshPredicate(mesh), false);

			if (pickInfo?.pickedPoint) {
				const distance = Vector3.Distance(scene.activeCamera!.globalPosition, absolutePosition);
				const pickDistance = Vector3.Distance(scene.activeCamera!.globalPosition, pickInfo.pickedPoint);

				if (pickDistance < distance - 1) {
					return false;
				}
			}
		}

		return isInFrustrum;
	}

	/**
	 * Stops rendering icons on the preview scene.
	 */
	public stop(): void {
		if (this._renderFunction) {
			this.props.editor.layout.preview.engine.stopRenderLoop(this._renderFunction);
		}

		this._cameraViewMatrixObserver?.remove();
		this._cameraViewMatrixObserver = null;

		this._renderFunction = null;

		this.setState({
			buttons: [],
		});
	}

	private _getIcon(node: Node): ReactNode {
		if (isLight(node)) {
			return <FaLightbulb color="white" stroke="black" strokeWidth={0.35} className="w-full h-full" />;
		}

		if (isCamera(node)) {
			return <FaCamera color="white" stroke="black" strokeWidth={0.1} className="w-full h-full" />;
		}

		if (isSoundNode(node)) {
			return <HiSpeakerWave color="white" stroke="black" strokeWidth={0.1} className="w-full h-full" />;
		}
	}
}
