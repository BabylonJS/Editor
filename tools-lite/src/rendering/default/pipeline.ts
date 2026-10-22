import { Camera, SceneContext } from "@babylonjs/lite";

import { Observable, Observer } from "../../tools/observable";

import { IPostProcessBeforeRenderContext, IPostProcessContext, IPostProcessPipeline } from "../post-process/context";
import { IPostProcessTarget, IPostProcessTexture } from "../post-process/pass";
import { _registerPostProcessPipeline, _unregisterPostProcessPipeline } from "../pipeline";

import { FxaaPostProcess } from "./fxaa";
import { BloomEffect } from "./bloom";
import { GrainPostProcess } from "./grain";
import { GlowLayer } from "./glow-layer";
import { SharpenPostProcess } from "./sharpen";
import { ChromaticAberrationPostProcess } from "./chromatic-aberration";
import { DepthOfFieldEffect, DepthOfFieldEffectBlurLevel } from "./depth-of-field";
import { getSceneImageProcessingConfiguration, ImageProcessingConfiguration, ImageProcessingPostProcess } from "./image-processing";

/**
 * Defines an effect of the default rendering pipeline, rendered from its input into the given target.
 */
interface IDefaultRenderingPipelineEffect {
	render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget): number;
}

/**
 * Returns the hardware scaling level of the given scene, same as Babylon.js `engine.getHardwareScalingLevel()` with an
 * engine adapting to the device ratio: the ratio of the size of the canvas on the page to its size in pixels.
 */
function getHardwareScalingLevel(scene: SceneContext): number {
	const canvas = scene.surface.canvas as HTMLCanvasElement;
	const clientWidth = canvas.clientWidth;

	return clientWidth > 0 && canvas.width > 0 ? clientWidth / canvas.width : 1;
}

/**
 * The default rendering pipeline can be added to a scene to apply common post processing effects such as anti-aliasing
 * or depth of field, same as Babylon.js `DefaultRenderingPipeline`: depth of field, bloom, image processing, sharpen,
 * grain, chromatic aberration, FXAA and glow layer. The effects are rendered by the frame graph tasks of the tools
 * (the scene must be created using `createEditorSceneContext`), with the same shaders as Babylon.js.
 */
export class DefaultRenderingPipeline implements IPostProcessPipeline {
	/**
	 * ID of the sharpen post process,
	 */
	public readonly SharpenPostProcessId: string = "SharpenPostProcessEffect";
	/**
	 * ID of the image processing post process;
	 */
	public readonly ImageProcessingPostProcessId: string = "ImageProcessingPostProcessEffect";
	/**
	 * ID of the Fast Approximate Anti-Aliasing post process;
	 */
	public readonly FxaaPostProcessId: string = "FxaaPostProcessEffect";
	/**
	 * ID of the chromatic aberration post process,
	 */
	public readonly ChromaticAberrationPostProcessId: string = "ChromaticAberrationPostProcessEffect";
	/**
	 * ID of the grain post process
	 */
	public readonly GrainPostProcessId: string = "GrainPostProcessEffect";

	/**
	 * Defines the name of the pipeline.
	 */
	public readonly name: string;

	/**
	 * Sharpen post process which will apply a sharpen convolution to enhance edges
	 */
	public sharpen: SharpenPostProcess;
	/**
	 * Depth of field effect, applies a blur based on how far away objects are from the focus distance.
	 */
	public depthOfField: DepthOfFieldEffect;
	/**
	 * The Fast Approximate Anti-Aliasing post process which attempts to remove aliasing from an image.
	 */
	public fxaa: FxaaPostProcess | null = null;
	/**
	 * Image post processing pass used to perform operations such as tone mapping or color grading.
	 */
	public imageProcessing: ImageProcessingPostProcess | null = null;
	/**
	 * Chromatic aberration post process which will shift rgb colors in the image
	 */
	public chromaticAberration: ChromaticAberrationPostProcess;
	/**
	 * Grain post process which add noise to the image
	 */
	public grain: GrainPostProcess;
	/**
	 * The bloom effect of the pipeline.
	 */
	public bloom: BloomEffect;

