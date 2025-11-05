import { Component, ReactNode } from "react";

import {
	Scene,
	ArcRotateCamera,
	Vector3,
	Viewport,
	TransformNode,
	Quaternion,
	Color3,
	MeshBuilder,
	StandardMaterial,
	AbstractMesh,
	PointerEventTypes,
	Vector2,
	Mesh,
	FreeCamera,
} from "babylonjs";

import { waitUntil } from "../../../tools/tools";
import { Tween } from "../../../tools/animation/tween";
import { isArcRotateCamera } from "../../../tools/guards/nodes";
import { projectVectorOnScreen } from "../../../tools/maths/projection";

import { Editor } from "../../main";

export interface IEditorPreviewAxisHelperProps {
	editor: Editor;
}

export interface IEditorPreviewAxisHelperState {
	xLabelPosition: Vector2;
	yLabelPosition: Vector2;
	zLabelPosition: Vector2;
}

export class EditorPreviewAxisHelper extends Component<IEditorPreviewAxisHelperProps, IEditorPreviewAxisHelperState> {
	public scene: Scene | null = null;

	/** @internal */
	public _axisMeshUnderPointer: AbstractMesh | null = null;

	private _axisClickableMeshes: AbstractMesh[] = [];

	public constructor(props: IEditorPreviewAxisHelperProps) {
		super(props);

		this.state = {
			xLabelPosition: Vector2.Zero(),
			yLabelPosition: Vector2.Zero(),
			zLabelPosition: Vector2.Zero(),
		};
	}

