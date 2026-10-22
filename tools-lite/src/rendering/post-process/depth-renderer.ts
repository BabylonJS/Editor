import { Mesh, SceneContext } from "@babylonjs/lite";

import { _getDevice, IPostProcessTexture } from "./pass";
import { _getMeshDistanceToCamera, _getMeshPassMaterial, IMeshPassMaterial } from "./mesh-materials";
import { IMeshPassDraw, IMeshPassOutputs, MeshPassRenderer } from "./mesh-pass";
import { _getBabylonProjectionMatrix, _getBabylonViewMatrix, _getCameraAspectRatio, _multiplyMatrices } from "./matrix";

/**
 * Defines what a depth renderer stores, same as the options of the depth renderer of Babylon.js: the depth metric
 * ("(z + depthValues.x) / depthValues.y"), the depth of the view ("storeCameraSpaceZ") or the depth of the depth buffer
 * ("storeNonLinearDepth").
 */
export type DepthRendererPassOutput = "depthMetric" | "viewDepth" | "nonLinearDepth";

/**
 * Defines the options of the rendering of a depth renderer for a frame.
 */
export interface IDepthRendererPassOptions {
	/**
	 * Defines what the depth renderer stores.
	 */
	output: DepthRendererPassOutput;
	/**
	 * Defines the format of the texture (half floats or 32 bits floats).
	 */
	format: GPUTextureFormat;
	/**
	 * Defines the size of the texture.
	 */
	width: number;
	height: number;
	/**
	 * Defines wether or not the front faces are culled instead of the back faces (`reverseCulling`).
	 */
	reverseCulling: boolean;
	/**
	 * Defines wether or not the transparent meshes write the depth (`forceDepthWriteTransparentMeshes`).
	 */
	transparentMeshes: boolean;
}

/**
 * Renders the depth of the meshes the same way the depth renderer of Babylon.js does (`DepthRenderer`): the opaque and
 * alpha tested meshes (the transparent ones with `forceDepthWriteTransparentMeshes`), alpha tested with the alpha of their
 * alpha test texture (0.4), with the projection of the camera computed again (unjittered by the TAA). The geometry
 * renderer tasks of Babylon Lite run the whole shaders of the materials to render the depth.
 */
export class DepthRendererPass {
	private _scene: SceneContext;
	private _renderer: MeshPassRenderer;

	private _options: IDepthRendererPassOptions | null = null;
	private _texture: { texture: GPUTexture; output: IPostProcessTexture } | null = null;
	private _depth: GPUTexture | null = null;
	private _depthView: GPUTextureView | null = null;

	private _draws: IMeshPassDraw[] = [];
	private _meshDraws: WeakMap<Mesh, IMeshPassDraw> = new WeakMap();
	private _materials: WeakMap<IMeshPassMaterial, IMeshPassMaterial> = new WeakMap();

	/**
	 * Constructor.
	 * @param scene defines the reference to the scene to render the depth of.
	 * @param name defines the name of the depth renderer (label of the GPU resources).
	 */
	public constructor(scene: SceneContext, name: string) {
		this._scene = scene;
		this._renderer = new MeshPassRenderer(scene.surface.engine, name);
	}

	/**
	 * Updates the depth to render this frame.
	 * @param options defines the options of the rendering, null when not requested this frame.
	 * @returns the texture the depth is rendered into, stored as Babylon.js stores its render targets (first row at the
	 * bottom).
	 */
	public update(options: IDepthRendererPassOptions | null): IPostProcessTexture | null {
		this._options = options;
		if (!options) {
			return null;
		}

		const { width, height, format } = options;
		const device = _getDevice(this._scene.surface.engine);

		const current = this._texture;
		if (!current || current.output.width !== width || current.output.height !== height || current.output.format !== format) {
			current?.texture.destroy();

			const texture = device.createTexture({
				label: "editor-depth-renderer",
				size: { width, height },
				format,
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
			});

			this._texture = { texture, output: { view: texture.createView(), width, height, format } };
		}

		if (!this._depth || this._depth.width !== width || this._depth.height !== height) {
			this._depth?.destroy();
			this._depth = device.createTexture({ label: "editor-depth-renderer-depth", size: { width, height }, format: "depth24plus", usage: GPUTextureUsage.RENDER_ATTACHMENT });
			this._depthView = this._depth.createView();
		}

		return this._texture!.output;
	}