	/**
	 * Animations which can be used to tweak settings over a period of time
	 */
	public animations: unknown[] = [];

	/**
	 * This is triggered each time the pipeline has been built.
	 */
	public readonly onBuildObservable: Observable<DefaultRenderingPipeline> = new Observable<DefaultRenderingPipeline>();

	private _scene: SceneContext;
	private _cameras: Camera[];
	private _camerasToBeAttached: Camera[];

	private _glowLayer: GlowLayer | null = null;

	private _sharpenEnabled: boolean = false;
	private _bloomEnabled: boolean = false;
	private _depthOfFieldEnabled: boolean = false;
	private _depthOfFieldBlurLevel: DepthOfFieldEffectBlurLevel = DepthOfFieldEffectBlurLevel.Low;
	private _fxaaEnabled: boolean = false;
	private _imageProcessingEnabled: boolean = true;
	private _bloomScale: number = 0.5;
	private _chromaticAberrationEnabled: boolean = false;
	private _grainEnabled: boolean = false;
	private _buildAllowed: boolean = true;
	private _hardwareScaleLevel: number = 1.0;
	private _bloomKernel: number = 64;
	private _bloomWeight: number = 0.15;
	private _bloomThreshold: number = 0.9;
	private _hdr: boolean;
	private _samples: number = 1;
	private _isDisposed: boolean = false;

	private _effects: IDefaultRenderingPipelineEffect[] = [];
	private _imageProcessingConfigurationObserver: Observer<ImageProcessingConfiguration> | null = null;

	/**
	 * Instantiates a DefaultRenderingPipeline.
	 * @param name The rendering pipeline name (default: "")
	 * @param hdr If high dynamic range textures should be used (default: true)
	 * @param scene The scene linked to this pipeline
	 * @param cameras The array of cameras that the rendering pipeline will be attached to (default: the active camera of the scene)
	 * @param automaticBuild If false, you will have to manually call prepare() to update the pipeline (default: true)
	 */
	public constructor(name: string = "", hdr: boolean = true, scene: SceneContext, cameras?: Camera[], automaticBuild: boolean = true) {
		this.name = name;

		this._scene = scene;
		this._cameras = (cameras ?? (scene.camera ? [scene.camera] : [])).slice();
		this._camerasToBeAttached = this._cameras.slice();
		this._buildAllowed = automaticBuild;

		// WebGPU always supports the half float render targets.
		this._hdr = hdr;

		const engine = scene.surface.engine;

		// Create post processes before hand so they can be modified before enabled.
		this.sharpen = new SharpenPostProcess();
		this.depthOfField = new DepthOfFieldEffect(engine, this._depthOfFieldBlurLevel);

		// To keep the bloom sizes consistent across different display densities, factor in the hardware scaling level.
		this._hardwareScaleLevel = getHardwareScalingLevel(scene);
		this.bloom = new BloomEffect(engine, this._bloomScale, this._bloomWeight, this.bloomKernel / this._hardwareScaleLevel);

		// Same as Babylon.js: the size of the screen used by the chromatic aberration is the size of the rendering when the
		// pipeline is created.
		this.chromaticAberration = new ChromaticAberrationPostProcess(scene.surface.canvas.width, scene.surface.canvas.height);
		this.grain = new GrainPostProcess();

		let avoidReentrancyAtConstructionTime = true;

		const configuration = getSceneImageProcessingConfiguration(scene);
		this._imageProcessingConfigurationObserver = configuration.onUpdateParameters.add(() => {
			this.bloom._exposure = configuration.exposure;

			if (this._imageProcessingEnabled !== configuration.isEnabled) {
				this._imageProcessingEnabled = configuration.isEnabled;

				// Same as Babylon.js: the call to "_buildPipeline" is deferred when the configuration changes while the
				// pipeline is built by the constructor.
				if (avoidReentrancyAtConstructionTime) {
					queueMicrotask(() => this._buildPipeline());
				} else {
					this._buildPipeline();
				}
			}
		});

		_registerPostProcessPipeline(scene, this);

		this._buildPipeline();
		avoidReentrancyAtConstructionTime = false;
	}

