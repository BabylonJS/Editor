import { Component, ReactNode } from "react";

import { Scene, ArcRotateCamera, Vector3, Viewport, TransformNode, Quaternion, Color3, MeshBuilder, StandardMaterial, AbstractMesh } from "babylonjs";

import { waitUntil } from "../../../tools/tools";

import { Editor } from "../../main";

export interface IEditorPreviewAxisHelperProps {
	editor: Editor;
}

export interface IEditorPreviewAxisHelperState {}

export class EditorPreviewAxisHelper extends Component<IEditorPreviewAxisHelperProps, IEditorPreviewAxisHelperState> {
	public scene: Scene | null = null;

	private _axisClickableMeshes: AbstractMesh[] = [];
	// private _axisMeshUnderPointer: AbstractMesh | null = null;

	public render(): ReactNode {
		return <div></div>;
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

		this._createAxis(dummy, Color3.FromHexString("#ff4466"), new Vector3(0, 0, -Math.PI / 2), new Vector3(0.25, 0, 0));
		this._createAxis(dummy, Color3.FromHexString("#88ff44"), Vector3.Zero(), new Vector3(0, 0.25, 0));
		this._createAxis(dummy, Color3.FromHexString("#4488ff"), new Vector3(Math.PI / 2, 0, 0), new Vector3(0, 0, 0.25));

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
		});

		// this.scene.onPointerObservable.add((pointerInfo) => {
		// 	switch (pointerInfo.type) {
		// 		case PointerEventTypes.POINTERMOVE:
		// 			this._handlePointerMove();
		// 			break;

		// 		case PointerEventTypes.POINTERTAP:
		// 			// TODO: determine what can be done with FreeCamera. Center point is obvious with ArcRotateCamera, but not with FreeCamera. Please help :)
		// 			// this._handlePointerTap();
		// 			break;
		// 	}
		// });
	}

	// private _handlePointerMove(): void {
	// 	const pick = this.scene!.pick(this.scene!.pointerX, this.scene!.pointerY, (mesh) => mesh.metadata?.axis, false);

	// 	if (pick.pickedMesh !== this._axisMeshUnderPointer) {
	// 		Tween.create(this._axisMeshUnderPointer, 0.35, {
	// 			killAllTweensOfTarget: true,
	// 			scaling: new Vector3(1, 1, 1),
	// 		});

	// 		this._axisMeshUnderPointer = null;
	// 	}

	// 	if (pick.pickedMesh) {
	// 		this._axisMeshUnderPointer = pick.pickedMesh;
	// 		pick.pickedMesh.scaling.setAll(1.4);
	// 	}
	// }

	// private _handlePointerTap(): void {
	// 	const camera = this.props.editor.layout.preview?.scene.activeCamera;
	// 	if (!this._axisMeshUnderPointer || !camera) {
	// 		return;
	// 	}

	// 	const graphSelectedObjects = this.props.editor.layout.graph.getSelectedNodes();
	// 	const mesh = graphSelectedObjects.find((n) => isAbstractMesh(n.nodeData))?.nodeData as AbstractMesh;

	// 	if (!mesh) {
	// 		return;
	// 	}

	// 	mesh.refreshBoundingInfo({
	// 		applyMorph: true,
	// 		applySkeleton: true,
	// 		updatePositionsArray: true,
	// 	});

	// 	const center = mesh.getBoundingInfo().boundingBox.centerWorld;
	// 	const radius = Vector3.Distance(camera.globalPosition, center);
	// 	const cameraPosition = center.add(this._axisMeshUnderPointer.metadata.axis.scale(radius));

	// 	Tween.create(camera, 0.35, {
	// 		killAllTweensOfTarget: true,
	// 		target: center,
	// 		position: cameraPosition,
	// 	});
	// }

	private _createAxis(root: TransformNode, color: Color3, rotation: Vector3, offset: Vector3): void {
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