	/**
	 * Renders the depth requested this frame.
	 * @returns the number of draw calls.
	 */
	public execute(): number {
		const camera = this._scene.camera;
		const options = this._options;
		if (!camera || !options || !this._texture || !this._depthView) {
			return 0;
		}

		// Same as the depth renderer of Babylon.js with WebGPU (depth of the clip space from 0 to 1, depth buffer not
		// reversed): "depthValues" is (0, maxZ) with a perspective camera, (0, 1) with an orthographic camera.
		const canvas = this._scene.surface.canvas;
		const view = _getBabylonViewMatrix(camera);
		const viewProjection = _multiplyMatrices(view, _getBabylonProjectionMatrix(camera, _getCameraAspectRatio(camera, canvas.width, canvas.height)));
		const depthValues: [number, number] = camera.ortho ? [0, 1] : [0, camera.farPlane];

		const draws = this._getDraws(camera.worldMatrix, options);
		const outputs: IMeshPassOutputs = { [options.output]: true };

		// Same as the depth renderer of Babylon.js: cleared to 0 when storing the depth of the view, 1 otherwise.
		const clear = options.output === "viewDepth" ? 0 : 1;

		return this._renderer.render(draws, { viewProjection, view, depthValues }, outputs, {
			colors: [{ view: this._texture.output.view, format: options.format, clearValue: { r: clear, g: 0, b: 0, a: 1 } }],
			depth: { view: this._depthView, format: "depth24plus" },
		});
	}

	/**
	 * Disposes the textures and the resources of the depth renderer.
	 */
	public dispose(): void {
		this._texture?.texture.destroy();
		this._texture = null;

		this._depth?.destroy();
		this._depth = null;
		this._depthView = null;

		this._draws = [];
		this._renderer.dispose();
	}

	/**
	 * Returns the meshes to draw, in the order of the depth renderer of Babylon.js: the opaque meshes, the alpha tested
	 * meshes, then the transparent meshes (sorted from back to front) when they write the depth.
	 */
	private _getDraws(cameraWorld: ArrayLike<number>, options: IDepthRendererPassOptions): IMeshPassDraw[] {
		const opaque: IMeshPassDraw[] = [];
		const alphaTest: IMeshPassDraw[] = [];
		const transparent: { draw: IMeshPassDraw; distance: number }[] = [];

		this._scene.meshes.forEach((mesh) => {
			if (mesh.visible === false) {
				return;
			}

			const material = _getMeshPassMaterial(mesh);
			if ((material.transparent && !options.transparentMeshes) || material.data?.disableDepthWrite) {
				return;
			}

			const draw = this._getDraw(mesh, material, options);
			if (material.transparent) {
				transparent.push({ draw, distance: _getMeshDistanceToCamera(mesh, cameraWorld) });
			} else if (material.alphaTest) {
				alphaTest.push(draw);
			} else {
				opaque.push(draw);
			}
		});

		transparent.sort((a, b) => b.distance - a.distance);

		const draws = this._draws;
		draws.length = 0;
		draws.push(...opaque, ...alphaTest, ...transparent.map((t) => t.draw));

		return draws;
	}

	private _getDraw(mesh: Mesh, material: IMeshPassMaterial, options: IDepthRendererPassOptions): IMeshPassDraw {
		// Same as the depth renderer of Babylon.js: the meshes are alpha tested with the alpha of the alpha test texture of
		// their material only, and drawn without blending.
		let depthMaterial = this._materials.get(material);
		if (!depthMaterial) {
			const alphaTest = material.alphaTest && !!material.diffuse;
			depthMaterial = { ...material, alphaTest, diffuse: alphaTest ? material.diffuse : null, opacity: null, transparent: false, vertexAlpha: false };
			this._materials.set(material, depthMaterial);
		}

		let draw = this._meshDraws.get(mesh);
		if (!draw) {
			draw = { mesh, material: depthMaterial, alpha: 1, alphaCutOff: 0.4, writeColor: true };
			this._meshDraws.set(mesh, draw);
		}

		draw.material = depthMaterial;
		draw.reverseCulling = options.reverseCulling;

		return draw;
	}
}
