import {
	Camera,
	createEffectRenderTask,
	createEffectWrapper,
	createSurfaceRenderTargetTexture,
	EffectRenderTask,
	EffectWrapper,
	EngineContext,
	getCsmReceiverTexture,
	getProjectionMatrix,
	getViewMatrix,
	getViewProjectionMatrix,
	onCsmReceiverUpdate,
	RenderTarget,
	RenderTargetTextureResult,
	SceneContext,
	setEffectTexture,
	setEffectUniforms,
	ShadowGenerator,
	Task,
	Texture2D,
} from "@babylonjs/lite";

import { getSceneData } from "../../tools/scene";
import { getMeshWorldBoundingBox } from "../../tools/mesh";

import { fullscreenVertexWGSL } from "../shaders";
import { buildWGSLEffectShader, preprocessWGSL, WGSLDefines, WGSLUniformWriter } from "../wgsl";

import {
	IVolumetricLightingConfiguration,
	IVolumetricSamplingSteps,
	VolumetricDebugMode,
	VolumetricDitherMode,
	VolumetricFogMode,
	getDefaultVolumetricLightingConfiguration,
	getVolumetricSamplingSteps,
	maxVolumetricArrayLights,
	maxVolumetricShadowSlots,
	normalizeVolumetricLightingConfiguration,
	volumetricTemporalSamplesDivider,
} from "./types";

import {
	IVolumetricBudget,
	IVolumetricLightCandidate,
	IVolumetricLightSelection,
	IVolumetricLightingStats,
	IVolumetricShaderEnvironment,
	VolumetricShadowKind,
	VolumetricTransmittanceMode,
	_getVolumetricShadowGeneratorData,
	computeVolumetricBudget,
	getVolumetricLightRange,
	getVolumetricLightScaledIntensity,
	getVolumetricLightWorldDirection,
	getVolumetricLightWorldPosition,
	getVolumetricSpotLightAngle,
	getVolumetricSpotLightExponent,
	selectVolumetricLights,
} from "./selector";

import { VolumetricDepthSource, resolveVolumetricDepthSource } from "./depth";
import {
	buildVolumetricLightingBlurShaderWGSL,
	buildVolumetricLightingComposeShaderWGSL,
	buildVolumetricLightingScatteringShaderWGSL,
	buildVolumetricLightingTemporalShaderWGSL,
} from "./shaders";

/**
 * Defines the width, in standard deviations of the neighborhood of a pixel, of the range of values the history of
 * the temporal accumulation is clipped to.
 */
const temporalClippingWidth = 1;

/**
 * Defines how much of the change of the medium along a view ray, caused by the motion of the camera, the history of
 * the temporal accumulation may lag behind. The faster the camera moves compared to the distance of what a pixel
 * shows, the more the current frame weighs, whatever the factor of the configuration.
 */
const temporalMotionTolerance = 0.05;

/**
 * Defines the conjugate of the golden ratio, the step of the low discrepancy sequence the samples of each pixel walk
 * from one frame to the next with the temporal accumulation.
 */
const goldenRatioConjugate = 0.6180339887498949;

/**
 * Defines the number of samples of the optical depth integrated per pixel when the medium has no closed form.
 */
const transmittanceSamples = 32;

/**
 * Defines the format of the textures holding the result of the raymarching, half floats like the Babylon.js version.
 */
const scatteringFormat: GPUTextureFormat = "rgba16float";

/**
 * Defines a rendering pipeline computing single-scattering volumetric lighting, with the same properties as the
 * Babylon.js version of the tools: the light shafts are integrated through a participating medium the pipeline
 * describes on its own, and are occluded either by the shadow map a light already renders or, when it has none, by
 * the depth buffer of the scene.
 *
 * The pipeline is rendered by the frame graph tasks of the tools (see `createEditorSceneContext`):
 * - the depth of the scene is rendered by a geometry renderer task, shared with the depth of field,
 * - the raymarching pass, rendered at a fraction of the resolution of the canvas,
 * - when the temporal accumulation is enabled, a pass blending the result of the raymarching with the result of the
 *   previous frames, which lets the raymarching compute a fraction of its samples each frame,
 * - a separable depth aware blur denoising the result of the raymarching,
 * - a composition pass upsampling the result and adding it to the color of the scene.
 *
 * Every light of the scene can take part in the effect, including the lights of the clustered light container, and
 * each one is configured individually through "light.metadata.volumetricLighting".
 */
export class VolumetricLightingRenderingPipeline {
	/**
	 * Defines the name of the render effect keeping the color of the scene and extracting its linear depth.
	 */
	public static readonly SceneColorEffectName: string = "VolumetricLightingSceneColorEffect";
	/**
	 * Defines the name of the render effect raymarching the participating medium.
	 */
	public static readonly ScatteringEffectName: string = "VolumetricLightingScatteringEffect";
	/**
	 * Defines the name of the render effect accumulating the result of the raymarching over the frames.
	 */
	public static readonly TemporalEffectName: string = "VolumetricLightingTemporalEffect";
	/**
	 * Defines the name of the render effect denoising the result of the raymarching.
	 */
	public static readonly BlurEffectName: string = "VolumetricLightingBlurEffect";
	/**
	 * Defines the name of the render effect composing the light shafts over the color of the scene.
	 */
	public static readonly ComposeEffectName: string = "VolumetricLightingComposeEffect";

	/**
	 * Returns the distance at which the medium becomes fully opaque to use as a default for the linear mode.
	 * @param scene defines the reference to the scene to measure.
	 * @param camera defines the reference to the camera, used when the scene has no geometry yet.
	 */
	public static GetDefaultFogEnd(scene: SceneContext, camera: Camera): number {
		return 1 / VolumetricLightingRenderingPipeline.GetDefaultFogDensity(scene, camera);
	}

	/**
	 * Returns the extinction coefficient to use as a default for the medium of the pipeline.
	 *
	 * There is no unit agnostic constant that works here: an extinction of 1 per unit is a thick smoke in a
	 * scene authored in metres and a vacuum in one authored in centimetres. Deriving it from the size of the
	 * scene gives an optical depth of about 1 from one end of the content to the other, which reads well
	 * whatever the project is authored in.
	 * @param scene defines the reference to the scene to measure.
	 * @param camera defines the reference to the camera, used when the scene has no geometry yet.
	 */
	public static GetDefaultFogDensity(scene: SceneContext, camera: Camera): number {
		let size = 0;

		const meshes = getSceneData(scene).meshes;
		if (meshes.length) {
			const minimum = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
			const maximum = [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];

			meshes.forEach((mesh) => {
				const boundingBox = getMeshWorldBoundingBox(mesh);

				minimum[0] = Math.min(minimum[0], boundingBox.minimum.x);
				minimum[1] = Math.min(minimum[1], boundingBox.minimum.y);
				minimum[2] = Math.min(minimum[2], boundingBox.minimum.z);

				maximum[0] = Math.max(maximum[0], boundingBox.maximum.x);
				maximum[1] = Math.max(maximum[1], boundingBox.maximum.y);
				maximum[2] = Math.max(maximum[2], boundingBox.maximum.z);
			});

			const diagonal = Math.hypot(maximum[0] - minimum[0], maximum[1] - minimum[1], maximum[2] - minimum[2]);
			if (isFinite(diagonal)) {
				size = diagonal;
			}
		}

		// An empty scene, or one made only of infinitely small meshes, falls back on how far the camera is
		// from the origin. The far plane is useless here: the default camera of the editor sets it to
		// 1 500 000, which would describe a medium thinner than the cutoff of the raymarching shader.
		if (size < 1e-3) {
			const world = camera.worldMatrix;
			size = Math.max(Math.hypot(world[12], world[13], world[14]), camera.farPlane * 0.001, 1);
		}

		// Kept comfortably above the "sigmaT > 1e-6" cutoff of the shader, under which nothing scatters.
		return Math.min(1, Math.max(1e-5, 1 / Math.max(1e-3, size)));
	}

