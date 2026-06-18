import { basename, dirname, join } from "path/posix";

import { Component, ReactNode } from "react";

import {
	Engine,
	Scene,
	ArcRotateCamera,
	Vector3,
	LoadAssetContainerAsync,
	CubeTexture,
	Ragdoll,
	GroundMesh,
	HavokPlugin,
	DirectionalLight,
	MeshBuilder,
	CascadedShadowGenerator,
	PhysicsViewer,
	PBRMaterial,
	PhysicsAggregate,
	PhysicsShapeType,
	TransformNode,
} from "babylonjs";

import { getProjectAssetsRootUrl } from "../../../project/configuration";

import { Editor } from "../../main";

import { RagdollEditor } from "./editor";

export interface IRagdollEditorPreviewProps {
	editor: Editor;
	ragdollEditor: RagdollEditor;
}

export interface IRagdollEditorPreviewState {}

export class RagdollEditorPreview extends Component<IRagdollEditorPreviewProps, IRagdollEditorPreviewState> {
	private _canvasRef: HTMLCanvasElement | null = null;

	public engine!: Engine;
	public scene!: Scene;
	public camera!: ArcRotateCamera;
	public ground: GroundMesh;
	public scalingNode: TransformNode;

	public ragdoll: Ragdoll | null = null;

	private _light: DirectionalLight;

	private _viewer: PhysicsViewer | null = null;

	public constructor(props: IRagdollEditorPreviewProps) {
		super(props);

		this.state = {};
	}

	public render(): ReactNode {
		return <canvas ref={(r) => (this._canvasRef = r)} className="w-full h-full bg-black rounded-lg" />;
	}

	public componentDidMount(): void {
		if (!this._canvasRef) {
			return;
		}

		this.engine = new Engine(this._canvasRef, true);
		this.scene = new Scene(this.engine);

		this.camera = new ArcRotateCamera("camera", Math.PI * 0.25, Math.PI * 0.25, 10, Vector3.Zero(), this.scene, true);
		this.camera.attachControl();

		const hk = new HavokPlugin();
		this.scene.enablePhysics(new Vector3(0, -981, 0), hk);

		this._light = new DirectionalLight("light", new Vector3(-1, -2, -1), this.scene);

		const shadowGenerator = new CascadedShadowGenerator(1024, this._light);
		shadowGenerator.lambda = 1;

		this.ground = MeshBuilder.CreateGround("ground", { width: 1024, height: 1024 }, this.scene);
		this.ground.receiveShadows = true;
		this.ground.physicsAggregate = new PhysicsAggregate(this.ground, PhysicsShapeType.BOX, { mass: 0, restitution: 0.5 }, this.scene);

		this.scalingNode = new TransformNode("scalingNode", this.scene);
		this.scalingNode.scaling.setAll(100);

		const material = new PBRMaterial("ground", this.scene);
		material.roughness = 1;
		material.metallic = 0;
		material.albedoColor.set(0.35, 0.35, 0.35);
		this.ground.material = material;

		const observer = new ResizeObserver(() => {
			this.engine.resize();
		});
		observer.observe(this._canvasRef);

		this.engine.runRenderLoop(() => {
			this.scene.render();
		});
	}

	public componentWillUnmount(): void {
		this.scene?.dispose();
		this.engine?.dispose();
	}

	public resetViewer(): void {
		this._viewer?.dispose();
		this._viewer = null;

		this._viewer = new PhysicsViewer(this.scene);

		this.scene.transformNodes.forEach((mesh) => {
			if (mesh.physicsBody) {
				this._viewer?.showBody(mesh.physicsBody);
			}
		});
	}

	public async loadFromRelativePath(relativePath: string): Promise<void> {
		const rootUrl = getProjectAssetsRootUrl();
		if (!rootUrl) {
			return;
		}

		const absolutePath = join(rootUrl, relativePath);

		const serializedEnvironmentTexture = this.props.editor.layout.preview.scene.environmentTexture?.serialize();
		if (serializedEnvironmentTexture) {
			const texture = CubeTexture.Parse(serializedEnvironmentTexture, this.scene, rootUrl);
			this.scene.environmentTexture = texture;
		}

		const container = await LoadAssetContainerAsync(basename(absolutePath), this.scene, {
			rootUrl: join(dirname(absolutePath), "/"),
		});

		const nodes = [...container.meshes, ...container.transformNodes, ...container.lights, ...container.cameras];

		container.addAllToScene();

		container.animationGroups.forEach((animationGroup) => {
			animationGroup.stop();
		});

		container.skeletons.forEach((skeleton) => {
			skeleton.returnToRest();
		});

		nodes.forEach((node) => {
			if (!node.parent) {
				node.parent = this.scalingNode;
			}
		});

		const shadowMap = this._light.getShadowGenerator()?.getShadowMap();
		shadowMap?.renderList?.splice(0, shadowMap.renderList.length);

		const max = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);
		const min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);

		this.scene.meshes.forEach((mesh) => {
			if (mesh === this.ground) {
				return;
			}

			mesh.computeWorldMatrix(true);
			mesh.refreshBoundingInfo({
				applyMorph: true,
				applySkeleton: true,
			});

			if (mesh.geometry) {
				mesh.receiveShadows = true;
				shadowMap?.renderList?.push(mesh);
			}

			const bb = mesh.getBoundingInfo().boundingBox;

			max.x = Math.max(max.x, bb.maximumWorld.x);
			max.y = Math.max(max.y, bb.maximumWorld.y);
			max.z = Math.max(max.z, bb.maximumWorld.z);

			min.x = Math.min(min.x, bb.minimumWorld.x);
			min.y = Math.min(min.y, bb.minimumWorld.y);
			min.z = Math.min(min.z, bb.minimumWorld.z);
		});

		this.camera.radius = max.subtract(min).length() * 1.5;
		this.camera.target.y = (max.y + min.y) * 0.5;
		this.camera.panningSensibility = 100;

		this.props.ragdollEditor.forceUpdate();
	}
}
