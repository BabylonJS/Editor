import { Mesh, SceneContext } from "@babylonjs/lite";

import { _getDevice, IPostProcessTexture } from "./pass";
import { _getMeshPassMaterial } from "./mesh-materials";
import { IMeshPassDraw, IMeshPassOutputs, IMeshPassTarget, MeshPassRenderer, _sortMeshPassDraws } from "./mesh-pass";
import { _getBabylonProjectionMatrix, _getBabylonViewMatrix, _getCameraAspectRatio, _multiplyMatrices, BabylonMatrix } from "./matrix";

/**
 * Defines the textures of the pre-pass renderer of Babylon.js rendered by the tools.
 */
export interface IPrePassMeshTextures {
	/**
	 * Velocity encoded as Babylon.js encodes it ("pow(abs(velocity), 1 / 3) * sign(velocity) * 0.5 + 0.5", 8 bits).
	 */
	velocity: IPostProcessTexture | null;
	/**
	 * Linear velocity, in half floats.
	 */
	linearVelocity: IPostProcessTexture | null;
	/**
	 * Depth of the depth buffer (0 at the near plane, 1 at the far plane), in half floats.
	 */
	screenDepth: IPostProcessTexture | null;
}

/**
 * Defines the textures requested from the pre-pass mesh renderer for a frame.
 */
export interface IPrePassMeshRequest {
	velocity: boolean;
	linearVelocity: boolean;
	screenDepth: boolean;
}

interface IPrePassTexture {
	texture: GPUTexture;
	output: IPostProcessTexture;
}

/**
 * Defines the textures of the pre-pass, in the order of the outputs of the mesh passes.
 */
const prePassTextures: { key: keyof IPrePassMeshTextures; label: string; format: GPUTextureFormat }[] = [
	{ key: "velocity", label: "editor-velocity", format: "rgba8unorm" },
	{ key: "linearVelocity", label: "editor-linear-velocity", format: "rgba16float" },
	{ key: "screenDepth", label: "editor-screen-depth", format: "r16float" },
];

const clearValue: GPUColor = { r: 0, g: 0, b: 0, a: 0 };

/**
 * Renders the textures of the pre-pass renderer of Babylon.js that the geometry renderer tasks of Babylon Lite can't
 * render the same way, drawing the meshes as the materials of Babylon.js draw them into the pre-pass:
 * - the velocity ("PREPASS_VELOCITY" and "PREPASS_VELOCITY_LINEAR"): the positions of the current frame and of the
 *   previous frame are computed from the world matrices of the meshes and the view projections of the camera of both
 *   frames (see `PrePassConfiguration` of Babylon.js). The geometry renderer tasks of Babylon Lite only compute the motion
 *   of the camera for the PBR materials.
 * - the depth of the depth buffer ("PREPASS_SCREENSPACE_DEPTH"), which the geometry renderer tasks of Babylon Lite render
 *   running the whole shaders of the materials.
 * Same as Babylon.js, the transparent meshes write the geometry where their alpha is greater than their alpha cutoff, and
 * the meshes which materials don't write the geometry (node materials, sky materials) only write the depth.
 */
export class PrePassMeshRenderer {
	/**
	 * Defines the textures rendered this frame (null when not requested).
	 */
	public readonly textures: IPrePassMeshTextures = { velocity: null, linearVelocity: null, screenDepth: null };

	private _scene: SceneContext;
	private _renderer: MeshPassRenderer;

	private _outputs: IMeshPassOutputs = {};
	private _textures: Partial<Record<keyof IPrePassMeshTextures, IPrePassTexture>> = {};
	private _depth: { texture: GPUTexture; view: GPUTextureView } | null = null;

	private _draws: IMeshPassDraw[] = [];
	private _meshDraws: WeakMap<Mesh, IMeshPassDraw> = new WeakMap();
	private _previousWorlds: WeakMap<Mesh, Float32Array> = new WeakMap();
	private _viewProjection: BabylonMatrix | null = null;
	private _previousViewProjection: BabylonMatrix | null = null;
	private _rendered: boolean = false;

	/**
	 * Constructor.
	 * @param scene defines the reference to the scene to render the pre-pass of.
	 */
	public constructor(scene: SceneContext) {
		this._scene = scene;
		this._renderer = new MeshPassRenderer(scene.surface.engine, "editor-pre-pass");
	}

	/**
	 * Updates the textures to render this frame.
	 * @param request defines the textures requested this frame.
	 */
	public update(request: IPrePassMeshRequest): void {
		this._outputs = { ...request };
		this._rendered = false;

		const canvas = this._scene.surface.canvas;
		const width = Math.max(1, canvas.width);
		const height = Math.max(1, canvas.height);

		let requested = false;
		prePassTextures.forEach(({ key, label, format }) => {
			if (!request[key]) {
				this.textures[key] = null;
				return;
			}

			this._textures[key] = this._getTexture(this._textures[key] ?? null, label, format, width, height);
			this.textures[key] = this._textures[key]!.output;
			requested = true;
		});

		if (requested && (!this._depth || this._depth.texture.width !== width || this._depth.texture.height !== height)) {
			this._depth?.texture.destroy();

			const texture = _getDevice(this._scene.surface.engine).createTexture({
				label: "editor-pre-pass-depth",
				size: { width, height },
				format: "depth24plus",
				usage: GPUTextureUsage.RENDER_ATTACHMENT,
			});

			this._depth = { texture, view: texture.createView() };
		}
	}