	/**
	 * Returns wether or not the volumetric lighting rendering pipeline is supported by the given engine: Babylon Lite
	 * runs on WebGPU only, which supports everything the pipeline needs.
	 * @param engine defines the reference to the engine to check.
	 */
	public static IsSupported(engine?: EngineContext): boolean {
		void engine;
		return true;
	}

	/**
	 * Defines the name of the pipeline.
	 */
	public readonly name: string;

	private _scene: SceneContext;
	private _camera: Camera;
	private _configuration: IVolumetricLightingConfiguration;
	private _configurationProxy: IVolumetricLightingConfiguration;

	private _msaaSamples: number = 1;
	private _budget: IVolumetricBudget;
	private _selection: IVolumetricLightSelection | null = null;

	private _frameCount: number = 0;
	private _lightsDirty: boolean = true;
	private _disposed: boolean = false;
	private _idle: boolean = false;

	/**
	 * Constructor.
	 * @param name defines the name of the pipeline.
	 * @param scene defines the reference to the scene the pipeline belongs to.
	 * @param camera defines the reference to the camera the pipeline is attached to.
	 * @param configuration defines the optional configuration to apply on the pipeline.
	 */
	public constructor(name: string, scene: SceneContext, camera: Camera, configuration?: Partial<IVolumetricLightingConfiguration>) {
		this.name = name;

		this._scene = scene;
		this._camera = camera;
		this._configuration = normalizeVolumetricLightingConfiguration({
			...getDefaultVolumetricLightingConfiguration(),
			fogDensity: configuration?.fogDensity ?? VolumetricLightingRenderingPipeline.GetDefaultFogDensity(scene, camera),
			fogEnd: configuration?.fogEnd ?? VolumetricLightingRenderingPipeline.GetDefaultFogEnd(scene, camera),
			screenSpaceShadowMaxDistance: configuration?.screenSpaceShadowMaxDistance ?? VolumetricLightingRenderingPipeline.GetDefaultFogEnd(scene, camera),
			...configuration,
		});

		this._configurationProxy = new Proxy(this._configuration, {
			set: (target, property, value) => {
				const key = property as keyof IVolumetricLightingConfiguration;
				if (target[key] === value) {
					return true;
				}

				(target as any)[key] = value;
				this._onConfigurationChanged(key);

				return true;
			},
		});

		this._budget = computeVolumetricBudget(scene.surface.engine, this._configuration);
	}

	/**
	 * Gets wether or not the pipeline was disposed.
	 */
	public get isDisposed(): boolean {
		return this._disposed;
	}

	/**
	 * Gets the reference to the scene the pipeline belongs to.
	 */
	public get scene(): SceneContext {
		return this._scene;
	}

	/**
	 * Gets the reference to the camera the pipeline is attached to.
	 */
	public get camera(): Camera {
		return this._camera;
	}

	/**
	 * Gets the live configuration of the pipeline. Assigning a property of the returned object applies the
	 * change immediately.
	 */
	public get configuration(): IVolumetricLightingConfiguration {
		return this._configurationProxy;
	}

	/**
	 * Gets wether or not the pipeline had nothing to draw at its last update: no light reaches the view of the camera
	 * and the medium neither glows nor attenuates the scene. Its passes are then skipped.
	 */
	public get isIdle(): boolean {
		return this._idle;
	}

	/**
	 * Gets where the depth of the scene is read from: Babylon Lite renders it using a geometry renderer task.
	 */
	public get depthSource(): VolumetricDepthSource {
		return resolveVolumetricDepthSource();
	}

	/**
	 * Kept for compatibility: the MSAA of Babylon Lite is configured when creating the engine (`createEngine`).
	 */
	public get msaaSamples(): number {
		return this._msaaSamples;
	}

	public set msaaSamples(value: number) {
		this._msaaSamples = value;
	}

	/**
	 * Gets the statistics of the last selection pass, used by the inspector to explain what each light does.
	 */
	public getStats(): IVolumetricLightingStats | null {
		return this._selection?.stats ?? null;
	}

	/**
	 * Gets the number of lights the raymarching shader can be compiled for on the current engine.
	 */
	public getBudget(): IVolumetricBudget {
		return this._budget;
	}

	/**
	 * Gets a string identifying the name of the class.
	 */
	public getClassName(): string {
		return "VolumetricLightingRenderingPipeline";
	}

	/**
	 * Marks the list of lights contributing to the effect as dirty, forcing a new selection pass on the
	 * next frame. Called when the volumetric configuration of a light is edited.
	 */
	public markLightsDirty(): void {
		this._lightsDirty = true;
	}

	/**
	 * Applies the given configuration on the pipeline.
	 * @param data defines the configuration to apply.
	 */
	public applyConfiguration(data: Partial<IVolumetricLightingConfiguration>): void {
		const normalized = normalizeVolumetricLightingConfiguration({
			...this._configuration,
			...data,
		});

		Object.assign(this._configuration, normalized);

		this._budget = computeVolumetricBudget(this._scene.surface.engine, this._configuration);
		this._lightsDirty = true;
	}

	/**
	 * Serializes the configuration of the pipeline.
	 */
	public serializeConfiguration(): IVolumetricLightingConfiguration {
		return {
			...this._configuration,
			fogColor: this._configuration.fogColor.slice(),
			ambientColor: this._configuration.ambientColor.slice(),
		};
	}

	/**
	 * Disposes the pipeline: the volumetric lighting stops being rendered.
	 */
	public dispose(): void {
		this._disposed = true;
		this._selection = null;
	}

	private _onConfigurationChanged(key: keyof IVolumetricLightingConfiguration): void {
		if (key === "maxLights" || key === "maxShadowedLights") {
			this._budget = computeVolumetricBudget(this._scene.surface.engine, this._configuration);
		}

		this._lightsDirty = true;
	}

