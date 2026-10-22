import { Camera, SceneContext, Task, Texture2D } from "@babylonjs/lite";

import { warnOnce } from "../tools/warn";

import { IRenderingOptions } from "./tools";
import { _registerPostProcessPipeline, _unregisterPostProcessPipeline, isEditorSceneContext } from "./pipeline";

import { IPostProcessBeforeRenderContext, IPostProcessContext, IPostProcessPipeline } from "./post-process/context";
import { _getDevice, _getPostProcessSampler, IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "./post-process/pass";

import { passFragmentWGSL } from "./default/shaders";

import { _VolumetricLightingPasses, VolumetricLightingRenderingPipeline } from "./volumetric/pipeline";
import { IVolumetricLightingConfiguration, normalizeVolumetricLightingConfiguration } from "./volumetric/types";

let volumetricLightingRenderingPipeline: VolumetricLightingRenderingPipeline | null = null;

/**
 * Defines the configuration of the volumetric lighting rendering pipeline for all cameras.
 */
let configuration: any = null;

/**
 * Renders the volumetric lighting rendering pipeline in the frame graph tasks of the tools: the passes of the pipeline
 * are drawn after the SSAO, before the screen space reflections and the default rendering pipeline.
 */
class VolumetricLightingPostProcessPipeline implements IPostProcessPipeline {
	public readonly pipeline: VolumetricLightingRenderingPipeline;

	private _passes: _VolumetricLightingPasses | null = null;
	private _tasks: Task[] = [];

	private _input: IPostProcessTexture | null = null;
	private _depth: IPostProcessTexture | null = null;
	private _copyPass: PostProcessPass | null = null;

	public constructor(pipeline: VolumetricLightingRenderingPipeline) {
		this.pipeline = pipeline;
	}

	public getClassName(): string {
		return "VolumetricLightingRenderingPipeline";
	}

	public isActiveForCamera(camera: Camera): boolean {
		return !this.pipeline.isDisposed && this.pipeline.camera === camera;
	}

	public getSceneSamples(): number {
		return this.pipeline.msaaSamples;
	}

	public beforeRender(context: IPostProcessBeforeRenderContext): void {
		context.requestGeometry({ volumetricDepth: true });
	}

	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget | null): IPostProcessTexture {
		// Same as the Babylon.js version of the tools: the depth of the pre-pass when the scene renders one.
		const depth = context.geometry.volumetricDepth ?? context.geometry.viewDepth;
		if (!depth) {
			return input;
		}

		// The shaders of the volumetric lighting read textures storing their first row at the top, as the textures of
		// Babylon Lite: the output of a previous pipeline (stored as Babylon.js stores its render targets) is copied first.
		let copy: IPostProcessTarget | null = null;
		if (!input.topDown) {
			copy = context.pool.acquire(input.width, input.height, input.format);

			this._copyPass ??= new PostProcessPass(context.engine, { name: "volumetric-lighting-input", fragment: passFragmentWGSL });
			this._copyPass.setTexture("textureSampler", input, "nearest");
			this._copyPass.draw({ view: copy.view, width: copy.width, height: copy.height, format: copy.format, topDown: true });
		}

		this._input = copy ? { view: copy.view, width: copy.width, height: copy.height, format: copy.format, topDown: true } : input;
		this._depth = depth;

		if (!this._passes) {
			const engine = context.engine;
			const sampler = _getPostProcessSampler(_getDevice(engine), "bilinear", "clamp", true);

			// The textures read by the passes follow the input of the pipeline, which changes from one frame to the next.
			const self = this;
			const sceneColor = {
				get texture() {
					return null;
				},
				get view() {
					return self._input!.view;
				},
				get width() {
					return self._input!.width;
				},
				get height() {
					return self._input!.height;
				},
				sampler,
			} as unknown as Texture2D;

			const linearDepth = {
				get view() {
					return self._depth!.view;
				},
				get width() {
					return self._depth!.width;
				},
				get height() {
					return self._depth!.height;
				},
				sampler,
			} as unknown as Texture2D;

			this._passes = new _VolumetricLightingPasses(context.scene, sceneColor, linearDepth, (task) => this._tasks.push(task), context.textureFormat);
		}

		// Same as Babylon.js: the light shafts are added to the color of the scene, in linear space when the default
		// rendering pipeline applies the image processing after them.
		const swapchain = target ? context.scene.surface.scRT : undefined;
		this._passes.update(this.pipeline, { linear: false, exposure: 1, contrast: 1, toneMapping: 0 }, true, swapchain);

		this._tasks.forEach((task) => {
			if (task.executionEnabled !== false) {
				task.execute?.();
			}
		});

		context.pool.release(copy);

		if (target) {
			return target;
		}

		const output = this._passes.output.texture;
		return { view: output.view, width: output.width, height: output.height, format: context.textureFormat, topDown: true };
	}

	public dispose(): void {
		this._passes?.dispose();
		this._passes = null;
		this._tasks = [];

		this._copyPass?.dispose();
		this._copyPass = null;
	}
}

const postProcessPipelines = new WeakMap<VolumetricLightingRenderingPipeline, VolumetricLightingPostProcessPipeline>();

