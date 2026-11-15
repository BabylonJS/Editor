import { createGeometryRendererTask, GeometryRendererTask, GeometryTextureType, Material, Mesh, RenderTarget, SceneContext } from "@babylonjs/lite";

import { IPostProcessGeometryRequest, IPostProcessGeometryTextures } from "./context";
import { DepthRendererPass } from "./depth-renderer";
import { _writeJitteredViewProjection } from "./jitter";
import { _getMeshDistanceToCamera } from "./mesh-materials";
import { _getDevice, IPostProcessTexture } from "./pass";
import { PrePassMeshRenderer } from "./pre-pass";

/**
 * Defines a group of geometry textures rendered by the same geometry renderer task of Babylon Lite.
 */
interface IGeometryGroup {
	key: string;
	task: GeometryRendererTask;
	width: number;
	height: number;
	recorded: boolean;
	lastUsedFrame: number;
	/**
	 * Defines wether or not the group renders the textures of the pre-pass renderer of Babylon.js (transparent meshes
	 * sorted from back to front).
	 */
	prePass: boolean;
}

/**
 * Offset in bytes of the contrast of the image processing in the uniforms of the scene of Babylon Lite ("vImageInfos.y"),
 * set to -1 for the pre-pass tasks.
 */
const prePassMarkerOffset = 77 * 4;
const prePassMarker = new Float32Array([-1]);

/**
 * Defines the number of frames after which a group not requested anymore is disposed.
 */
const unusedGroupFrames = 120;

/**
 * Returns a texture reading the color attachment of the given render target of Babylon Lite (resolved each time it is
 * read, so it follows the resizes of the target).
 */
function getRenderTargetTexture(target: RenderTarget | null, format: GPUTextureFormat): IPostProcessTexture | null {
	if (!target) {
		return null;
	}

	const internal = target as unknown as { _colorView: GPUTextureView; _width: number; _height: number };
	return {
		get view() {
			return internal._colorView;
		},
		get width() {
			return internal._width;
		},
		get height() {
			return internal._height;
		},
		format,
		topDown: true,
	};
}

/**
 * Returns wether or not the given material of Babylon Lite is alpha blended: the geometry renderer tasks of Babylon Lite
 * draw the alpha blended meshes after the other meshes.
 * @internal
 */
export function _isMaterialAlphaBlended(material: Material | null | undefined): boolean {
	if (!material) {
		return false;
	}

	const properties = material as unknown as { alphaBlend?: boolean; alpha?: number; opacityTexture?: unknown; needsAlphaBlending?: boolean; _needsAlphaBlending?: boolean };

	if (properties.alphaBlend === true || properties.needsAlphaBlending === true || properties._needsAlphaBlending === true) {
		return true;
	}

	// Standard materials.
	if (!("baseColorFactor" in properties) && !("baseColorTexture" in properties) && ((properties.alpha ?? 1) < 1 || !!properties.opacityTexture)) {
		return true;
	}

	return false;
}

/**
 * Renders the geometry textures requested by the rendering pipelines for the active camera:
 * - the textures of the pre-pass renderer of Babylon.js reading the materials (depth, normals, reflectivity) are rendered
 *   by geometry renderer tasks of Babylon Lite,
 * - the velocity and the depth of the depth buffer of the pre-pass, and the depth renderers of Babylon.js (depth of
 *   field, back faces of the screen space reflections), are rendered by the tools (see `PrePassMeshRenderer` and
 *   `DepthRendererPass`).
 * The textures are rendered by the post-processes task of the tools, before the post-processes.
 */
export class PostProcessGeometryRenderers {
	/**
	 * Defines the textures rendered this frame (null when not requested).
	 */
	public readonly textures: IPostProcessGeometryTextures = {
		viewDepth: null,
		viewNormal: null,
		worldNormal: null,
		reflectivity: null,
		velocity: null,
		linearVelocity: null,
		depthRenderer: null,
		screenDepth: null,
		backDepth: null,
		volumetricDepth: null,
	};

	private _scene: SceneContext;
	private _groups: Map<string, IGeometryGroup> = new Map();
	private _active: IGeometryGroup[] = [];
	private _frame: number = 0;

	private _prePass: PrePassMeshRenderer;
	private _depthRenderer: DepthRendererPass;
	private _backDepthRenderer: DepthRendererPass;

	/**
	 * Constructor.
	 * @param scene defines the reference to the scene to render the geometry of.
	 */
	public constructor(scene: SceneContext) {
		this._scene = scene;

		this._prePass = new PrePassMeshRenderer(scene);
		this._depthRenderer = new DepthRendererPass(scene, "editor-depth-renderer");
		this._backDepthRenderer = new DepthRendererPass(scene, "editor-back-depth-renderer");
	}