	public render(): ReactNode {
		return (
			<div hidden={this.props.editor.layout.preview?.state.fixedDimensions !== "fit"}>
				<div
					className="absolute text-black/50 text-xs font-semibold -translate-x-1/2 -translate-y-1/2 pointer-events-none"
					style={{
						top: `calc(100% - calc(164px - ${this.state.xLabelPosition.y}px))`,
						left: `${this.state.xLabelPosition.x}px`,
					}}
				>
					X
				</div>

				<div
					className="absolute text-black/50 text-xs font-semibold -translate-x-1/2 -translate-y-1/2 pointer-events-none"
					style={{
						top: `calc(100% - calc(164px - ${this.state.yLabelPosition.y}px))`,
						left: `${this.state.yLabelPosition.x}px`,
					}}
				>
					Y
				</div>

				<div
					className="absolute text-black/50 text-xs font-semibold -translate-x-1/2 -translate-y-1/2 pointer-events-none"
					style={{
						top: `calc(100% - calc(164px - ${this.state.zLabelPosition.y}px))`,
						left: `${this.state.zLabelPosition.x}px`,
					}}
				>
					Z
				</div>
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
		return this.scene !== null;
	}

	public async stop(): Promise<void> {
		this.scene?.dispose();
		this.scene = null;
	}

	public async start(): Promise<void> {
		await waitUntil(() => this.props.editor.layout.preview?.scene);

		this.scene = new Scene(this.props.editor.layout.preview.engine!);
		this.scene.autoClear = false;

		const camera = new ArcRotateCamera("cam", Math.PI * -0.5, Math.PI * 0.5, 3.5, Vector3.Zero(), this.scene);
		camera.orthoTop = 1;
		camera.orthoBottom = -1;
		camera.orthoLeft = -1;
		camera.orthoRight = 1;
		camera.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;

		const dummy = new TransformNode("dummy", this.scene);
		dummy.rotationQuaternion = Quaternion.Identity();

		const xSphere = this._createAxis(dummy, Color3.FromHexString("#ff4466"), new Vector3(0, 0, -Math.PI / 2), new Vector3(0.25, 0, 0));
		const ySphere = this._createAxis(dummy, Color3.FromHexString("#88ff44"), Vector3.Zero(), new Vector3(0, 0.25, 0));
		const zSphere = this._createAxis(dummy, Color3.FromHexString("#4488ff"), new Vector3(Math.PI / 2, 0, 0), new Vector3(0, 0, 0.25));

		this._createNegativeAlphaSphere(dummy, new Vector3(-0.25, 0, 0));
		this._createNegativeAlphaSphere(dummy, new Vector3(0, -0.25, 0));
		this._createNegativeAlphaSphere(dummy, new Vector3(0, 0, -0.25));

		const absoluteSize = 164 * devicePixelRatio;
		const engine = this.props.editor.layout.preview.engine!;

		this.scene.onBeforeRenderObservable.add(() => {
			const activeCamera = this.props.editor.layout.preview?.scene.activeCamera;
			if (activeCamera) {
				dummy.rotationQuaternion!.copyFrom(activeCamera.absoluteRotation.invert());
			}

			const width = absoluteSize / engine.getRenderWidth();
			const height = absoluteSize / engine.getRenderHeight();

			camera.viewport = new Viewport(1 - width, 0, width, height);

			this.setState({
				xLabelPosition: projectVectorOnScreen(xSphere.computeWorldMatrix(true).getTranslation(), this.scene!),
				yLabelPosition: projectVectorOnScreen(ySphere.computeWorldMatrix(true).getTranslation(), this.scene!),
				zLabelPosition: projectVectorOnScreen(zSphere.computeWorldMatrix(true).getTranslation(), this.scene!),
			});

			this._checkAxisUnderPointer();
		});

		this.scene.onPointerObservable.add((pointerInfo) => {
			switch (pointerInfo.type) {
				case PointerEventTypes.POINTERTAP:
					this._handlePointerTap(pointerInfo.event as MouseEvent);
					break;
			}
		});
	}

	private _checkAxisUnderPointer(): void {
		const pick = this.scene!.pick(this.scene!.pointerX, this.scene!.pointerY, (mesh) => mesh.metadata?.axis, false);

		if (pick.pickedMesh !== this._axisMeshUnderPointer) {
			Tween.create(this._axisMeshUnderPointer, 0.35, {
				killAllTweensOfTarget: true,
				scaling: new Vector3(1, 1, 1),
			});

			this._axisMeshUnderPointer = null;
		}

		if (pick.pickedMesh) {
			this._axisMeshUnderPointer = pick.pickedMesh;
			this._axisMeshUnderPointer.scaling.setAll(1.4);

			this.props.editor.layout.preview._handleMouseLeave();
		}
	}

	private _handlePointerTap(ev: MouseEvent): void {
		const camera = this.props.editor.layout.preview?.scene.activeCamera as FreeCamera | ArcRotateCamera;
		if (!this._axisMeshUnderPointer || !camera) {
			return;
		}

		ev.stopPropagation();

		const axis = this._axisMeshUnderPointer.metadata.axis;

		const target = camera.target.clone();
		const distance = Math.max(Vector3.Distance(camera.globalPosition, target), 100);
		const cameraPosition = target.add(axis.scale(distance));

		if (isArcRotateCamera(camera)) {
			// TODO: handle arc rotate camera
		} else {
			const cameraRotation = Vector3.Zero();

			if (axis.equals(Vector3.UpReadOnly)) {
				cameraRotation.set(Math.PI * 0.5, 0, 0);
			} else if (axis.equals(Vector3.DownReadOnly)) {
				cameraRotation.set(-Math.PI * 0.5, 0, 0);
			} else if (axis.equals(Vector3.RightReadOnly)) {
				cameraRotation.set(0, -Math.PI * 0.5, 0);
			} else if (axis.equals(Vector3.LeftReadOnly)) {
				cameraRotation.set(0, Math.PI * 0.5, 0);
			} else if (axis.equals(Vector3.LeftHandedForwardReadOnly)) {
				cameraRotation.set(0, Math.PI, 0);
			} else if (axis.equals(Vector3.LeftHandedBackwardReadOnly)) {
				cameraRotation.set(0, 0, 0);
			}

			Tween.create(camera, 0.35, {
				rotation: cameraRotation,
				position: cameraPosition,
				noOptimize: true,
				killAllTweensOfTarget: true,
			});
		}
	}

	private _createAxis(root: TransformNode, color: Color3, rotation: Vector3, offset: Vector3): Mesh {
		const material = new StandardMaterial("", this.scene!);
		material.emissiveColor = color;
		material.transparencyMode = StandardMaterial.MATERIAL_OPAQUE;

		const cylinder = MeshBuilder.CreateCylinder("cylinder", { diameter: 0.03, subdivisions: 32, height: 0.5 }, this.scene);
		cylinder.parent = root;
		cylinder.position = offset;
		cylinder.rotation = rotation;
		cylinder.material = material;

		const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 0.2, segments: 32 }, this.scene);
		sphere.parent = root;
		sphere.position = offset.scale(2);
		sphere.material = material;
		sphere.metadata = { axis: offset.clone().normalize() };

		this._axisClickableMeshes.push(sphere);

		return sphere;
	}

	private _createNegativeAlphaSphere(root: TransformNode, offset: Vector3): void {
		const material = new StandardMaterial("", this.scene!);
		material.alpha = 0.25;
		material.emissiveColor = Color3.Black();
		material.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;

		const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 0.2, segments: 32 }, this.scene);
		sphere.parent = root;
		sphere.position = offset.scale(2);
		sphere.material = material;
		sphere.metadata = { axis: offset.clone().normalize() };

		this._axisClickableMeshes.push(sphere);
	}
}