/**
 * Registers the given volumetric lighting rendering pipeline in the frame graph tasks of its scene.
 */
function registerPipeline(pipeline: VolumetricLightingRenderingPipeline): void {
	if (postProcessPipelines.has(pipeline)) {
		return;
	}

	const postProcessPipeline = new VolumetricLightingPostProcessPipeline(pipeline);
	postProcessPipelines.set(pipeline, postProcessPipeline);

	_registerPostProcessPipeline(pipeline.scene, postProcessPipeline);
}

/**
 * Unregisters the given volumetric lighting rendering pipeline from the frame graph tasks of its scene.
 */
function unregisterPipeline(pipeline: VolumetricLightingRenderingPipeline): void {
	const postProcessPipeline = postProcessPipelines.get(pipeline);
	if (postProcessPipeline) {
		postProcessPipelines.delete(pipeline);
		postProcessPipeline.dispose();

		_unregisterPostProcessPipeline(pipeline.scene, postProcessPipeline);
	}
}

export function getVolumetricLightingRenderingPipelineConfiguration(): any {
	return configuration;
}

export function setVolumetricLightingRenderingPipelineConfiguration(config: any) {
	configuration = config;
}

export function getVolumetricLightingRenderingPipeline(): VolumetricLightingRenderingPipeline | null {
	if (volumetricLightingRenderingPipeline?.isDisposed) {
		volumetricLightingRenderingPipeline = null;
	}

	return volumetricLightingRenderingPipeline;
}

/**
 * Sets the reference to the volumetric lighting rendering pipeline.
 * @access editor only.
 */
export function setVolumetricLightingRenderingPipelineRef(pipeline: VolumetricLightingRenderingPipeline | null): void {
	volumetricLightingRenderingPipeline = pipeline;

	if (pipeline) {
		registerPipeline(pipeline);
	}
}

/**
 * Returns wether or not the volumetric lighting rendering pipeline is supported by the engine of the scene: Babylon Lite
 * runs on WebGPU only, which supports everything the pipeline needs.
 * @param scene defines the reference to the scene to check.
 */
export function isVolumetricLightingSupported(scene: SceneContext): boolean {
	return scene ? VolumetricLightingRenderingPipeline.IsSupported(scene.surface.engine) : false;
}

export function disposeVolumetricLightingRenderingPipeline(): void {
	if (volumetricLightingRenderingPipeline) {
		unregisterPipeline(volumetricLightingRenderingPipeline);

		volumetricLightingRenderingPipeline.dispose();
		volumetricLightingRenderingPipeline = null;
	}
}

export function createVolumetricLightingRenderingPipeline(scene: SceneContext, camera: Camera, options?: IRenderingOptions): VolumetricLightingRenderingPipeline {
	volumetricLightingRenderingPipeline = new VolumetricLightingRenderingPipeline("VolumetricLightingRenderingPipeline", scene, camera);
	volumetricLightingRenderingPipeline.msaaSamples = options?.msaaSamples ?? 1;

	registerPipeline(volumetricLightingRenderingPipeline);

	return volumetricLightingRenderingPipeline;
}

export function serializeVolumetricLightingRenderingPipeline(): any {
	if (!volumetricLightingRenderingPipeline) {
		return null;
	}

	return volumetricLightingRenderingPipeline.serializeConfiguration();
}

export function parseVolumetricLightingRenderingPipeline(scene: SceneContext, camera: Camera, data: any, options?: IRenderingOptions): VolumetricLightingRenderingPipeline {
	const pipeline = getVolumetricLightingRenderingPipeline() ?? createVolumetricLightingRenderingPipeline(scene, camera, options);
	pipeline.msaaSamples = options?.msaaSamples ?? 1;

	// A project saved before the medium was derived from the size of the scene has no value stored for it,
	// and the static defaults would be wrong for anything but a scene authored in centimetres.
	const configuration = { ...data };
	if (configuration.fogDensity === undefined) {
		configuration.fogDensity = VolumetricLightingRenderingPipeline.GetDefaultFogDensity(pipeline.scene, pipeline.camera);
	}
	if (configuration.fogEnd === undefined) {
		configuration.fogEnd = VolumetricLightingRenderingPipeline.GetDefaultFogEnd(pipeline.scene, pipeline.camera);
	}
	if (configuration.screenSpaceShadowMaxDistance === undefined) {
		configuration.screenSpaceShadowMaxDistance = VolumetricLightingRenderingPipeline.GetDefaultFogEnd(pipeline.scene, pipeline.camera);
	}

	pipeline.applyConfiguration(normalizeVolumetricLightingConfiguration(configuration) as IVolumetricLightingConfiguration);

	if (!isEditorSceneContext(scene)) {
		warnOnce("volumetric-lighting-editor-scene", "the volumetric lighting rendering pipeline is rendered only by the scenes created using createEditorSceneContext.");
	}

	return pipeline;
}

/**
 * Marks the list of lights contributing to the volumetric lighting as dirty. Called when the volumetric
 * configuration of a light is edited so the effect updates without waiting for the next selection pass.
 */
export function markVolumetricLightsDirty(): void {
	volumetricLightingRenderingPipeline?.markLightsDirty();
}