	/**
	 * Enable or disable automatic building of the pipeline when effects are enabled and disabled.
	 * If false, you will have to manually call prepare() to update the pipeline.
	 */
	public get automaticBuild(): boolean {
		return this._buildAllowed;
	}

	public set automaticBuild(value: boolean) {
		this._buildAllowed = value;
	}

	/**
	 * Gets active scene
	 */
	public get scene(): SceneContext {
		return this._scene;
	}

	/**
	 * Gets the cameras the pipeline is attached to.
	 */
	public get cameras(): Camera[] {
		return this._cameras;
	}

	/**
	 * Returns wether or not the pipeline has been disposed.
	 */
	public get isDisposed(): boolean {
		return this._isDisposed;
	}

	/**
	 * Enable or disable the sharpen process from the pipeline
	 */
	public get sharpenEnabled(): boolean {
		return this._sharpenEnabled;
	}

	public set sharpenEnabled(enabled: boolean) {
		if (this._sharpenEnabled === enabled) {
			return;
		}

		this._sharpenEnabled = enabled;
		this._buildPipeline();
	}

	/**
	 * Specifies the size of the bloom blur kernel, relative to the final output size
	 */
	public get bloomKernel(): number {
		return this._bloomKernel;
	}

	public set bloomKernel(value: number) {
		this._bloomKernel = value;
		this.bloom.kernel = value / this._hardwareScaleLevel;
	}

	/**
	 * The strength of the bloom.
	 */
	public get bloomWeight(): number {
		return this._bloomWeight;
	}

	public set bloomWeight(value: number) {
		if (this._bloomWeight === value) {
			return;
		}

		this.bloom.weight = value;
		this._bloomWeight = value;
	}

	/**
	 * The luminance threshold to find bright areas of the image to bloom.
	 */
	public get bloomThreshold(): number {
		return this._bloomThreshold;
	}

	public set bloomThreshold(value: number) {
		if (this._bloomThreshold === value) {
			return;
		}

		this.bloom.threshold = value;
		this._bloomThreshold = value;
	}

	/**
	 * The scale of the bloom, lower value will provide better performance.
	 */
	public get bloomScale(): number {
		return this._bloomScale;
	}

	public set bloomScale(value: number) {
		if (this._bloomScale === value) {
			return;
		}

		this._bloomScale = value;

		// recreate bloom and dispose old as this setting is not dynamic
		this._rebuildBloom();
		this._buildPipeline();
	}

	/**
	 * Enable or disable the bloom from the pipeline
	 */
	public get bloomEnabled(): boolean {
		return this._bloomEnabled;
	}

	public set bloomEnabled(enabled: boolean) {
		if (this._bloomEnabled === enabled) {
			return;
		}

		this._bloomEnabled = enabled;
		this._buildPipeline();
	}

	/**
	 * If the depth of field is enabled.
	 */
	public get depthOfFieldEnabled(): boolean {
		return this._depthOfFieldEnabled;
	}

	public set depthOfFieldEnabled(enabled: boolean) {
		if (this._depthOfFieldEnabled === enabled) {
			return;
		}

		this._depthOfFieldEnabled = enabled;
		this._buildPipeline();
	}

	/**
	 * Blur level of the depth of field effect. (Higher blur will effect performance)
	 */
	public get depthOfFieldBlurLevel(): DepthOfFieldEffectBlurLevel {
		return this._depthOfFieldBlurLevel;
	}