	/**
	 * Renders the textures requested this frame.
	 * @returns the number of draw calls.
	 */
	public execute(): number {
		const camera = this._scene.camera;
		const outputs = this._outputs;
		if (!camera || !this._depth || (!outputs.velocity && !outputs.linearVelocity && !outputs.screenDepth)) {
			return 0;
		}

		const canvas = this._scene.surface.canvas;
		const viewProjection = _multiplyMatrices(_getBabylonViewMatrix(camera), _getBabylonProjectionMatrix(camera, _getCameraAspectRatio(camera, canvas.width, canvas.height)));

		// Same as the pre-pass configuration of Babylon.js: the world matrices and the view projection of the previous frame
		// are tracked while the velocity is rendered. The first frame (or the first frame a mesh is drawn) has no velocity.
		const velocity = !!(outputs.velocity || outputs.linearVelocity);
		const previousViewProjection = (velocity ? this._previousViewProjection : null) ?? viewProjection;

		const draws = this._draws;
		draws.length = 0;

		this._scene.meshes.forEach((mesh) => {
			if (mesh.visible === false) {
				return;
			}

			const material = _getMeshPassMaterial(mesh);

			let draw = this._meshDraws.get(mesh);
			if (!draw) {
				draw = { mesh, material, alpha: 1, alphaCutOff: 0.4, writeColor: false };
				this._meshDraws.set(mesh, draw);
			}

			draw.material = material;
			draw.alpha = material.alpha;
			draw.alphaCutOff = material.alphaCutOff;
			draw.writeColor = material.type !== "other";

			draws.push(draw);

			if (velocity && !this._previousWorlds.has(mesh)) {
				this._previousWorlds.set(mesh, new Float32Array(mesh.worldMatrix as unknown as ArrayLike<number>));
			}
		});

		const target: IMeshPassTarget = { colors: [], depth: { view: this._depth.view, format: "depth24plus" } };
		prePassTextures.forEach(({ key, format }) => {
			if (outputs[key]) {
				target.colors.push({ view: this._textures[key]!.output.view, format, clearValue });
			}
		});

		const count = this._renderer.render(
			_sortMeshPassDraws(draws, camera.worldMatrix),
			{ viewProjection, previousViewProjection },
			outputs,
			target,
			velocity ? this._previousWorlds : undefined
		);

		// The world matrices and the view projection of this frame are the previous ones of the next frame.
		if (velocity) {
			draws.forEach((draw) => this._previousWorlds.get(draw.mesh)!.set(draw.mesh.worldMatrix as unknown as ArrayLike<number>));
			this._previousViewProjection = viewProjection;
		}

		this._viewProjection = viewProjection;
		this._rendered = true;

		return count;
	}

	/**
	 * Offsets the textures rendered this frame (see `IPostProcessContext.jitterProjection` and
	 * `IPostProcessContext.jitterVertices`).
	 * @param x defines the offset on the x axis, in clip space.
	 * @param y defines the offset on the y axis, in clip space.
	 * @param projection defines wether or not the projection is offset: same as the pre-pass renderer of Babylon.js, which
	 * stores the view projection of the scene (jittered by the TAA), the jittered view projection is the previous view
	 * projection of the next frame. Otherwise only the vertices are offset once the velocity is computed, as the TAA
	 * material manager of Babylon.js does.
	 */
	public jitter(x: number, y: number, projection: boolean): void {
		const viewProjection = this._viewProjection;
		if (!this._rendered || !viewProjection) {
			return;
		}

		if (!projection) {
			this._renderer.jitterVertices(x, y);
			return;
		}

		this._renderer.jitterViewProjection(x, y);

		if (this._outputs.velocity || this._outputs.linearVelocity) {
			const jittered = new Float32Array(viewProjection);
			for (let column = 0; column < 4; ++column) {
				const offset = column * 4;
				jittered[offset] += x * jittered[offset + 3];
				jittered[offset + 1] += y * jittered[offset + 3];
			}

			this._previousViewProjection = jittered;
		}
	}

	/**
	 * Disposes the textures and the resources of the renderer.
	 */
	public dispose(): void {
		Object.values(this._textures).forEach((texture) => texture?.texture.destroy());
		this._textures = {};

		this._depth?.texture.destroy();
		this._depth = null;
		this._draws = [];

		this._renderer.dispose();
	}

	private _getTexture(current: IPrePassTexture | null, label: string, format: GPUTextureFormat, width: number, height: number): IPrePassTexture {
		if (current && current.output.width === width && current.output.height === height) {
			return current;
		}

		current?.texture.destroy();

		const texture = _getDevice(this._scene.surface.engine).createTexture({
			label,
			size: { width, height },
			format,
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
		});

		return { texture, output: { view: texture.createView(), width, height, format } };
	}
}