	/**
	 * Updates the geometry textures to render this frame.
	 * @param request defines the geometry textures requested by the pipelines rendering the active camera.
	 */
	public update(request: IPostProcessGeometryRequest): void {
		this._frame++;
		this._active = [];

		const textures = this.textures;
		Object.keys(textures).forEach((key) => ((textures as unknown as Record<string, unknown>)[key] = null));

		const canvas = this._scene.surface.canvas;
		const width = Math.max(1, canvas.width);
		const height = Math.max(1, canvas.height);

		// Same as the volumetric lighting of the Babylon.js version of the tools: the depth of the scene is read from the
		// pre-pass renderer when the scene renders one (requested by another pipeline), else the depth of all the surfaces is
		// rendered for the volumetric lighting.
		const prePassRendered = !!(
			request.viewDepth ||
			request.viewNormal ||
			request.worldNormal ||
			request.reflectivity ||
			request.velocity ||
			request.linearVelocity ||
			request.screenDepth
		);
		const volumetricFromPrePass = !!request.volumetricDepth && prePassRendered;

		// Pre-pass.
		const prePass: { type: GeometryTextureType; format?: GPUTextureFormat; clearValue?: GPUColor; key: keyof IPostProcessGeometryTextures }[] = [];
		// Same as the pre-pass renderer of Babylon.js with WebGPU: the depth is stored in half floats (the 32 bits float
		// textures can't be filtered without the "float32-filterable" feature, which Babylon.js doesn't request), cleared to 0.
		if (request.viewDepth || volumetricFromPrePass) {
			prePass.push({ type: GeometryTextureType.VIEW_DEPTH, format: "r16float", clearValue: { r: 0, g: 0, b: 0, a: 0 }, key: "viewDepth" });
		}
		if (request.viewNormal) {
			prePass.push({ type: GeometryTextureType.VIEW_NORMAL, key: "viewNormal" });
		}
		if (request.worldNormal) {
			prePass.push({ type: GeometryTextureType.WORLD_NORMAL, key: "worldNormal" });
		}
		if (request.reflectivity) {
			prePass.push({ type: GeometryTextureType.REFLECTIVITY, key: "reflectivity" });
		}

		// Same as the pre-pass renderer of Babylon.js, the transparent meshes write the geometry where their alpha is greater
		// than 0.4 (blended by the geometry renderer tasks of Babylon Lite).
		if (prePass.length) {
			const group = this._getGroup(`pre-pass|${prePass.map((p) => p.key).join(",")}`, prePass);
			group.prePass = true;
			prePass.forEach((p, index) => {
				const description = (group.task as unknown as { _attachments: { _format: GPUTextureFormat }[] })._attachments[index];
				textures[p.key] = getRenderTargetTexture(this._getAttachment(group.task, p.type), description._format);
			});
		}

		// Velocity and depth of the depth buffer of the pre-pass renderer of Babylon.js.
		this._prePass.update({ velocity: !!request.velocity, linearVelocity: !!request.linearVelocity, screenDepth: !!request.screenDepth });
		textures.velocity = this._prePass.textures.velocity;
		textures.linearVelocity = this._prePass.textures.linearVelocity;
		textures.screenDepth = this._prePass.textures.screenDepth;

		// Same as the depth renderer the depth of field of Babylon.js creates ("scene.enableDepthRenderer"): depth metric in
		// half floats.
		textures.depthRenderer = this._depthRenderer.update(
			request.depthRenderer ? { output: "depthMetric", format: "r16float", width, height, reverseCulling: false, transparentMeshes: false } : null
		);

		// Same as the depth renderer of the back faces of the screen space reflections of Babylon.js: depth of the view (or
		// of the depth buffer with the screen space depth) in 32 bits floats, downsampled.
		const downsample = (request.backDepthDownsample ?? 0) + 1;
		textures.backDepth = this._backDepthRenderer.update(
			request.backDepth
				? {
						output: request.backDepthNonLinear ? "nonLinearDepth" : "viewDepth",
						format: "r32float",
						width: Math.max(1, Math.floor(canvas.width / downsample)),
						height: Math.max(1, Math.floor(canvas.height / downsample)),
						reverseCulling: true,
						transparentMeshes: !!request.backDepthTransparent,
					}
				: null
		);

		// Depth of the volumetric lighting without pre-pass: all the meshes, in half floats (blendable, as the transparent
		// meshes are blended).
		if (request.volumetricDepth && !volumetricFromPrePass) {
			const group = this._getGroup("volumetric", [{ type: GeometryTextureType.VIEW_DEPTH, format: "r16float" }]);
			textures.volumetricDepth = getRenderTargetTexture(group.task.geometryViewDepthTexture, "r16float");
		}

		// The groups not requested anymore (pipeline disposed, etc.) are disposed.
		this._groups.forEach((group, key) => {
			if (this._frame - group.lastUsedFrame > unusedGroupFrames) {
				group.task.dispose();
				this._groups.delete(key);
			}
		});
	}