	public set depthOfFieldBlurLevel(value: DepthOfFieldEffectBlurLevel) {
		if (this._depthOfFieldBlurLevel === value) {
			return;
		}

		this._depthOfFieldBlurLevel = value;

		// recreate dof and dispose old as this setting is not dynamic
		const oldDof = this.depthOfField;

		this.depthOfField = new DepthOfFieldEffect(this._scene.surface.engine, this._depthOfFieldBlurLevel);
		this.depthOfField.focalLength = oldDof.focalLength;
		this.depthOfField.focusDistance = oldDof.focusDistance;
		this.depthOfField.fStop = oldDof.fStop;
		this.depthOfField.lensSize = oldDof.lensSize;

		oldDof.dispose();

		this._buildPipeline();
	}

	/**
	 * If the anti aliasing is enabled.
	 */
	public get fxaaEnabled(): boolean {
		return this._fxaaEnabled;
	}

	public set fxaaEnabled(enabled: boolean) {
		if (this._fxaaEnabled === enabled) {
			return;
		}

		this._fxaaEnabled = enabled;
		this._buildPipeline();
	}

	/**
	 * MSAA sample count, setting this to 4 will provide 4x anti aliasing. (default: 1)
	 */
	public get samples(): number {
		return this._samples;
	}

	public set samples(sampleCount: number) {
		if (this._samples === sampleCount) {
			return;
		}

		this._samples = sampleCount;
		this._buildPipeline();
	}

	/**
	 * If image processing is enabled.
	 */
	public get imageProcessingEnabled(): boolean {
		return this._imageProcessingEnabled;
	}

	public set imageProcessingEnabled(enabled: boolean) {
		if (this._imageProcessingEnabled === enabled) {
			return;
		}

		getSceneImageProcessingConfiguration(this._scene).isEnabled = enabled;
	}

	/**
	 * If glow layer is enabled. (Adds a glow effect to emmissive materials)
	 */
	public get glowLayerEnabled(): boolean {
		return this._glowLayer !== null;
	}

	public set glowLayerEnabled(enabled: boolean) {
		if (enabled && !this._glowLayer) {
			this._glowLayer = new GlowLayer("", this._scene);
		} else if (!enabled && this._glowLayer) {
			this._glowLayer.dispose();
			this._glowLayer = null;
		}
	}

	/**
	 * Gets the glow layer (or null if not defined)
	 */
	public get glowLayer(): GlowLayer | null {
		return this._glowLayer;
	}

	/**
	 * Enable or disable the chromaticAberration process from the pipeline
	 */
	public get chromaticAberrationEnabled(): boolean {
		return this._chromaticAberrationEnabled;
	}

	public set chromaticAberrationEnabled(enabled: boolean) {
		if (this._chromaticAberrationEnabled === enabled) {
			return;
		}

		this._chromaticAberrationEnabled = enabled;
		this._buildPipeline();
	}

	/**
	 * Enable or disable the grain process from the pipeline
	 */
	public get grainEnabled(): boolean {
		return this._grainEnabled;
	}

	public set grainEnabled(enabled: boolean) {
		if (this._grainEnabled === enabled) {
			return;
		}

		this._grainEnabled = enabled;
		this._buildPipeline();
	}

	/**
	 * Get the class name
	 * @returns "DefaultRenderingPipeline"
	 */
	public getClassName(): string {
		return "DefaultRenderingPipeline";
	}

	/**
	 * Force the compilation of the entire pipeline.
	 */
	public prepare(): void {
		const previousState = this._buildAllowed;
		this._buildAllowed = true;
		this._buildPipeline();
		this._buildAllowed = previousState;
	}

	/**
	 * Adds a camera to the pipeline
	 * @param camera the camera to be added
	 */
	public addCamera(camera: Camera): void {
		this._camerasToBeAttached.push(camera);
		this._buildPipeline();
	}

	/**
	 * Removes a camera from the pipeline
	 * @param camera the camera to remove
	 */
	public removeCamera(camera: Camera): void {
		const index = this._camerasToBeAttached.indexOf(camera);
		this._camerasToBeAttached.splice(index, 1);
		this._buildPipeline();
	}