	/**
	 * Gets the number of frames the pipeline was updated since it was created.
	 * @internal
	 */
	public get _frameCounter(): number {
		return this._frameCount;
	}

	/**
	 * Runs the selection pass of the lights when it is needed, and detects when the pipeline has nothing to draw.
	 * Called each frame by the frame graph tasks of the tools.
	 * @param viewProjection defines the view projection matrix of the camera.
	 * @internal
	 */
	public _update(viewProjection: ArrayLike<number>): IVolumetricLightSelection | null {
		if (this._disposed) {
			return null;
		}

		++this._frameCount;

		const shouldSelect = this._lightsDirty || !this._selection || this._frameCount % this._configuration.selectionRefreshRate === 0;
		if (shouldSelect) {
			this._lightsDirty = false;
			this._selection = selectVolumetricLights(this._scene, this._camera, viewProjection, this._configuration, this._budget, this._selection);
			this._updateIdleState(this._selection);
		}

		return this._selection;
	}

	/**
	 * Detects when the pipeline has nothing to draw: no light reaches the view of the camera and the medium neither
	 * glows nor attenuates the scene. The passes are then skipped and the color of the scene is kept as is.
	 */
	private _updateIdleState(selection: IVolumetricLightSelection): void {
		const configuration = this._configuration;
		const ambient = configuration.ambientColor;

		const hasLights = selection.shadowed.length > 0 || selection.unshadowed.length > 0 || !!selection.csm;
		const hasAmbient = configuration.ambientIntensity > 0 && (ambient[0] > 0 || ambient[1] > 0 || ambient[2] > 0);

		this._idle = !hasLights && !hasAmbient && configuration.extinctionAmount <= 0 && configuration.debugMode === VolumetricDebugMode.None;
	}
}

/**
 * Defines the settings of the image processing the materials of Babylon Lite apply, which the composition pass inverts.
 * @internal
 */
export interface _IVolumetricImageProcessing {
	/**
	 * Defines wether or not the image processing is applied by a post-process in Babylon.js (default rendering pipeline
	 * with its image processing enabled), after the light shafts are composed: the image processing the materials of
	 * Babylon Lite applied is then inverted to compose the light shafts in linear space.
	 */
	linear: boolean;
	exposure: number;
	contrast: number;
	/**
	 * Defines the tone mapping: 0 none, 1 ACES, 2 Khronos PBR neutral and 3 standard.
	 */
	toneMapping: number;
}

/**
 * Defines a version of the shader of a pass, compiled for a given set of defines.
 */
interface IVolumetricPassVariant {
	wrapper: EffectWrapper;
	task: EffectRenderTask;
	writer: WGSLUniformWriter | null;
	recorded: boolean;
	boundViews: Map<string, GPUTextureView>;
}

/**
 * A frame graph task drawing the current variant of the shader of a pass. The frame graph of a Babylon Lite scene can't
 * change once built, while the shaders of the passes depend on the lights selected each frame: each variant is drawn
 * by an effect render task of its own, not added to the frame graph, which this task executes.
 */
class VolumetricPassTask implements Task {
	public readonly name: string;
	public readonly engine: EngineContext;
	public readonly scene: SceneContext;

	public executionEnabled: boolean = false;
	public variant: IVolumetricPassVariant | null = null;

	public readonly _passes: unknown[] = [];

	public constructor(name: string, engine: EngineContext, scene: SceneContext) {
		this.name = name;
		this.engine = engine;
		this.scene = scene;
	}

	public record(): void {
		// Each variant is recorded once its textures are bound, see "_VolumetricLightingPasses._recordPass".
	}

	public execute(): number {
		const variant = this.variant;
		return variant?.recorded ? (variant.task.execute?.() ?? 0) : 0;
	}

	public dispose(): void {
		this.variant = null;
	}
}

/**
 * Returns a texture reading the color attachment of the given render target, resolved each time a bind group is built
 * so it follows the resizes of the target.
 */
function createRenderTargetColorTexture(target: RenderTarget): Texture2D {
	const internal = target as unknown as { _colorView: GPUTextureView; _colorTexture: GPUTexture; _width: number; _height: number };

	return {
		get texture() {
			return internal._colorTexture;
		},
		get view() {
			return internal._colorView;
		},
		get width() {
			return internal._width;
		},
		get height() {
			return internal._height;
		},
	} as unknown as Texture2D;
}

const shadowMapTextures = new WeakMap<ShadowGenerator, Texture2D>();

/**
 * Returns the texture of the shadow map of the given shadow generator of Babylon Lite.
 */
function getShadowMapTexture(generator: ShadowGenerator): Texture2D {
	let texture = shadowMapTextures.get(generator);
	if (!texture) {
		const internal = generator as unknown as { _shadowType: string; _depthTexture: GPUTexture; _depthSampler: GPUSampler };

		texture =
			internal._shadowType === "csm"
				? getCsmReceiverTexture(generator)
				: ({
						texture: internal._depthTexture,
						view: internal._depthTexture.createView(),
						sampler: internal._depthSampler,
						width: internal._depthTexture.width,
						height: internal._depthTexture.height,
					} as Texture2D);

		shadowMapTextures.set(generator, texture);
	}

	return texture;
}

function createLightArrays(count: number): IVolumetricLightArrays {
	return {
		data: new Float32Array(count * 4),
		diffuse: new Float32Array(count * 4),
		direction: new Float32Array(count * 4),
		falloff: new Float32Array(count * 4),
	};
}