	/**
	 * Renders the geometry textures requested this frame.
	 * @returns the number of draw calls.
	 */
	public execute(): number {
		let draws = 0;

		const canvas = this._scene.surface.canvas;

		this._active.forEach((group) => {
			// The textures are created when the task is recorded, sized as the surface.
			if (!group.recorded || group.width !== canvas.width || group.height !== canvas.height) {
				group.task.record();
				group.recorded = true;
				group.width = canvas.width;
				group.height = canvas.height;
			}

			if (group.prePass) {
				this._sortTransparentMeshes(group);
			}

			draws += group.task.execute?.() ?? 0;

			if (group.prePass) {
				// Marks the task for the materials (see "_createMaterialImageProcessingPlugin"): Babylon.js tests the alpha of
				// the material to write the geometry of the transparent meshes.
				const task = group.task as unknown as { _sceneUBO: GPUBuffer };
				_getDevice(this._scene.surface.engine).queue.writeBuffer(task._sceneUBO, prePassMarkerOffset, prePassMarker);
			}
		});

		draws += this._prePass.execute();
		draws += this._depthRenderer.execute();
		draws += this._backDepthRenderer.execute();

		return draws;
	}

	/**
	 * Offsets the geometry textures rendered this frame (see `IPostProcessContext.jitterProjection` and
	 * `IPostProcessContext.jitterVertices`). The tasks write their uniforms each time they are executed: called after
	 * `execute`, before the commands of the frame are submitted. The geometry renderer tasks compute the depth and the
	 * normals from the view matrix: their view projection only offsets the rasterization. Same as Babylon.js, the depth
	 * renderers are not offset (their render targets compute the projection of the camera again).
	 * @param x defines the offset on the x axis, in clip space.
	 * @param y defines the offset on the y axis, in clip space.
	 * @param projection defines wether or not the projection is offset (the velocity is computed from the offset
	 * positions), or only the vertices drawn by the materials once the velocity is computed: same as the TAA material
	 * manager of Babylon.js, the textures of the pre-pass are offset (drawn by the materials).
	 */
	public jitter(x: number, y: number, projection: boolean): void {
		const device = _getDevice(this._scene.surface.engine);

		this._active.forEach((group) => {
			if (projection || group.prePass) {
				const task = group.task as unknown as { _sceneUBO: GPUBuffer; _sceneData: Float32Array };
				_writeJitteredViewProjection(device, { buffer: task._sceneUBO, data: task._sceneData }, x, y);
			}
		});

		this._prePass.jitter(x, y, projection);
	}

	/**
	 * Disposes the tasks and the textures.
	 */
	public dispose(): void {
		this._groups.forEach((group) => group.task.dispose());
		this._groups.clear();

		this._prePass.dispose();
		this._depthRenderer.dispose();
		this._backDepthRenderer.dispose();
	}

	private _getAttachment(task: GeometryRendererTask, type: GeometryTextureType): RenderTarget | null {
		switch (type) {
			case GeometryTextureType.VIEW_DEPTH:
				return task.geometryViewDepthTexture;
			case GeometryTextureType.VIEW_NORMAL:
				return task.geometryViewNormalTexture;
			case GeometryTextureType.WORLD_NORMAL:
				return task.geometryWorldNormalTexture;
			case GeometryTextureType.REFLECTIVITY:
				return task.geometryReflectivityTexture;
			default:
				return null;
		}
	}

	private _getGroup(key: string, descriptions: { type: GeometryTextureType; format?: GPUTextureFormat; clearValue?: GPUColor }[]): IGeometryGroup {
		let group = this._groups.get(key);
		if (!group) {
			const task = createGeometryRendererTask(
				{
					name: `editor-geometry-${key}`,
					samples: 1,
					textureDescriptions: descriptions.map((description) => ({ type: description.type, format: description.format, clearValue: description.clearValue })),
				},
				this._scene.surface.engine,
				this._scene
			);

			group = { key, task, width: 0, height: 0, recorded: false, lastUsedFrame: 0, prePass: false };
			this._groups.set(key, group);
		}

		group.lastUsedFrame = this._frame;
		this._active.push(group);
		return group;
	}

	/**
	 * Sorts the transparent meshes of the given group from back to front, as Babylon.js renders them (the geometry
	 * renderer tasks of Babylon Lite draw them after the opaque meshes, in the order of the scene). The task syncs its
	 * meshes when they changed: they are sorted the next frame.
	 */
	private _sortTransparentMeshes(group: IGeometryGroup): void {
		const task = group.task as unknown as { _bound: { _mesh: Mesh }[]; _boundVer: number };
		const camera = this._scene.camera;
		if (!camera || task._boundVer !== (this._scene as unknown as { _renderableVersion: number })._renderableVersion) {
			return;
		}

		// The transparent meshes drawn last.
		const bound = task._bound;
		let firstTransparent = bound.length;
		while (firstTransparent > 0 && _isMaterialAlphaBlended(bound[firstTransparent - 1]._mesh.material)) {
			firstTransparent--;
		}

		if (bound.length - firstTransparent < 2) {
			return;
		}

		const cameraWorld = camera.worldMatrix;
		const distances = new Map(bound.slice(firstTransparent).map((b) => [b, _getMeshDistanceToCamera(b._mesh, cameraWorld)]));

		const transparent = bound.slice(firstTransparent).sort((a, b) => distances.get(b)! - distances.get(a)!);
		bound.splice(firstTransparent, transparent.length, ...transparent);
	}
}
