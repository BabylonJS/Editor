import {
	addTask,
	AcesToneMapping,
	Camera,
	createRenderTarget,
	createRenderTask,
	createSceneContext,
	createSurfaceRenderTargetTexture,
	EngineContext,
	getFrameGraph,
	NeutralToneMapping,
	RenderTargetTextureResult,
	RenderTask,
	SceneContext,
	setSceneImageProcessing,
	StandardToneMapping,
	SurfaceContext,
	Task,
	ToneMapping,
} from "@babylonjs/lite";

import { getSceneData } from "../tools/scene";

import { renderingPipelinesOrder } from "./order";

import "./post-process/includes";
import { PostProcessGeometryRenderers } from "./post-process/geometry";
import { PostProcessTargetPool } from "./post-process/targets";
import { IPostProcessContext, IPostProcessGeometryRequest, IPostProcessPipeline, IPostProcessSceneLayer } from "./post-process/context";
import { _getDevice, IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "./post-process/pass";
import { _writeJitteredViewProjection } from "./post-process/jitter";

import { passFragmentWGSL } from "./default/shaders";
import { getSceneImageProcessingConfiguration } from "./default/image-processing";

export { _computeColorCurves, ColorCurves, IColorCurves } from "./default/image-processing";

/**
 * Defines a color grading lookup table loaded as a 3D texture (see `ColorGradingTexture`).
 */
export interface IColorGradingLookupTable {
	/**
	 * Defines the 3D texture of the lookup table, null until loaded.
	 */
	texture: unknown;
	/**
	 * Defines the number of values of the lookup table along each axis of the color cube.
	 */
	size: number;
	/**
	 * Defines the level (weight) of the color grading.
	 */
	level: number;
}

const editorScenes = new WeakSet<SceneContext>();
const scenesPipelines = new WeakMap<SceneContext, Set<IPostProcessPipeline>>();
const scenesRenderingChains = new WeakMap<SceneContext, _RenderingChain>();

/**
 * Creates a new Babylon Lite scene ready to render the editor scenes with their rendering pipelines: the scene is
 * created without the default render task of Babylon Lite and the tools render it through their own frame graph
 * tasks, created when the scene is loaded using `loadScene`. The scene is rendered in a half float texture then the
 * rendering pipelines configured in the editor process it, as Babylon.js does (SSAO, volumetric lighting, SSR, default
 * rendering pipeline and TAA).
 * The scenes created using `createSceneContext` of Babylon Lite are rendered without post-processes.
 * @param surface defines the surface the scene renders to (the engine itself in the common single-canvas case).
 * @returns the new scene.
 */
export function createEditorSceneContext(surface: SurfaceContext): SceneContext {
	const scene = createSceneContext(surface, { defaultRenderTask: false });
	editorScenes.add(scene);

	return scene;
}

/**
 * Returns wether or not the given scene has been created using `createEditorSceneContext`.
 * @param scene defines the reference to the scene to check.
 */
export function isEditorSceneContext(scene: SceneContext): boolean {
	return editorScenes.has(scene);
}

/**
 * @internal
 * Registers the given rendering pipeline: it renders the cameras it is attached to once the frame graph tasks of the
 * scene are built (see `_buildSceneRenderTasks`).
 */
export function _registerPostProcessPipeline(scene: SceneContext, pipeline: IPostProcessPipeline): void {
	let pipelines = scenesPipelines.get(scene);
	if (!pipelines) {
		pipelines = new Set();
		scenesPipelines.set(scene, pipelines);
	}

	pipelines.add(pipeline);
}

const scenesLayers = new WeakMap<SceneContext, Set<IPostProcessSceneLayer>>();

/**
 * @internal
 * Registers the given layer, drawn over the scene before the rendering pipelines (see `IPostProcessSceneLayer`).
 */
export function _registerSceneLayer(scene: SceneContext, layer: IPostProcessSceneLayer): void {
	let layers = scenesLayers.get(scene);
	if (!layers) {
		layers = new Set();
		scenesLayers.set(scene, layers);
	}

	layers.add(layer);
}

/**
 * @internal
 * Unregisters the given layer.
 */
export function _unregisterSceneLayer(scene: SceneContext, layer: IPostProcessSceneLayer): void {
	scenesLayers.get(scene)?.delete(layer);
}

/**
 * @internal
 * Unregisters the given rendering pipeline.
 */
export function _unregisterPostProcessPipeline(scene: SceneContext, pipeline: IPostProcessPipeline): void {
	scenesPipelines.get(scene)?.delete(pipeline);
}

/**
 * @internal
 * Returns the rendering pipelines rendering the given camera this frame, sorted in the order Babylon.js renders them.
 */
export function _getActivePostProcessPipelines(scene: SceneContext, camera: Camera | null): IPostProcessPipeline[] {
	const pipelines = scenesPipelines.get(scene);
	if (!pipelines || !camera) {
		return [];
	}

	const order = (pipeline: IPostProcessPipeline) => {
		const index = renderingPipelinesOrder.indexOf(pipeline.getClassName());
		return index === -1 ? renderingPipelinesOrder.length : index;
	};

	return Array.from(pipelines)
		.filter((pipeline) => pipeline.isActiveForCamera(camera))
		.sort((a, b) => order(a) - order(b));
}

/**
 * @internal
 * Kept for compatibility: the frame graph tasks of the tools render any pipeline created at any time.
 * @returns always true.
 */
export function _requestRenderingStages(scene: SceneContext, stages: unknown): boolean {
	void scene;
	void stages;
	return true;
}

/**
 * @internal
 * Returns the frame graph tasks built by the tools for the given scene, if any.
 */
export function _getSceneRenderingChain(scene: SceneContext): unknown {
	return scenesRenderingChains.get(scene) ?? null;
}

/**
 * @internal
 * Returns wether or not the frame graph tasks of the given scene have been built by the tools.
 */
export function _hasSceneRenderTasks(scene: SceneContext): boolean {
	return scenesRenderingChains.has(scene);
}

/**
 * @internal
 * Builds the frame graph tasks of the given scene when it has been created using `createEditorSceneContext`.
 * Does nothing for the other scenes (rendered by the default render task of Babylon Lite) and when the tasks are
 * already built.
 */
export function _buildSceneRenderTasks(scene: SceneContext): void {
	if (!editorScenes.has(scene)) {
		// The scenes rendered by the default render task of Babylon Lite: the materials apply the image processing.
		_watchSceneImageProcessing(scene);
		return;
	}

	if (scenesRenderingChains.has(scene)) {
		return;
	}

	scenesRenderingChains.set(scene, new _RenderingChain(scene));
}

function getToneMapping(toneMappingType: number): ToneMapping {
	switch (toneMappingType) {
		case 1:
			return AcesToneMapping;
		case 2:
			return NeutralToneMapping;
		default:
			return StandardToneMapping;
	}
}

/**
 * Returns the tone mapping the materials of Babylon Lite apply in the given scene, as the value of the "TONEMAPPING"
 * define of Babylon.js: 0 none, 1 standard, 2 ACES and 3 Khronos PBR neutral.
 * @param scene defines the reference to the scene.
 * @internal
 */
export function _getMaterialsToneMapping(scene: SceneContext): number {
	const imageProcessing = scene.imageProcessing;
	if (imageProcessing.toneMappingEnabled !== true) {
		return 0;
	}

	switch ((imageProcessing.toneMapping ?? StandardToneMapping).id) {
		case AcesToneMapping.id:
			return 2;
		case NeutralToneMapping.id:
			return 3;
		default:
			return 1;
	}
}

const toneMappingUpdates = new WeakMap<SceneContext, Promise<void>>();
const imageProcessingWatchedScenes = new WeakSet<SceneContext>();

/**
 * Applies the exposure, the contrast and the tone mapping of the image processing configuration of the given scene to
 * the materials of Babylon Lite (the scenes rendered without the frame graph tasks of the tools).
 */
function applyImageProcessingSettings(scene: SceneContext): void {
	const configuration = getSceneImageProcessingConfiguration(scene);
	const imageProcessing = scene.imageProcessing;

	const enabled = configuration.isEnabled;
	const toneMappingEnabled = enabled && configuration.toneMappingEnabled;
	const toneMapping = getToneMapping(configuration.toneMappingType);

	// Exposure and contrast are read each frame by the materials.
	imageProcessing.exposure = enabled ? configuration.exposure : 1;
	imageProcessing.contrast = enabled ? configuration.contrast : 1;

	// The tone mapping is compiled in the shaders of the materials: they are built again when it changes.
	if (toneMappingUpdates.has(scene)) {
		return;
	}

	if (imageProcessing.toneMappingEnabled === toneMappingEnabled && (!toneMappingEnabled || (imageProcessing.toneMapping ?? StandardToneMapping).id === toneMapping.id)) {
		return;
	}

	toneMappingUpdates.set(
		scene,
		setSceneImageProcessing(scene, { toneMappingEnabled, toneMapping })
			.catch((e) => console.error(e))
			.finally(() => toneMappingUpdates.delete(scene))
	);
}

/**
 * @internal
 * Applies each frame the image processing configuration of the given scene (exposure, contrast and tone mapping) to
 * the configuration of the scene used by the materials of Babylon Lite. Used by the scenes rendered without the frame
 * graph tasks of the tools: the editor scenes apply the image processing as Babylon.js does (by a post-process or in
 * the materials, see the material plugins of the tools).
 */
export function _watchSceneImageProcessing(scene: SceneContext): void {
	if (editorScenes.has(scene) || imageProcessingWatchedScenes.has(scene)) {
		return;
	}

	imageProcessingWatchedScenes.add(scene);

	applyImageProcessingSettings(scene);
	getSceneData(scene).onBeforeRenderObservable.add(() => applyImageProcessingSettings(scene));
}

/**
 * Defines the configuration of the texture the scene renders into.
 */
interface ISceneTargetConfiguration {
	format: GPUTextureFormat;
	samples: number;
}

/**
 * The frame graph task rendering the post-processes of the rendering pipelines, executed after the scene.
 */
class PostProcessesTask implements Task {
	public readonly name: string = "editor-post-processes";
	public readonly engine: EngineContext;
	public readonly scene: SceneContext;

	public readonly _passes: unknown[] = [];

	private _execute: () => number;

	public constructor(engine: EngineContext, scene: SceneContext, execute: () => number) {
		this.engine = engine;
		this.scene = scene;
		this._execute = execute;
	}

	public record(): void {
		// The passes create their resources when drawn.
	}

	public execute(): number {
		return this._execute();
	}

	public dispose(): void {
		// The resources are owned by the rendering chain.
	}
}

/**
 * The frame graph tasks rendering a scene created using `createEditorSceneContext` and its rendering pipelines, the
 * same way Babylon.js renders the post-processes of a camera:
 * - the scene renders into a half float texture (the type of the textures of the rendering pipelines of the tools), or
 *   into a texture of the format of the canvas when no pipeline renders the camera,
 * - the pipelines rendering the active camera process it in the order of `renderingPipelinesOrder`, the last pass
 *   drawing into the canvas.
 * The pipelines are drawn by a single task: they can be created, enabled, disabled and changed at any time.
 */
class _RenderingChain {
	public readonly scene: SceneContext;

	private _engine: EngineContext;
	private _surface: SurfaceContext;

	private _configuration: ISceneTargetConfiguration;
	private _sceneTarget: RenderTargetTextureResult;
	private _renderTask: RenderTask;
	private _postProcessesTask: PostProcessesTask;

	private _clearColor: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 1 };

	private _pool: PostProcessTargetPool;
	private _geometry: PostProcessGeometryRenderers;
	private _copyPass: PostProcessPass | null = null;

	private _activePipelines: IPostProcessPipeline[] = [];
	private _frameId: number = 0;

	private _sceneJittered: boolean = false;
	private _jitteredThisFrame: boolean = false;

	public constructor(scene: SceneContext) {
		this.scene = scene;

		this._surface = scene.surface;
		this._engine = this._surface.engine;

		this._pool = new PostProcessTargetPool(this._engine);
		this._geometry = new PostProcessGeometryRenderers(scene);

		// The materials of the editor scenes apply the image processing as Babylon.js does: the image processing of
		// Babylon Lite is kept neutral (it would apply the exposure, the tone mapping and the contrast a second time).
		scene.imageProcessing.exposure = 1;
		scene.imageProcessing.contrast = 1;
		if (scene.imageProcessing.toneMappingEnabled) {
			setSceneImageProcessing(scene, { toneMappingEnabled: false }).catch((e) => console.error(e));
		}

		this._activePipelines = _getActivePostProcessPipelines(scene, scene.camera);
		this._configuration = this._getSceneTargetConfiguration();

		const { target, renderTask } = this._createSceneRenderTask(this._configuration);
		this._sceneTarget = target;
		this._renderTask = renderTask;

		this._postProcessesTask = new PostProcessesTask(this._engine, scene, () => this._renderPostProcesses());

		addTask(scene, this._renderTask);
		addTask(scene, this._postProcessesTask);

		getSceneData(scene).onBeforeRenderObservable.add(() => this._update());

		// The frame graph of a scene already registered must be built again to include the new tasks.
		this._rebuildFrameGraph();
	}

	private _rebuildFrameGraph(): void {
		if ((this.scene as { _built?: boolean })._built) {
			getFrameGraph(this.scene).build();
		}
	}

	/**
	 * Returns the configuration of the texture the scene renders into: half floats when a pipeline renders the camera
	 * (with the samples of the first pipeline), the format and the samples of the canvas otherwise.
	 */
	private _getSceneTargetConfiguration(): ISceneTargetConfiguration {
		const first = this._activePipelines[0];
		if (!first) {
			return { format: this._surface.format, samples: this._surface.msaaSamples > 1 ? 4 : 1 };
		}

		// WebGPU supports 1 or 4 samples.
		return { format: "rgba16float", samples: (first.getSceneSamples?.() ?? 1) > 1 ? 4 : 1 };
	}

	private _createSceneRenderTask(configuration: ISceneTargetConfiguration): { target: RenderTargetTextureResult; renderTask: RenderTask } {
		const msaa = configuration.samples > 1;

		const target = createSurfaceRenderTargetTexture(this._engine, {
			lbl: "editor-scene",
			format: configuration.format,
			dFormat: msaa ? undefined : "depth24plus-stencil8",
			samples: 1,
			size: this._surface,
		});

		const msaaTarget = msaa
			? createRenderTarget({ lbl: "editor-scene-msaa", format: configuration.format, dFormat: "depth24plus-stencil8", samples: configuration.samples, size: this._surface })
			: null;

		const renderTask = createRenderTask(
			{
				name: "scene",
				rt: msaaTarget ?? target.rt,
				rst: msaaTarget ? target.rt : undefined,
				clrColor: this._clearColor,
				clr: true,
			},
			this._engine,
			this.scene
		);

		return { target, renderTask };
	}

	/**
	 * Creates the texture the scene renders into again when its configuration changed (a pipeline started or stopped
	 * rendering the camera): the render task is replaced in the frame graph, which is built again.
	 */
	private _updateSceneTarget(): void {
		const configuration = this._getSceneTargetConfiguration();
		if (configuration.format === this._configuration.format && configuration.samples === this._configuration.samples) {
			return;
		}

		this._configuration = configuration;

		const frameGraph = getFrameGraph(this.scene) as unknown as { _tasks: Task[] };
		const index = frameGraph._tasks.indexOf(this._renderTask);

		const previousTask = this._renderTask;

		// The previous task disposes the targets it renders into.
		const { target, renderTask } = this._createSceneRenderTask(configuration);
		this._sceneTarget = target;
		this._renderTask = renderTask;

		if (index !== -1) {
			frameGraph._tasks[index] = renderTask;
		}

		previousTask.dispose();

		this._rebuildFrameGraph();
	}

	/**
	 * Updates the configuration of the rendering before the scene is rendered.
	 */
	private _update(): void {
		const camera = this.scene.camera;

		this._activePipelines = _getActivePostProcessPipelines(this.scene, camera);
		this._updateSceneTarget();

		// Same as Babylon.js: the texture the scene renders into is cleared with the clear color of the scene, processed
		// afterwards by the image processing post-process when enabled.
		const clearColor = this.scene.clearColor;
		this._clearColor.r = clearColor.r;
		this._clearColor.g = clearColor.g;
		this._clearColor.b = clearColor.b;
		this._clearColor.a = clearColor.a;

		// Geometry textures requested by the pipelines for this frame.
		const requests: IPostProcessGeometryRequest = {};
		if (camera) {
			const width = this._surface.canvas.width;
			const height = this._surface.canvas.height;

			this._activePipelines.forEach((pipeline) => {
				pipeline.beforeRender?.({
					engine: this._engine,
					scene: this.scene,
					camera,
					width,
					height,
					requestGeometry: (request) => Object.assign(requests, Object.fromEntries(Object.entries(request).filter(([, value]) => value))),
				});
			});
		}

		this._geometry.update(requests);
	}

	private _getSceneColorTexture(): IPostProcessTexture {
		const texture = this._sceneTarget.texture;
		return {
			view: texture.view,
			width: texture.width,
			height: texture.height,
			format: this._configuration.format,
			topDown: true,
		};
	}

	private _copy(source: IPostProcessTexture, target: IPostProcessTarget): number {
		this._copyPass ??= new PostProcessPass(this._engine, { name: "editor-copy", fragment: passFragmentWGSL });
		this._copyPass.setTexture("textureSampler", source, "nearest");
		return this._copyPass.draw(target);
	}

	/**
	 * Renders the post-processes of the pipelines rendering the active camera.
	 */
	private _renderPostProcesses(): number {
		const camera = this.scene.camera;
		const swapchain = (this._surface.scRT as unknown as { _colorView: GPUTextureView | null })._colorView;
		if (!camera || !swapchain) {
			return 0;
		}

		const width = this._surface.canvas.width;
		const height = this._surface.canvas.height;

		const output: IPostProcessTarget = { view: swapchain, width, height, format: this._surface.format, topDown: true };

		let draws = this._geometry.execute();

		const context: IPostProcessContext = {
			engine: this._engine,
			scene: this.scene,
			camera,
			width,
			height,
			textureFormat: "rgba16float",
			pool: this._pool,
			geometry: this._geometry.textures,
			deltaMs: getSceneData(this.scene).deltaMs,
			frameId: this._frameId++,
			pipelines: this._activePipelines,
			jitterProjection: (x, y, includeGeometry) => this._jitterProjection(x, y, includeGeometry),
			jitterVertices: (x, y) => this._jitterVertices(x, y),
		};

		const sceneColor = this._getSceneColorTexture();
		let current: IPostProcessTexture = sceneColor;

		// Same as the effect layers of Babylon.js: the layers are drawn over the scene before the post-processes.
		scenesLayers.get(this.scene)?.forEach((layer) => {
			if (layer.isActiveForCamera(camera)) {
				draws += layer.render(context, sceneColor);
			}
		});

		this._activePipelines.forEach((pipeline, index) => {
			const isLast = index === this._activePipelines.length - 1;
			const result = pipeline.render(context, current, isLast ? output : null);

			if (result !== current) {
				this._pool.release(current as IPostProcessTarget);
			}

			current = result;
		});

		if (current !== output) {
			draws += this._copy(current, output);
		}

		// The scene task writes its uniforms only when the camera changed: the view projection jittered the previous frame
		// is restored when no pipeline jitters it anymore.
		if (this._sceneJittered && !this._jitteredThisFrame) {
			_writeJitteredViewProjection(this.device, this._getSceneUniforms(), 0, 0);
		}

		this._sceneJittered = this._jitteredThisFrame;
		this._jitteredThisFrame = false;

		this._pool.endFrame();

		return draws;
	}

	/**
	 * Returns the uniforms of the scene written by the render task of the scene.
	 */
	private _getSceneUniforms(): { buffer: GPUBuffer; data: Float32Array } {
		const task = this._renderTask as unknown as { _sceneUBO: GPUBuffer; _suData: Float32Array };
		return { buffer: task._sceneUBO, data: task._suData };
	}

	/**
	 * Offsets the projection of the camera for the draws of the frame (see `IPostProcessContext.jitterProjection`).
	 */
	private _jitterProjection(x: number, y: number, includeGeometry: boolean): void {
		_writeJitteredViewProjection(this.device, this._getSceneUniforms(), x, y);

		if (includeGeometry) {
			this._geometry.jitter(x, y, true);
		}

		this._jitteredThisFrame = true;
	}

	/**
	 * Offsets the vertices of the meshes drawn for the frame (see `IPostProcessContext.jitterVertices`). The velocity
	 * computed by the materials of Babylon Lite is not used: the scene is offset by its view projection.
	 */
	private _jitterVertices(x: number, y: number): void {
		_writeJitteredViewProjection(this.device, this._getSceneUniforms(), x, y);
		this._geometry.jitter(x, y, false);

		this._jitteredThisFrame = true;
	}

	/**
	 * Returns the device of the engine rendering the scene.
	 */
	public get device(): GPUDevice {
		return _getDevice(this._engine);
	}
}