	/**
	 * Dispose of the pipeline and stop all post processes
	 */
	public dispose(): void {
		this._buildAllowed = false;
		this._isDisposed = true;

		this.onBuildObservable.clear();

		this._disposePostProcesses(true);
		this._effects = [];

		this._imageProcessingConfigurationObserver?.remove();
		this._imageProcessingConfigurationObserver = null;

		_unregisterPostProcessPipeline(this._scene, this);
	}

	/**
	 * @internal
	 */
	public isActiveForCamera(camera: Camera): boolean {
		return !this._isDisposed && this._effects.length > 0 && this._cameras.includes(camera);
	}

	/**
	 * @internal
	 */
	public getSceneSamples(): number {
		return this._samples;
	}

	/**
	 * @internal
	 */
	public beforeRender(context: IPostProcessBeforeRenderContext): void {
		if (this._effects.includes(this.depthOfField)) {
			context.requestGeometry({ depthRenderer: true });
		}
	}

	/**
	 * @internal
	 * Renders the effects of the pipeline in the order Babylon.js renders them: depth of field, bloom, image processing,
	 * sharpen, grain, chromatic aberration and FXAA. Each effect draws into a half float texture (the HDR textures of
	 * Babylon.js), the last one into the given target when the pipeline is the last to render.
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget | null): IPostProcessTexture {
		const pool = context.pool;
		const effects = this._effects;

		let current: IPostProcessTexture = input;
		effects.forEach((effect, index) => {
			const isLast = index === effects.length - 1;
			const output = isLast && target ? target : pool.acquire(context.width, context.height, context.textureFormat);

			effect.render(context, current, output);

			if (current !== input) {
				pool.release(current as IPostProcessTarget);
			}

			current = output;
		});

		return current;
	}

	private _rebuildBloom(): void {
		// recreate bloom and dispose old as this setting is not dynamic
		const oldBloom = this.bloom;

		this.bloom = new BloomEffect(this._scene.surface.engine, this.bloomScale, this._bloomWeight, this.bloomKernel / this._hardwareScaleLevel);
		this.bloom.threshold = oldBloom.threshold;
		this.bloom._exposure = oldBloom._exposure;

		oldBloom.dispose();
	}

	private _buildPipeline(): void {
		if (!this._buildAllowed) {
			return;
		}

		this._disposePostProcesses();

		this._cameras = this._camerasToBeAttached.slice();

		const effects: IDefaultRenderingPipelineEffect[] = [];

		if (this.depthOfFieldEnabled) {
			effects.push(this.depthOfField);
		}

		if (this.bloomEnabled) {
			effects.push(this.bloom);
		}

		const configuration = getSceneImageProcessingConfiguration(this._scene);

		if (this._imageProcessingEnabled) {
			this.imageProcessing = new ImageProcessingPostProcess("imageProcessing", configuration);

			const imageProcessing = this.imageProcessing;
			if (this._hdr) {
				effects.push(imageProcessing);
			} else {
				configuration.applyByPostProcess = false;
			}

			if (!this._cameras.length) {
				configuration.applyByPostProcess = false;
			}
		}

		if (this.sharpenEnabled) {
			effects.push(this.sharpen);
		}

		if (this.grainEnabled) {
			effects.push(this.grain);
		}

		if (this.chromaticAberrationEnabled) {
			effects.push(this.chromaticAberration);
		}

		if (this.fxaaEnabled) {
			this.fxaa = new FxaaPostProcess();
			effects.push(this.fxaa);
		}

		this._effects = effects;

		this.onBuildObservable.notifyObservers(this);
	}

	private _disposePostProcesses(disposeNonRecreated: boolean = false): void {
		this.imageProcessing?.dispose();
		this.fxaa?.dispose();

		this.imageProcessing = null;
		this.fxaa = null;

		// These are created in the constructor and should not be disposed on every pipeline change
		if (disposeNonRecreated) {
			this.sharpen.dispose();
			this.depthOfField.dispose();
			this.bloom.dispose();
			this.chromaticAberration.dispose();
			this.grain.dispose();

			this._glowLayer?.dispose();
			this._glowLayer = null;
		}
	}
}