function multiplyMatrices(a: ArrayLike<number>, b: ArrayLike<number>, result: Float64Array): Float64Array {
	for (let column = 0; column < 4; ++column) {
		for (let row = 0; row < 4; ++row) {
			result[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
		}
	}

	return result;
}

function invertMatrix(m: ArrayLike<number>, result: Float64Array): Float64Array {
	const a00 = m[0],
		a01 = m[1],
		a02 = m[2],
		a03 = m[3];
	const a10 = m[4],
		a11 = m[5],
		a12 = m[6],
		a13 = m[7];
	const a20 = m[8],
		a21 = m[9],
		a22 = m[10],
		a23 = m[11];
	const a30 = m[12],
		a31 = m[13],
		a32 = m[14],
		a33 = m[15];

	const b00 = a00 * a11 - a01 * a10;
	const b01 = a00 * a12 - a02 * a10;
	const b02 = a00 * a13 - a03 * a10;
	const b03 = a01 * a12 - a02 * a11;
	const b04 = a01 * a13 - a03 * a11;
	const b05 = a02 * a13 - a03 * a12;
	const b06 = a20 * a31 - a21 * a30;
	const b07 = a20 * a32 - a22 * a30;
	const b08 = a20 * a33 - a23 * a30;
	const b09 = a21 * a32 - a22 * a31;
	const b10 = a21 * a33 - a23 * a31;
	const b11 = a22 * a33 - a23 * a32;

	const determinant = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
	const inverse = determinant ? 1 / determinant : 0;

	result[0] = (a11 * b11 - a12 * b10 + a13 * b09) * inverse;
	result[1] = (a02 * b10 - a01 * b11 - a03 * b09) * inverse;
	result[2] = (a31 * b05 - a32 * b04 + a33 * b03) * inverse;
	result[3] = (a22 * b04 - a21 * b05 - a23 * b03) * inverse;
	result[4] = (a12 * b08 - a10 * b11 - a13 * b07) * inverse;
	result[5] = (a00 * b11 - a02 * b08 + a03 * b07) * inverse;
	result[6] = (a32 * b02 - a30 * b05 - a33 * b01) * inverse;
	result[7] = (a20 * b05 - a22 * b02 + a23 * b01) * inverse;
	result[8] = (a10 * b10 - a11 * b08 + a13 * b06) * inverse;
	result[9] = (a01 * b08 - a00 * b10 - a03 * b06) * inverse;
	result[10] = (a30 * b04 - a31 * b02 + a33 * b00) * inverse;
	result[11] = (a21 * b02 - a20 * b04 - a23 * b00) * inverse;
	result[12] = (a11 * b07 - a10 * b09 - a12 * b06) * inverse;
	result[13] = (a00 * b09 - a01 * b07 + a02 * b06) * inverse;
	result[14] = (a31 * b01 - a30 * b03 - a32 * b00) * inverse;
	result[15] = (a20 * b03 - a21 * b01 + a22 * b00) * inverse;

	return result;
}

/**
 * Defines the four arrays of vectors describing lights in the raymarching shader.
 */
interface IVolumetricLightArrays {
	data: Float32Array;
	diffuse: Float32Array;
	direction: Float32Array;
	falloff: Float32Array;
}

/**
 * Defines the textures of a resolution of the raymarching.
 */
interface IVolumetricScatteringTargets {
	scale: number;
	scattering: RenderTargetTextureResult;
	temporal: RenderTargetTextureResult;
	history: RenderTargetTextureResult;
	blur: RenderTargetTextureResult[];
}

/**
 * The frame graph tasks rendering the volumetric lighting rendering pipeline of a scene, created by the frame graph of
 * the tools when one of the scenes loaded in the scene has a volumetric lighting configuration (see
 * `createEditorSceneContext`). The tasks are drawn after the scene, before the depth of field.
 * @internal
 */
export class _VolumetricLightingPasses {
	/**
	 * Defines the target holding the color of the scene with the light shafts.
	 */
	public readonly output: RenderTargetTextureResult;

	/**
	 * Defines wether or not the light shafts are drawn this frame, which needs the depth of the scene.
	 */
	public isDrawing: boolean = false;

	private _scene: SceneContext;
	private _engine: EngineContext;
	private _sceneColor: Texture2D;
	private _linearDepth: Texture2D;

	private _scatteringTask: VolumetricPassTask;
	private _temporalTask: VolumetricPassTask;
	private _historyTask: VolumetricPassTask;
	private _blurTasks: VolumetricPassTask[];
	private _composeTask: VolumetricPassTask;

	private _targets: IVolumetricScatteringTargets | null = null;
	private _targetIds: WeakMap<RenderTarget, number> = new WeakMap();
	private _nextTargetId: number = 0;
	private _variants: Map<string, IVolumetricPassVariant> = new Map();

	private _csmReceivers: Map<ShadowGenerator, { data: Float32Array; dispose: () => void }> = new Map();

	private _frame: number = 0;
	private _historyFrame: number = -1;
	private _historyEmpty: boolean = false;
	private _historyWidth: number = 0;
	private _historyHeight: number = 0;
	private _previousViewProjection: Float64Array = new Float64Array(16);
	private _previousCameraPosition: number[] = [0, 0, 0];

	private _temporary: number[] = [0, 0, 0];
	private _viewRotation: Float64Array = new Float64Array(16);
	private _relativeViewProjection: Float64Array = new Float64Array(16);
	private _inverseViewProjection: Float64Array = new Float64Array(16);
	private _cameraTranslation: Float64Array = new Float64Array(16);
	private _previousRelative: Float64Array = new Float64Array(16);

	private _lights: IVolumetricLightArrays = createLightArrays(maxVolumetricArrayLights);
	private _shadowLights: IVolumetricLightArrays = createLightArrays(maxVolumetricShadowSlots);
	private _csmLight: IVolumetricLightArrays = createLightArrays(1);

	private _shadowInfo: Float32Array = new Float32Array(maxVolumetricShadowSlots * 4);
	private _shadowMatrices: Float32Array = new Float32Array(maxVolumetricShadowSlots * 16);

	/**
	 * Constructor.
	 * @param scene defines the reference to the scene to render.
	 * @param sceneColor defines the texture holding the color of the scene.
	 * @param linearDepth defines the render target of the geometry renderer task holding the view space depth of the scene.
	 * @param addTask defines the function adding a task to the frame graph of the scene.
	 */
	public constructor(scene: SceneContext, sceneColor: Texture2D, linearDepth: RenderTarget, addTask: (task: Task) => void) {
		this._scene = scene;
		this._engine = scene.surface.engine;
		this._sceneColor = sceneColor;
		this._linearDepth = createRenderTargetColorTexture(linearDepth);

		const surface = scene.surface;

		this.output = createSurfaceRenderTargetTexture(this._engine, {
			lbl: "editor-volumetric-lighting",
			format: surface.format,
			samples: 1,
			size: surface,
		});

		this._scatteringTask = new VolumetricPassTask("editor-volumetric-lighting-scattering", this._engine, scene);
		this._temporalTask = new VolumetricPassTask("editor-volumetric-lighting-temporal", this._engine, scene);
		this._historyTask = new VolumetricPassTask("editor-volumetric-lighting-history", this._engine, scene);
		this._blurTasks = [0, 1].map((index) => new VolumetricPassTask(`editor-volumetric-lighting-blur-${index}`, this._engine, scene));
		this._composeTask = new VolumetricPassTask("editor-volumetric-lighting-compose", this._engine, scene);

		[this._scatteringTask, this._temporalTask, this._historyTask, ...this._blurTasks, this._composeTask].forEach((task) => addTask(task));
	}

	/**
	 * Renders the given pipeline this frame, or only copies the color of the scene into the output when the pipeline is
	 * null (the camera has no volumetric lighting): the tasks drawn after it read the output.
	 * @param pipeline defines the reference to the pipeline to render, if any.
	 * @param imageProcessing defines the image processing the materials of Babylon Lite apply.
	 * @returns false if nothing has been drawn into the output (the color of the scene is to be read instead).
	 */
	public update(pipeline: VolumetricLightingRenderingPipeline | null, imageProcessing: _IVolumetricImageProcessing, keepOutput: boolean): boolean {
		++this._frame;

		this.isDrawing = false;

		const camera = this._scene.camera;
		const active = !!pipeline && !pipeline.isDisposed && !!camera && pipeline.camera === camera;

		// The texture of the depth exists once the frame graph of the scene is recorded.
		if (!active || !camera || !this._linearDepth.view) {
			this._setPassesEnabled(false, false, 0);
			return this._updateCompose(null, null, imageProcessing, keepOutput, true);
		}

		const configuration = pipeline.configuration;

		const width = this._sceneColor.width || 1;
		const height = this._sceneColor.height || 1;
		const viewport = camera.viewport;
		const aspectRatio = (width / height) * (viewport ? viewport.width / viewport.height : 1);

		const viewProjection = getViewProjectionMatrix(camera, aspectRatio);
		const selection = pipeline._update(viewProjection);

		if (!selection || pipeline.isIdle) {
			// A frame the pipeline had nothing to draw leaves no light at all to accumulate.
			this._historyFrame = this._frame;
			this._historyEmpty = true;

			this._setPassesEnabled(false, false, 0);
			return this._updateCompose(null, null, imageProcessing, keepOutput, true);
		}

		const targets = this._ensureTargets(configuration.resolutionScale);
		const sampling = getVolumetricSamplingSteps(configuration, volumetricTemporalSamplesDivider);
		const environment = this._getEnvironment(configuration, sampling, pipeline.getBudget());

		// Camera
		const world = camera.worldMatrix;
		const cameraPosition = [world[12], world[13], world[14]];
		const forwardLength = Math.hypot(world[8], world[9], world[10]) || 1;
		const cameraForward = [world[8] / forwardLength, world[9] / forwardLength, world[10] / forwardLength];

		// The view rays are reconstructed relative to the camera, see "volGetRayDirection".
		const view = getViewMatrix(camera);
		for (let i = 0; i < 16; ++i) {
			this._viewRotation[i] = view[i];
		}
		this._viewRotation[12] = this._viewRotation[13] = this._viewRotation[14] = 0;

		multiplyMatrices(getProjectionMatrix(camera, aspectRatio), this._viewRotation, this._relativeViewProjection);
		invertMatrix(this._relativeViewProjection, this._inverseViewProjection);

		const depthWidth = this._linearDepth.width || 1;
		const depthHeight = this._linearDepth.height || 1;
		const scatteringWidth = targets.scattering.texture.width || 1;
		const scatteringHeight = targets.scattering.texture.height || 1;
		const depthRatio = [depthWidth / scatteringWidth, depthHeight / scatteringHeight];

		// Scattering
		const scattering = this._preparePass(this._scatteringTask, "scattering", targets.scattering.rt, this._getScatteringDefines(configuration, selection, environment));

		this._bindScattering(scattering, pipeline, selection, configuration, {
			viewProjection,
			cameraPosition,
			cameraForward,
			near: camera.nearPlane,
			far: camera.farPlane,
			depthRatio,
		});

		let current = targets.scattering.texture;

		// Temporal accumulation
		const temporal = configuration.temporalAccumulation;
		if (temporal) {
			const temporalVariant = this._preparePass(this._temporalTask, "temporal", targets.temporal.rt, {});
			const historyVariant = this._preparePass(this._historyTask, "history", targets.history.rt, {});

			const historySizeChanged = this._historyWidth !== scatteringWidth || this._historyHeight !== scatteringHeight;
			const historyValid = !historySizeChanged && this._historyFrame === this._frame - 1;
			const historyState = historyValid ? (this._historyEmpty ? 2 : 1) : 0;

			// The history is reprojected with the matrix of the previous frame, applied to positions relative to the
			// current camera like the raymarching does, which keeps the precision whatever the distance to the origin.
			this._cameraTranslation.fill(0);
			this._cameraTranslation[0] = this._cameraTranslation[5] = this._cameraTranslation[10] = this._cameraTranslation[15] = 1;
			this._cameraTranslation[12] = cameraPosition[0];
			this._cameraTranslation[13] = cameraPosition[1];
			this._cameraTranslation[14] = cameraPosition[2];
			multiplyMatrices(this._previousViewProjection, this._cameraTranslation, this._previousRelative);

			const translation = historyValid
				? Math.hypot(
						cameraPosition[0] - this._previousCameraPosition[0],
						cameraPosition[1] - this._previousCameraPosition[1],
						cameraPosition[2] - this._previousCameraPosition[2]
					)
				: 0;

			const writer = temporalVariant.writer!;
			writer.set("volCameraMinMaxZ", camera.nearPlane, camera.farPlane);
			writer.set("volDepthRatio", depthRatio[0], depthRatio[1]);
			writer.setArray("volInverseViewProjection", this._inverseViewProjection);
			writer.set("volCameraForward", cameraForward[0], cameraForward[1], cameraForward[2]);
			writer.setArray("volPreviousViewProjection", this._previousRelative);
			writer.set("volTemporalParams", configuration.temporalAccumulationFactor, temporalClippingWidth, configuration.maxDistance, historyState);
			writer.set("volTemporalMotion", translation, temporalMotionTolerance);
			setEffectUniforms(temporalVariant.wrapper, writer.data);

			this._bindTexture(temporalVariant, "textureSampler", current);
			this._bindTexture(temporalVariant, "volHistorySampler", targets.history.texture);
			this._bindTexture(temporalVariant, "volLinearDepthTexture", this._linearDepth);

			this._bindTexture(historyVariant, "sourceTexture", targets.temporal.texture);

			this._recordPass(temporalVariant);
			this._recordPass(historyVariant);

			this._historyFrame = this._frame;
			this._historyEmpty = false;
			this._historyWidth = scatteringWidth;
			this._historyHeight = scatteringHeight;

			current = targets.temporal.texture;
		}

		for (let i = 0; i < 16; ++i) {
			this._previousViewProjection[i] = viewProjection[i];
		}
		this._previousCameraPosition = cameraPosition;

		// Blur
		const blurPasses = configuration.blurPasses;
		for (let index = 0; index < blurPasses; ++index) {
			const blurVariant = this._preparePass(this._blurTasks[index], "blur", targets.blur[index].rt, { VOL_BLUR_RADIUS: configuration.blurRadius });

			const writer = blurVariant.writer!;
			writer.set("volCameraMinMaxZ", camera.nearPlane, camera.farPlane);
			writer.set("volDepthRatio", depthRatio[0], depthRatio[1]);
			writer.set("volBlurDirection", index % 2 === 0 ? 1 : 0, index % 2 === 0 ? 0 : 1);
			writer.set("volBlurParams", Math.max(configuration.blurRadius * 0.5, 0.5), configuration.blurDepthThreshold);
			setEffectUniforms(blurVariant.wrapper, writer.data);

			this._bindTexture(blurVariant, "textureSampler", current);
			this._bindTexture(blurVariant, "volLinearDepthTexture", this._linearDepth);

			this._recordPass(blurVariant);

			current = targets.blur[index].texture;
		}

		this._setPassesEnabled(true, temporal, blurPasses);
		this.isDrawing = true;

		return this._updateCompose(pipeline, { scattering: current, depthRatio, near: camera.nearPlane, far: camera.farPlane }, imageProcessing, true, false);
	}

	/**
	 * Releases the resources owned by the passes.
	 */
	public dispose(): void {
		this._csmReceivers.forEach((receiver) => receiver.dispose());
		this._csmReceivers.clear();
		this._variants.clear();
	}

	private _setPassesEnabled(scattering: boolean, temporal: boolean, blurPasses: number): void {
		this._scatteringTask.executionEnabled = scattering;
		this._temporalTask.executionEnabled = scattering && temporal;
		this._historyTask.executionEnabled = scattering && temporal;
		this._blurTasks.forEach((task, index) => (task.executionEnabled = scattering && index < blurPasses));
	}

	private _updateCompose(
		pipeline: VolumetricLightingRenderingPipeline | null,
		scattering: { scattering: Texture2D; depthRatio: number[]; near: number; far: number } | null,
		imageProcessing: _IVolumetricImageProcessing,
		keepOutput: boolean,
		passThrough: boolean
	): boolean {
		if (passThrough && !keepOutput) {
			this._composeTask.executionEnabled = false;
			return false;
		}

		const configuration = pipeline?.configuration;
		const compose = this._preparePass(this._composeTask, "compose", this.output.rt, {
			VOL_DEBUG: passThrough ? 0 : (configuration?.debugMode ?? 0),
			VOL_LINEAR_COMPOSE: imageProcessing.linear,
			VOL_TONEMAPPING: imageProcessing.toneMapping,
		});

		const writer = compose.writer!;
		writer.set("volPassParams", passThrough ? 1 : 0, 0, 0, 0);
		writer.set("volImageProcessing", imageProcessing.exposure, imageProcessing.contrast, 0, 0);

		if (scattering && configuration) {
			writer.set("volCameraMinMaxZ", scattering.near, scattering.far);
			writer.set("volDepthRatio", scattering.depthRatio[0], scattering.depthRatio[1]);
			writer.set("volComposeParams", configuration.intensity, configuration.extinctionAmount, configuration.upsampleDepthThreshold, 0);
		}

		setEffectUniforms(compose.wrapper, writer.data);

		// When passing through, the textures of the raymarching are unused: the color of the scene is bound in place.
		this._bindTexture(compose, "textureSampler", scattering?.scattering ?? this._sceneColor);
		this._bindTexture(compose, "volSceneSampler", this._sceneColor);
		this._bindTexture(compose, "volLinearDepthTexture", scattering ? this._linearDepth : this._sceneColor);

		this._recordPass(compose);
		this._composeTask.executionEnabled = true;

		return true;
	}

	private _ensureTargets(scale: number): IVolumetricScatteringTargets {
		if (this._targets?.scale === scale) {
			return this._targets;
		}

		const surface = this._scene.surface;
		const create = (label: string) =>
			createSurfaceRenderTargetTexture(this._engine, {
				lbl: `editor-volumetric-lighting-${label}`,
				format: scatteringFormat,
				samples: 1,
				size: { surface, scale },
			});

		// The previous targets are kept alive: the variants drawing into them may be used again.
		this._targets = {
			scale,
			scattering: create("scattering"),
			temporal: create("temporal"),
			history: create("history"),
			blur: [create("blur-0"), create("blur-1")],
		};

		this._historyFrame = -1;

		return this._targets;
	}

	private _getEnvironment(configuration: IVolumetricLightingConfiguration, sampling: IVolumetricSamplingSteps, budget: IVolumetricBudget): IVolumetricShaderEnvironment {
		// The medium of the pipeline has a closed form transmittance, except when the height falloff is
		// combined with a fog mode whose density already varies along the ray.
		let transmittance = VolumetricTransmittanceMode.Analytic;
		if (configuration.heightFogEnabled) {
			transmittance = configuration.fogMode === VolumetricFogMode.Exponential ? VolumetricTransmittanceMode.AnalyticHeight : VolumetricTransmittanceMode.Numeric;
		}

		return {
			fogMode: configuration.fogMode,
			transmittance,
			arrayLightCapacity: budget.maxArrayLights,
			steps: sampling.steps,
			lightSteps: sampling.lightSteps,
		};
	}

	/**
	 * Returns the dithering mode the raymarching is compiled with. The temporal accumulation needs the samples of
	 * neighboring pixels to differ: it tells its own noise from the changes of the scene with it.
	 */
	private _getDitherMode(configuration: IVolumetricLightingConfiguration): VolumetricDitherMode {
		if (configuration.temporalAccumulation && configuration.ditherMode === VolumetricDitherMode.None) {
			return VolumetricDitherMode.InterleavedGradientNoise;
		}

		return configuration.ditherMode;
	}

	private _getScatteringDefines(configuration: IVolumetricLightingConfiguration, selection: IVolumetricLightSelection, environment: IVolumetricShaderEnvironment): WGSLDefines {
		const shadowed = selection.shadowed;
		const directionalCount = selection.directionalCount;
		const csm = selection.csm;
		const globalSlotCount = shadowed.filter((entry) => !entry.shadow.local).length;

		const defines: WGSLDefines = {
			VOL_STEPS: environment.steps,
			VOL_LIGHT_STEPS: environment.lightSteps,
			VOL_LOCAL_MAX_STEPS: Math.max(environment.lightSteps, environment.steps),
			VOL_DISTRIBUTION: configuration.stepDistribution,
			VOL_DITHER: this._getDitherMode(configuration),
			VOL_PCF_TAPS: configuration.pcfTaps,
			VOL_FOG_MODE: environment.fogMode,
			VOL_TRANSMITTANCE: environment.transmittance,
			// Every medium but the linear fog alone has its transmittance written as the exponential of an optical depth.
			VOL_OPTICAL_DEPTH: environment.transmittance !== VolumetricTransmittanceMode.Analytic || environment.fogMode !== VolumetricFogMode.Linear,
			VOL_TRANSMITTANCE_SAMPLES: transmittanceSamples,
			VOL_DEBUG: configuration.debugMode,
			// The arrays are sized by the budget and the number of point and spot lights they hold is a uniform, so
			// the lights entering and leaving the frustum of the camera never recompile the shader.
			VOL_MAX_ARRAY_LIGHTS: environment.arrayLightCapacity,
			VOL_DIRECTIONAL_LIGHT_COUNT: directionalCount,
			VOL_LOCAL_ARRAY_LIGHTS: environment.arrayLightCapacity > directionalCount ? 1 : 0,
			VOL_SHADOW_SLOT_COUNT: shadowed.length,
			VOL_GLOBAL_LIGHT_COUNT: directionalCount + globalSlotCount + (csm ? 1 : 0),
			// The accumulation moves the samples of each pixel on its own, from one frame to the next.
			VOL_TEMPORAL_ACCUMULATION: configuration.temporalAccumulation,
			VOL_TEMPORAL_JITTER: !configuration.temporalAccumulation && configuration.ditherMode !== VolumetricDitherMode.None && configuration.temporalJitter,
			VOL_HEIGHT_FOG: configuration.heightFogEnabled,
			VOL_LIGHT_EXTINCTION: configuration.lightExtinctionEnabled,
			VOL_SCREEN_SHADOWS: configuration.screenSpaceShadows,
			VOL_SCREEN_SHADOW_STEPS: configuration.screenSpaceShadows ? configuration.screenSpaceShadowSteps : null,
		};

		shadowed.forEach((entry, index) => {
			defines[`VOL_SHADOW_KIND${index}`] = entry.shadow.kind;
			defines[`VOL_SHADOW_MODE${index}`] = entry.shadow.mode;
			defines[`VOL_SHADOW_LOCAL${index}`] = entry.shadow.local ? 1 : 0;
		});

		if (csm) {
			defines.VOL_CSM = true;
			defines.VOL_CSM_CASCADES = csm.cascades;
		}

		return defines;
	}

	/**
	 * Returns the variant of the shader of the given pass for the given defines, creating it if needed, and makes the
	 * given task draw it into the given target.
	 */
	private _preparePass(
		task: VolumetricPassTask,
		pass: "scattering" | "temporal" | "history" | "blur" | "compose",
		target: RenderTarget,
		defines: WGSLDefines
	): IVolumetricPassVariant {
		let targetId = this._targetIds.get(target);
		if (targetId === undefined) {
			targetId = this._nextTargetId++;
			this._targetIds.set(target, targetId);
		}

		const key = `${task.name}|${targetId}|${JSON.stringify(defines)}`;

		let variant = this._variants.get(key);
		if (!variant) {
			variant = this._createVariant(task.name, pass, target, defines);
			this._variants.set(key, variant);
		}

		task.variant = variant;

		return variant;
	}

	/**
	 * Records the effect render task of the given variant the first time it is used, once its textures are bound:
	 * recording builds its pipeline and its bind group.
	 */
	private _recordPass(variant: IVolumetricPassVariant): void {
		if (!variant.recorded) {
			variant.task.record();
			variant.recorded = true;
		}
	}

	private _createVariant(name: string, pass: "scattering" | "temporal" | "history" | "blur" | "compose", target: RenderTarget, defines: WGSLDefines): IVolumetricPassVariant {
		let source: string;
		switch (pass) {
			case "scattering":
				source = buildVolumetricLightingScatteringShaderWGSL(maxVolumetricShadowSlots);
				break;
			case "temporal":
				source = buildVolumetricLightingTemporalShaderWGSL();
				break;
			case "blur":
				source = buildVolumetricLightingBlurShaderWGSL();
				break;
			case "compose":
				source = buildVolumetricLightingComposeShaderWGSL();
				break;
			default:
				source = /* wgsl */ `
var sourceTextureSampler: sampler;
var sourceTexture: texture_2d<f32>;

@fragment
fn effectFragment(input: VertexOutput) -> @location(0) vec4f {
	return textureSampleLevel(sourceTexture, sourceTextureSampler, input.uv, 0.0);
}
`;
				break;
		}

		const shader = buildWGSLEffectShader(preprocessWGSL(source, defines));

		const wrapper = createEffectWrapper(this._engine, {
			name,
			vertexWGSL: fullscreenVertexWGSL,
			fragmentWGSL: shader.fragmentWGSL,
			bindings: shader.bindings,
		});

		const task = createEffectRenderTask({ name, effect: wrapper, target, clear: false }, this._engine, this._scene);

		return {
			wrapper,
			task,
			writer: shader.uniforms ? new WGSLUniformWriter(shader.uniforms) : null,
			recorded: false,
			boundViews: new Map(),
		};
	}

	/**
	 * Binds the given texture to the given binding of the given variant, only when it changed: rebuilding a bind group
	 * each frame would cost for nothing. The textures of the render targets are replaced when the canvas is resized.
	 */
	private _bindTexture(variant: IVolumetricPassVariant, name: string, texture: Texture2D): void {
		const view = texture.view;
		if (!view || variant.boundViews.get(name) === view) {
			return;
		}

		variant.boundViews.set(name, view);
		setEffectTexture(variant.wrapper, name, texture);
	}

	/**
	 * Fills the four vectors describing a light in the raymarching shader. The packing follows what the lights of
	 * Babylon.js write for the surfaces of the scene so the shafts agree with them, except for the position of the point
	 * and spot lights, which is written relative to the camera: the raymarching works in that space, which keeps its
	 * precision whatever the distance of the scene to the origin.
	 */
	private _writeLight(
		candidate: IVolumetricLightCandidate,
		configuration: IVolumetricLightingConfiguration,
		cameraPosition: number[],
		index: number,
		arrays: IVolumetricLightArrays
	): void {
		const { light, config } = candidate;
		const { data, diffuse, direction, falloff } = arrays;
		const offset = index * 4;
		const temporary = this._temporary;

		if (candidate.typeId === 1) {
			getVolumetricLightWorldDirection(light, temporary);

			// The shader expects the direction pointing to the light, not the one the light travels along.
			data[offset] = -temporary[0];
			data[offset + 1] = -temporary[1];
			data[offset + 2] = -temporary[2];
			data[offset + 3] = 1;
		} else {
			getVolumetricLightWorldPosition(light, temporary);

			data[offset] = temporary[0] - cameraPosition[0];
			data[offset + 1] = temporary[1] - cameraPosition[1];
			data[offset + 2] = temporary[2] - cameraPosition[2];
			data[offset + 3] = candidate.typeId === 2 ? 2 : 0;
		}

		const color = config.useCustomColor ? config.color : ((light as { diffuse?: number[] }).diffuse ?? [1, 1, 1]);
		const scale = getVolumetricLightScaledIntensity(light) * config.volumeIntensity * 0.00001;

		diffuse[offset] = color[0] * scale;
		diffuse[offset + 1] = color[1] * scale;
		diffuse[offset + 2] = color[2] * scale;
		diffuse[offset + 3] = config.anisotropy;

		if (candidate.typeId === 2) {
			getVolumetricLightWorldDirection(light, temporary);

			direction[offset] = temporary[0];
			direction[offset + 1] = temporary[1];
			direction[offset + 2] = temporary[2];
			direction[offset + 3] = Math.cos(getVolumetricSpotLightAngle(light) * 0.5);

			falloff[offset + 1] = getVolumetricSpotLightExponent(light);
		} else {
			direction[offset] = 0;
			direction[offset + 1] = 0;
			direction[offset + 2] = 1;
			direction[offset + 3] = -1;

			falloff[offset + 1] = 1;
		}

		falloff[offset] = getVolumetricLightRange(light, config, configuration);

		// Only read by the unshadowed tier, where it asks for the depth buffer occlusion. The shadowed tier
		// overwrites it with the frustum edge falloff of its generator, and uses its shadow map instead.
		falloff[offset + 2] = config.castVolumetricShadows ? 1 : 0;
		falloff[offset + 3] = config.shadowDarkness;
	}

	private _getCsmReceiverData(generator: ShadowGenerator): Float32Array {
		let receiver = this._csmReceivers.get(generator);
		if (!receiver) {
			const data = new Float32Array(80);
			const dispose = onCsmReceiverUpdate(generator, (update) => data.set(update.subarray(0, 80)));

			receiver = { data, dispose };
			this._csmReceivers.set(generator, receiver);
		}

		return receiver.data;
	}

	private _bindScattering(
		variant: IVolumetricPassVariant,
		pipeline: VolumetricLightingRenderingPipeline,
		selection: IVolumetricLightSelection,
		configuration: IVolumetricLightingConfiguration,
		camera: { viewProjection: ArrayLike<number>; cameraPosition: number[]; cameraForward: number[]; near: number; far: number; depthRatio: number[] }
	): void {
		const writer = variant.writer!;
		const cameraPosition = camera.cameraPosition;

		writer.set("volPassParams", 0, 0, 0, 0);
		writer.set("volDepthRatio", camera.depthRatio[0], camera.depthRatio[1]);
		writer.setArray("volInverseViewProjection", this._inverseViewProjection);
		writer.set("volCameraPosition", cameraPosition[0], cameraPosition[1], cameraPosition[2]);
		writer.set("volCameraForward", camera.cameraForward[0], camera.cameraForward[1], camera.cameraForward[2]);
		writer.set("volCameraMinMaxZ", camera.near, camera.far);
		writer.set("volFrameIndex", this._frame % 64);
		writer.set("volTemporalOffset", (pipeline._frameCounter * goldenRatioConjugate) % 1);

		writer.set("volFogInfos", configuration.fogMode, configuration.fogStart, configuration.fogEnd, configuration.fogDensity);
		writer.set("volFogColor", configuration.fogColor[0], configuration.fogColor[1], configuration.fogColor[2]);
		writer.set("volLinearFogEps", Math.max((configuration.fogEnd - configuration.fogStart) * 0.02, 1e-4));
		writer.set("volMedium", configuration.albedo, configuration.heightFogBaseHeight, configuration.heightFogFalloff, 0);

		if (configuration.screenSpaceShadows) {
			writer.setArray("volViewProjection", camera.viewProjection);
			writer.set("volScreenShadowParams", configuration.screenSpaceShadowMaxDistance, configuration.screenSpaceShadowBias, configuration.screenSpaceShadowThickness, 0);
		}

		const ambient = configuration.ambientColor;
		writer.set("volAmbient", ambient[0] * configuration.ambientIntensity, ambient[1] * configuration.ambientIntensity, ambient[2] * configuration.ambientIntensity);

		// The directional lights come first in the arrays, the shader walks the point and spot lights after them.
		const unshadowedCount = selection.unshadowed.length;
		const localCount = unshadowedCount - selection.directionalCount;

		// The accumulation averages the samples over their whole segments, it needs them spread over all of it.
		const ditherStrength = configuration.temporalAccumulation ? 1 : configuration.ditherStrength;

		writer.set("volParams", configuration.maxDistance, ditherStrength, configuration.lightExtinctionClamp, localCount);

		// Unshadowed lights.
		for (let i = 0; i < unshadowedCount; ++i) {
			this._writeLight(selection.unshadowed[i], configuration, cameraPosition, i, this._lights);
		}

		if (unshadowedCount) {
			const count = unshadowedCount * 4;

			writer.setArray("volLightData", this._lights.data.subarray(0, count));
			writer.setArray("volLightDiffuse", this._lights.diffuse.subarray(0, count));
			writer.setArray("volLightDirection", this._lights.direction.subarray(0, count));
			writer.setArray("volLightFalloff", this._lights.falloff.subarray(0, count));
		}

		// Shadowed lights.
		selection.shadowed.forEach((entry, index) => {
			this._writeLight(entry.candidate, configuration, cameraPosition, index, this._shadowLights);

			const { generator, kind } = entry.shadow;
			const internal = generator as unknown as { _shadowsInfo: Float32Array; _depthValues: Float32Array; _lightMatrix: Float32Array };
			const offset = index * 4;

			// Babylon Lite has no frustum edge falloff for the PCF shadow maps: the value of the editor is used.
			this._shadowLights.falloff[offset + 2] =
				kind === VolumetricShadowKind.Sampler2DShadow ? (_getVolumetricShadowGeneratorData(generator)?.frustumEdgeFalloff ?? 0) : internal._shadowsInfo[3];

			this._shadowInfo[offset] = internal._shadowsInfo[0];
			this._shadowInfo[offset + 1] = internal._shadowsInfo[2];
			this._shadowInfo[offset + 2] = internal._depthValues[0];
			this._shadowInfo[offset + 3] = internal._depthValues[1];

			this._shadowMatrices.set(internal._lightMatrix, index * 16);

			this._bindTexture(variant, `volShadowSampler${index}`, getShadowMapTexture(generator));
		});

		if (selection.shadowed.length) {
			const count = selection.shadowed.length * 4;

			writer.setArray("volShadowLightData", this._shadowLights.data.subarray(0, count));
			writer.setArray("volShadowLightDiffuse", this._shadowLights.diffuse.subarray(0, count));
			writer.setArray("volShadowLightDirection", this._shadowLights.direction.subarray(0, count));
			writer.setArray("volShadowLightFalloff", this._shadowLights.falloff.subarray(0, count));
			writer.setArray("volShadowInfo", this._shadowInfo.subarray(0, count));
			writer.setArray("volShadowMatrix", this._shadowMatrices.subarray(0, selection.shadowed.length * 16));
		}

		// Cascaded shadow map of the directional light, when there is one.
		if (selection.csm) {
			const { candidate, generator, cascades } = selection.csm;
			const receiver = this._getCsmReceiverData(generator);

			this._writeLight(candidate, configuration, cameraPosition, 0, this._csmLight);

			writer.setArray("volCsmLightData", this._csmLight.data);
			writer.setArray("volCsmLightDiffuse", this._csmLight.diffuse);
			writer.setArray("volCsmLightDirection", this._csmLight.direction);
			writer.set("volCsmLightFalloff", this._csmLight.falloff[0], this._csmLight.falloff[1], receiver[75], candidate.config.shadowDarkness);
			writer.set("volCsmInfo", receiver[72], receiver[74], 0, 1);
			writer.setArray("volCsmMatrices", receiver.subarray(0, cascades * 16));

			this._bindTexture(variant, "volCsmSampler", getShadowMapTexture(generator));
		}

		setEffectUniforms(variant.wrapper, writer.data);

		this._bindTexture(variant, "volLinearDepthTexture", this._linearDepth);
		this._recordPass(variant);
	}
}
