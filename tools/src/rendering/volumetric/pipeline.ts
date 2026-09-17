import { Scene } from "@babylonjs/core/scene";
import { Light } from "@babylonjs/core/Lights/light";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Effect } from "@babylonjs/core/Materials/effect";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Observer } from "@babylonjs/core/Misc/observable";
import { Constants } from "@babylonjs/core/Engines/constants";
import { Vector3, Matrix } from "@babylonjs/core/Maths/math.vector";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { DepthRenderer } from "@babylonjs/core/Rendering/depthRenderer";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";
import { PostProcessRenderEffect } from "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderEffect";
import { PostProcessRenderPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipeline";
import { PrePassEffectConfiguration } from "@babylonjs/core/Rendering/prePassEffectConfiguration";

import { isDirectionalLight, isSpotLight } from "../../tools/guards";

import {
	IVolumetricLightingConfiguration,
	VolumetricDitherMode,
	VolumetricFogMode,
	getDefaultVolumetricLightingConfiguration,
	getVolumetricLightSteps,
	maxVolumetricArrayLights,
	maxVolumetricShadowSlots,
	normalizeVolumetricLightingConfiguration,
} from "./types";

import {
	IVolumetricBudget,
	IVolumetricLightCandidate,
	IVolumetricLightSelection,
	IVolumetricLightingStats,
	IVolumetricShaderEnvironment,
	VolumetricShadowKind,
	VolumetricTransmittanceMode,
	computeVolumetricBudget,
	getVolumetricLightRange,
	getVolumetricLightWorldDirection,
	getVolumetricLightWorldPosition,
	selectVolumetricLights,
} from "./selector";

import {
	VolumetricDepthSource,
	createVolumetricLightingPrePassConfiguration,
	getVolumetricGeometryBufferDepthTexture,
	getVolumetricGeometryBufferRenderer,
	getVolumetricPrePassDepthTexture,
	getVolumetricPrePassRenderer,
	resolveVolumetricDepthSource,
} from "./depth";

import {
	registerVolumetricLightingShaders,
	volumetricLightingBlurShaderName,
	volumetricLightingComposeShaderName,
	volumetricLightingLinearDepthShaderName,
	volumetricLightingScatteringShaderName,
} from "./shaders";

const leftHandedForward = new Vector3(0, 0, 1);
const rightHandedForward = new Vector3(0, 0, -1);

/**
 * Defines the keys of the configuration that change the shape of the chain of post-processes and, as a
 * result, require the render effects of the pipeline to be rebuilt instead of simply rebound.
 */
const structuralConfigurationKeys: (keyof IVolumetricLightingConfiguration)[] = ["resolutionScale", "blurPasses"];

/**
 * Defines the number of samples of the optical depth integrated per pixel when the medium has no closed form.
 */
const transmittanceSamples = 32;

/**
 * Defines the list of every uniform the raymarching shader may declare. Listing a uniform that the compiled
 * program optimized away is safe, Babylon.js resolves it to a null location and the setters become no-ops.
 */
const scatteringUniforms = [
	"volInverseViewProjection",
	"volViewProjection",
	"volCameraPosition",
	"volCameraForward",
	"volCameraMinMaxZ",
	"volDepthRatio",
	"volFrameIndex",
	"volFogInfos",
	"volFogColor",
	"volLinearFogEps",
	"volMedium",
	"volScreenShadowParams",
	"volAmbient",
	"volParams",
	"volLightData",
	"volLightDiffuse",
	"volLightDirection",
	"volLightFalloff",
	"volShadowLightData",
	"volShadowLightDiffuse",
	"volShadowLightDirection",
	"volShadowLightFalloff",
	"volShadowInfo",
	"volShadowMatrix",
	"volCsmLightData",
	"volCsmLightDiffuse",
	"volCsmLightDirection",
	"volCsmLightFalloff",
	"volCsmInfo",
	"volCsmMatrices",
];

/**
 * Defines the options of a post-process of the pipeline.
 */
interface IVolumetricPostProcessOptions {
	name: string;
	shaderName: string;
	uniforms: string[];
	samplers: string[];
	/**
	 * Defines the ratio of the post-process, which sizes the texture it reads.
	 */
	ratio: number;
	/**
	 * Defines the sampling mode and the type of the texture the post-process reads.
	 */
	samplingMode: number;
	textureType: number;
	textureFormat?: number;
	defines: string;
}

const scatteringSamplers = ["volCsmSampler"];
for (let i = 0; i < maxVolumetricShadowSlots; ++i) {
	scatteringSamplers.push(`volShadowSampler${i}`);
}

/**
 * Defines a rendering pipeline computing single-scattering volumetric lighting: the light shafts are
 * integrated through a participating medium the pipeline describes on its own, and are occluded either by
 * the shadow map a light already renders or, when it has none, by the depth buffer of the scene.
 *
 * The depth of the scene is read from the cheapest source available, re-evaluated every frame: the prepass
 * renderer when the scene has one, then the geometry buffer renderer, and only when the scene has neither a
 * depth renderer, which costs an additional rendering of every mesh of the scene.
 *
 * Every light of the scene can take part in the effect, including the lights that live inside a clustered
 * light container, and each one is configured individually through "light.metadata.volumetricLighting".
 *
 * The cost of the effect scales with what is on screen rather than with the number of lights: a directional
 * light is marched along the whole view ray, but a point or a spot light is only integrated over the part
 * of the view ray crossing its volume, so a light costs nothing to the pixels whose view ray misses it.
 *
 * The pipeline is composed of four passes:
 * - a pass keeping the color of the scene untouched and extracting its linear depth, which every later pass
 *   reads instead of the depth map,
 * - the raymarching pass, rendered at a fraction of the resolution of the canvas,
 * - a separable depth aware blur denoising the result of the raymarching,
 * - a composition pass upsampling the result and adding it to the color of the scene.
 */
export class VolumetricLightingRenderingPipeline extends PostProcessRenderPipeline {
	/**
	 * Defines the name of the render effect keeping the color of the scene and extracting its linear depth.
	 */
	public static readonly SceneColorEffectName: string = "VolumetricLightingSceneColorEffect";
	/**
	 * Defines the name of the render effect raymarching the participating medium.
	 */
	public static readonly ScatteringEffectName: string = "VolumetricLightingScatteringEffect";
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
	public static GetDefaultFogEnd(scene: Scene, camera: Camera): number {
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
	public static GetDefaultFogDensity(scene: Scene, camera: Camera): number {
		let size = 0;

		if (scene.meshes.length) {
			const extends_ = scene.getWorldExtends();
			const diagonal = extends_.max.subtract(extends_.min).length();

			if (isFinite(diagonal)) {
				size = diagonal;
			}
		}

		// An empty scene, or one made only of infinitely small meshes, falls back on how far the camera is
		// from the origin. The far plane is useless here: the default camera of the editor sets it to
		// 1 500 000, which would describe a medium thinner than the cutoff of the raymarching shader.
		if (size < 1e-3) {
			size = Math.max(camera.globalPosition.length(), camera.maxZ * 0.001, 1);
		}

		// Kept comfortably above the "sigmaT > 1e-6" cutoff of the shader, under which nothing scatters.
		return Math.min(1, Math.max(1e-5, 1 / Math.max(1e-3, size)));
	}

	/**
	 * Returns wether or not the volumetric lighting rendering pipeline is supported by the given engine.
	 * The raymarching shader relies on shadow samplers, texture arrays and texel fetches, which need WebGL 2,
	 * and ships as both GLSL and hand written WGSL so WebGPU is supported without an external transpiler.
	 * @param engine defines the reference to the engine to check.
	 */
	public static IsSupported(engine: AbstractEngine): boolean {
		if (engine.isWebGPU) {
			return true;
		}

		return ((engine as any).webGLVersion ?? 0) >= 2;
	}

	/**
	 * Returns the language the shaders of the pipeline must be written in for the given engine.
	 * @param engine defines the reference to the engine to check.
	 */
	public static GetShaderLanguage(engine: AbstractEngine): ShaderLanguage {
		return engine.isWebGPU ? ShaderLanguage.WGSL : ShaderLanguage.GLSL;
	}

	private _scene: Scene;
	private _camera: Camera;
	private _configuration: IVolumetricLightingConfiguration;
	private _configurationProxy: IVolumetricLightingConfiguration;

	private _textureType: number;
	private _shaderLanguage: ShaderLanguage;
	private _ldrEncode: boolean;
	private _linearDepthPacked: boolean;

	private _depthSource: VolumetricDepthSource = VolumetricDepthSource.DepthRenderer;
	private _depthRenderer: DepthRenderer | null = null;
	private _ownsDepthRenderer: boolean = false;
	private _depthMode: 0 | 1 | 2 = 0;
	private _prePassConfiguration: PrePassEffectConfiguration = createVolumetricLightingPrePassConfiguration();

	private _linearDepthPostProcess: PostProcess | null = null;
	private _scatteringPostProcess: PostProcess | null = null;
	private _blurPostProcesses: PostProcess[] = [];
	private _composePostProcess: PostProcess | null = null;

	private _selection: IVolumetricLightSelection | null = null;
	private _budget: IVolumetricBudget;
	private _linearDepthDefines: string = "";
	private _scatteringDefines: string = "";
	private _blurDefines: string = "";
	private _composeDefines: string = "";
	private _frameCount: number = 0;
	private _lightsDirty: boolean = true;
	private _disposed: boolean = false;

	private _beforeCameraRenderObserver: Observer<Camera> | null = null;
	private _lightAddedObserver: Observer<Light> | null = null;
	private _lightRemovedObserver: Observer<Light> | null = null;

	private _inverseViewProjection: Matrix = Matrix.Identity();
	private _temporaryVector: Vector3 = new Vector3();
	private _temporaryColor: Color3 = new Color3();

	private _lightData: Float32Array = new Float32Array(maxVolumetricArrayLights * 4);
	private _lightDiffuse: Float32Array = new Float32Array(maxVolumetricArrayLights * 4);
	private _lightDirection: Float32Array = new Float32Array(maxVolumetricArrayLights * 4);
	private _lightFalloff: Float32Array = new Float32Array(maxVolumetricArrayLights * 4);

	private _shadowLightData: Float32Array = new Float32Array(maxVolumetricShadowSlots * 4);
	private _shadowLightDiffuse: Float32Array = new Float32Array(maxVolumetricShadowSlots * 4);
	private _shadowLightDirection: Float32Array = new Float32Array(maxVolumetricShadowSlots * 4);
	private _shadowLightFalloff: Float32Array = new Float32Array(maxVolumetricShadowSlots * 4);
	private _shadowInfo: Float32Array = new Float32Array(maxVolumetricShadowSlots * 4);
	private _shadowMatrices: Float32Array = new Float32Array(maxVolumetricShadowSlots * 16);
	private _csmLightData: Float32Array = new Float32Array(4);
	private _csmLightDiffuse: Float32Array = new Float32Array(4);
	private _csmLightDirection: Float32Array = new Float32Array(4);
	private _csmLightFalloff: Float32Array = new Float32Array(4);
	private _csmMatrices: Float32Array = new Float32Array(4 * 16);

	/**
	 * Constructor.
	 * @param name defines the name of the pipeline.
	 * @param scene defines the reference to the scene the pipeline belongs to.
	 * @param camera defines the reference to the camera the pipeline is attached to.
	 * @param configuration defines the optional configuration to apply on the pipeline.
	 */
	public constructor(name: string, scene: Scene, camera: Camera, configuration?: Partial<IVolumetricLightingConfiguration>) {
		super(scene.getEngine(), name);

		this._shaderLanguage = VolumetricLightingRenderingPipeline.GetShaderLanguage(scene.getEngine());
		registerVolumetricLightingShaders(this._shaderLanguage);

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

		const engine = scene.getEngine();
		const caps = engine.getCaps();

		const supportsHalfFloat = caps.textureHalfFloatRender && caps.textureHalfFloatLinearFiltering;
		this._textureType = supportsHalfFloat ? Constants.TEXTURETYPE_HALF_FLOAT : Constants.TEXTURETYPE_UNSIGNED_BYTE;
		this._ldrEncode = !supportsHalfFloat;

		// The linear depth is read with texel fetches only, so a 32 bits float texture needs no filtering
		// support. Without float render targets it is packed in an 8 bits RGBA texture instead.
		this._linearDepthPacked = !caps.textureFloatRender;

		this._budget = computeVolumetricBudget(engine, this._configuration);

		this._depthSource = resolveVolumetricDepthSource(scene);
		this._setupDepthSource();
		this._buildRenderEffects();

		scene.postProcessRenderPipelineManager.addPipeline(this);
		scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(this.name, camera);

		this._beforeCameraRenderObserver = scene.onBeforeCameraRenderObservable.add((renderedCamera) => {
			if (renderedCamera === this._camera) {
				this._updateDepthSource();
				this._updateSelection();
			}
		});

		this._lightAddedObserver = scene.onNewLightAddedObservable.add(() => this.markLightsDirty());
		this._lightRemovedObserver = scene.onLightRemovedObservable.add(() => this.markLightsDirty());
	}

	/**
	 * Gets wether or not the pipeline was disposed. Babylon.js disposes a rendering pipeline on its own when
	 * one of its post-processes fails to compile, so this is not always the result of an explicit call.
	 */
	public get isDisposed(): boolean {
		return this._disposed;
	}

	/**
	 * Gets the reference to the scene the pipeline belongs to.
	 */
	public get scene(): Scene {
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
	 * change immediately, rebuilding the chain of post-processes when the change requires it.
	 */
	public get configuration(): IVolumetricLightingConfiguration {
		return this._configurationProxy;
	}

	/**
	 * Gets where the depth of the scene is currently read from. @see VolumetricDepthSource
	 */
	public get depthSource(): VolumetricDepthSource {
		return this._depthSource;
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
	 * next frame. Called when the volumetric configuration of a light is edited in the inspector.
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

		const requiresRebuild = structuralConfigurationKeys.some((key) => normalized[key] !== this._configuration[key]);

		Object.assign(this._configuration, normalized);

		this._budget = computeVolumetricBudget(this._scene.getEngine(), this._configuration);
		this._lightsDirty = true;

		if (requiresRebuild) {
			this._rebuildRenderEffects();
		}
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
	 * Disposes the pipeline and all the resources it owns.
	 */
	public dispose(): void {
		if (this._disposed) {
			return;
		}

		this._disposed = true;

		this._scene.onBeforeCameraRenderObservable.remove(this._beforeCameraRenderObserver);
		this._scene.onNewLightAddedObservable.remove(this._lightAddedObserver);
		this._scene.onLightRemovedObservable.remove(this._lightRemovedObserver);

		this._beforeCameraRenderObserver = null;
		this._lightAddedObserver = null;
		this._lightRemovedObserver = null;

		const cameras = this._cameras.slice();

		this._scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline(this.name, cameras);
		this._disposePostProcesses(cameras);

		this._releaseDepthSource();

		this._selection = null;

		// Removing the pipeline explicitly, "dispose" alone can leave a stale entry in the manager.
		this._scene.postProcessRenderPipelineManager.removePipeline(this.name);

		super.dispose();
	}

	private _onConfigurationChanged(key: keyof IVolumetricLightingConfiguration): void {
		if (key === "maxLights" || key === "maxShadowedLights") {
			this._budget = computeVolumetricBudget(this._scene.getEngine(), this._configuration);
		}

		this._lightsDirty = true;

		if (structuralConfigurationKeys.includes(key)) {
			this._rebuildRenderEffects();
		}
	}

	/**
	 * Prepares the current source of the depth of the scene and detects the format it stores so the shader
	 * can be compiled for it.
	 */
	private _setupDepthSource(): void {
		switch (this._depthSource) {
			case VolumetricDepthSource.PrePass:
				// The prepass renderer writes the view space Z in a float texture and clears the sky to 0. The
				// texture is requested through the effect configuration of the linear depth pass.
				this._depthMode = 1;
				break;

			case VolumetricDepthSource.GeometryBuffer:
				// Same content as the prepass renderer.
				this._ensureGeometryBufferDepth();
				this._depthMode = 1;
				break;

			default:
				this._setupDepthRenderer();
				break;
		}

		this._applyPrePassConfiguration();
	}

	/**
	 * Releases what the current source of the depth of the scene owns.
	 */
	private _releaseDepthSource(): void {
		if (this._ownsDepthRenderer) {
			this._scene.disableDepthRenderer(this._camera);
		}

		this._depthRenderer = null;
		this._ownsDepthRenderer = false;

		if (this._linearDepthPostProcess) {
			this._linearDepthPostProcess._prePassEffectConfiguration = undefined!;
		}
	}

	/**
	 * Switches to another source of the depth of the scene when the renderers of the scene changed: the
	 * effects enabling the prepass renderer can be created after this pipeline, and it can be disabled at any time.
	 */
	private _updateDepthSource(): void {
		if (this._disposed) {
			return;
		}

		const depthSource = resolveVolumetricDepthSource(this._scene);

		if (depthSource === this._depthSource) {
			// Another effect sharing the geometry buffer may have disabled its depth texture.
			if (depthSource === VolumetricDepthSource.GeometryBuffer) {
				this._ensureGeometryBufferDepth();
			}

			return;
		}

		this._releaseDepthSource();

		this._depthSource = depthSource;
		this._setupDepthSource();

		// The prepass renderer only collects the textures the post-processes of the camera require when it updates: this
		// either starts or stops the writing of the depth texture, unless another effect requires it too. Attaching and
		// detaching the post-processes, when the pipeline is rebuilt or disposed, already marks it as dirty.
		getVolumetricPrePassRenderer(this._scene)?.markAsDirty();

		// Runs a selection pass this frame, which recompiles the passes whose defines depend on the format of the depth.
		this._lightsDirty = true;
	}

	/**
	 * Enables the depth texture of the geometry buffer renderer. Toggling it recreates the whole geometry
	 * buffer, so it is only done when no other effect already enabled it.
	 */
	private _ensureGeometryBufferDepth(): void {
		const geometryBufferRenderer = getVolumetricGeometryBufferRenderer(this._scene);
		if (geometryBufferRenderer && !geometryBufferRenderer.enableDepth) {
			geometryBufferRenderer.enableDepth = true;
		}
	}

	/**
	 * Asks the prepass renderer to write the depth of the scene when it is the current source. The prepass
	 * renderer collects the configurations of the post-processes attached to the camera when it updates.
	 */
	private _applyPrePassConfiguration(): void {
		if (this._linearDepthPostProcess && this._depthSource === VolumetricDepthSource.PrePass) {
			this._linearDepthPostProcess._prePassEffectConfiguration = this._prePassConfiguration;
		}
	}

	/**
	 * Adopts the depth renderer of the camera when one already exists instead of paying for a second full
	 * depth pass, and detects the format it stores so the shader can be compiled for it.
	 */
	private _setupDepthRenderer(): void {
		const existing = (this._scene as any)._depthRenderer?.[this._camera.uniqueId] as DepthRenderer | undefined;

		this._ownsDepthRenderer = !existing;
		this._depthRenderer = existing ?? this._scene.enableDepthRenderer(this._camera, false, false, Constants.TEXTURE_NEAREST_SAMPLINGMODE, false);

		if (this._depthRenderer.isPacked) {
			this._depthMode = 2;
		} else if (this._depthRenderer.clearColor.r === 0) {
			// The depth renderer stores the view space Z, the sky is cleared to 0 instead of 1.
			this._depthMode = 1;
		} else {
			this._depthMode = 0;
		}
	}

	/**
	 * Binds the two values needed to turn the content of the depth map back into a distance along the view
	 * axis. The depth renderer stores "(clipZ + minZ) / (minZ + maxZ)", where "clipZ" is affine in the view
	 * space Z for both the perspective and the orthographic projections, so the inverse is affine too and
	 * can be derived exactly from the projection matrix instead of being approximated.
	 */
	private _bindDepthUniforms(effect: Effect): void {
		const camera = this._camera;
		const engine = this._scene.getEngine();

		effect.setFloat2("volCameraMinMaxZ", camera.minZ, camera.maxZ);

		if (this._depthMode === 1) {
			// The view space Z is stored as is, there is nothing to invert.
			effect.setFloat2("volDepthUnpack", 1, 0);
			return;
		}

		// Same values as "DepthRenderer" binds in its own "depthValues" uniform, including the orthographic
		// branch where it uses constants instead of the near and far planes of the camera.
		const isOrthographic = camera.mode === Camera.ORTHOGRAPHIC_CAMERA;

		const minZ = isOrthographic
			? !engine.useReverseDepthBuffer && engine.isNDCHalfZRange
				? 0
				: 1
			: engine.useReverseDepthBuffer && engine.isNDCHalfZRange
				? camera.minZ
				: engine.isNDCHalfZRange
					? 0
					: camera.minZ;

		const maxZ = isOrthographic ? (engine.useReverseDepthBuffer && engine.isNDCHalfZRange ? 0 : 1) : engine.useReverseDepthBuffer && engine.isNDCHalfZRange ? 0 : camera.maxZ;

		const projection = this._scene.getProjectionMatrix().m;
		const scaleZ = projection[10];
		const offsetZ = projection[14];

		if (!scaleZ) {
			effect.setFloat2("volDepthUnpack", camera.maxZ, 0);
			return;
		}

		const sign = engine.useReverseDepthBuffer ? -1 : 1;

		effect.setFloat2("volDepthUnpack", (sign * (minZ + maxZ)) / scaleZ, (-sign * minZ - offsetZ) / scaleZ);
	}

	private _getEnvironment(): IVolumetricShaderEnvironment {
		const configuration = this._configuration;

		// The medium of the pipeline has a closed form transmittance, except when the height falloff is
		// combined with a fog mode whose density already varies along the ray.
		let transmittance = VolumetricTransmittanceMode.Analytic;
		if (configuration.heightFogEnabled) {
			transmittance = configuration.fogMode === VolumetricFogMode.Exponential ? VolumetricTransmittanceMode.AnalyticHeight : VolumetricTransmittanceMode.Numeric;
		}

		return {
			depthMode: this._depthMode,
			ldrEncode: this._ldrEncode,
			reverseDepth: this._scene.getEngine().useReverseDepthBuffer,
			ndcHalfZ: this._scene.getEngine().isNDCHalfZRange,
			fogMode: configuration.fogMode,
			transmittance,
			linearDepthPacked: this._linearDepthPacked,
			arrayLightCapacity: this._budget.maxArrayLights,
			lightSteps: getVolumetricLightSteps(configuration),
		};
	}

	/**
	 * Returns the defines of the passes reading the linear depth, which only depend on how it is stored.
	 */
	private _buildLinearDepthReadDefines(environment: IVolumetricShaderEnvironment): string {
		return environment.linearDepthPacked ? "#define VOL_LINEAR_DEPTH_PACKED\n" : "";
	}

	/**
	 * Returns the defines of the linear depth pass, the only one reading the depth map of the depth renderer.
	 */
	private _buildLinearDepthDefines(environment: IVolumetricShaderEnvironment): string {
		let defines = this._buildLinearDepthReadDefines(environment);

		if (environment.depthMode === 2) {
			defines += "#define VOL_DEPTH_PACKED\n";
		} else if (environment.depthMode === 1) {
			defines += "#define VOL_DEPTH_VIEWZ\n";
		}

		return defines;
	}

	private _buildScatteringDefines(selection: IVolumetricLightSelection | null, environment: IVolumetricShaderEnvironment): string {
		const configuration = this._configuration;

		const shadowed = selection?.shadowed ?? [];
		const directionalCount = selection?.directionalCount ?? 0;
		const csm = selection?.csm ?? null;
		const globalSlotCount = shadowed.filter((entry) => !entry.shadow.local).length;

		let defines = this._buildLinearDepthReadDefines(environment);

		defines += `#define VOL_STEPS ${configuration.steps}\n`;
		defines += `#define VOL_LIGHT_STEPS ${environment.lightSteps}\n`;
		defines += `#define VOL_LOCAL_MAX_STEPS ${Math.max(environment.lightSteps, configuration.steps)}\n`;
		defines += `#define VOL_DISTRIBUTION ${configuration.stepDistribution}\n`;
		defines += `#define VOL_DITHER ${configuration.ditherMode}\n`;
		defines += `#define VOL_PCF_TAPS ${configuration.pcfTaps}\n`;
		defines += `#define VOL_FOG_MODE ${environment.fogMode}\n`;
		defines += `#define VOL_TRANSMITTANCE ${environment.transmittance}\n`;

		// Every medium but the linear fog alone has its transmittance written as the exponential of an optical depth.
		if (environment.transmittance !== VolumetricTransmittanceMode.Analytic || environment.fogMode !== VolumetricFogMode.Linear) {
			defines += "#define VOL_OPTICAL_DEPTH\n";
		}
		defines += `#define VOL_TRANSMITTANCE_SAMPLES ${transmittanceSamples}\n`;
		defines += `#define VOL_DEBUG ${configuration.debugMode}\n`;

		// The arrays are sized by the budget and the number of point and spot lights they hold is a uniform, so
		// the lights entering and leaving the frustum of the camera never recompile the shader.
		defines += `#define VOL_MAX_ARRAY_LIGHTS ${environment.arrayLightCapacity}\n`;
		defines += `#define VOL_DIRECTIONAL_LIGHT_COUNT ${directionalCount}\n`;
		defines += `#define VOL_LOCAL_ARRAY_LIGHTS ${environment.arrayLightCapacity > directionalCount ? 1 : 0}\n`;
		defines += `#define VOL_SHADOW_SLOT_COUNT ${shadowed.length}\n`;
		defines += `#define VOL_GLOBAL_LIGHT_COUNT ${directionalCount + globalSlotCount + (csm ? 1 : 0)}\n`;

		if (configuration.ditherMode !== VolumetricDitherMode.None && configuration.temporalJitter) {
			defines += "#define VOL_TEMPORAL_JITTER\n";
		}

		if (configuration.heightFogEnabled) {
			defines += "#define VOL_HEIGHT_FOG\n";
		}

		if (configuration.lightExtinctionEnabled) {
			defines += "#define VOL_LIGHT_EXTINCTION\n";
		}

		if (configuration.screenSpaceShadows) {
			defines += "#define VOL_SCREEN_SHADOWS\n";
			defines += `#define VOL_SCREEN_SHADOW_STEPS ${configuration.screenSpaceShadowSteps}\n`;
		}

		if (environment.ldrEncode) {
			defines += "#define VOL_LDR_ENCODE\n";
		}

		if (environment.reverseDepth) {
			defines += "#define VOL_REVERSE_DEPTH\n";
		}

		if (environment.ndcHalfZ) {
			defines += "#define VOL_NDC_HALF_Z\n";
		}

		shadowed.forEach((entry, index) => {
			defines += `#define VOL_SHADOW_KIND${index} ${entry.shadow.kind}\n`;
			defines += `#define VOL_SHADOW_MODE${index} ${entry.shadow.mode}\n`;
			defines += `#define VOL_SHADOW_LOCAL${index} ${entry.shadow.local ? 1 : 0}\n`;

			if (entry.shadow.packed) {
				defines += `#define VOL_SHADOW_PACKED${index}\n`;
			}
		});

		if (csm) {
			defines += "#define VOL_CSM\n";
			defines += `#define VOL_CSM_CASCADES ${csm.cascades}\n`;
			defines += `#define VOL_CSM_KIND ${csm.kind === VolumetricShadowKind.Sampler2DShadow ? 1 : 0}\n`;

			if (csm.packed) {
				defines += "#define VOL_CSM_PACKED\n";
			}
		}

		return defines;
	}

	private _buildBlurDefines(environment: IVolumetricShaderEnvironment): string {
		return `${this._buildLinearDepthReadDefines(environment)}#define VOL_BLUR_RADIUS ${this._configuration.blurRadius}\n`;
	}

	private _buildComposeDefines(environment: IVolumetricShaderEnvironment): string {
		let defines = this._buildLinearDepthReadDefines(environment);

		defines += `#define VOL_DEBUG ${this._configuration.debugMode}\n`;

		if (environment.ldrEncode) {
			defines += "#define VOL_LDR_ENCODE\n";
		}

		return defines;
	}

	private _createPostProcess(options: IVolumetricPostProcessOptions): PostProcess {
		const postProcess = new PostProcess(
			options.name,
			options.shaderName,
			options.uniforms,
			options.samplers,
			options.ratio,
			null,
			options.samplingMode,
			this._scene.getEngine(),
			false,
			options.defines,
			options.textureType,
			undefined,
			undefined,
			false,
			options.textureFormat,
			this._shaderLanguage
		);

		postProcess.autoClear = false;
		postProcess.alphaMode = Constants.ALPHA_DISABLE;

		return postProcess;
	}

	private _buildRenderEffects(): void {
		const engine = this._scene.getEngine();
		const configuration = this._configuration;
		const environment = this._getEnvironment();

		this._linearDepthDefines = this._buildLinearDepthDefines(environment);
		this._scatteringDefines = this._buildScatteringDefines(this._selection, environment);
		this._blurDefines = this._buildBlurDefines(environment);
		this._composeDefines = this._buildComposeDefines(environment);

		// First pass of the chain: its input is the color of the scene, kept untouched for the composition, and
		// it writes the linear depth of the scene. The ratio of a post-process sizes the texture it READS, the
		// size of what it writes is set by the pass that follows.
		this._linearDepthPostProcess = this._createPostProcess({
			name: "VolumetricLightingLinearDepth",
			shaderName: volumetricLightingLinearDepthShaderName,
			uniforms: ["volCameraMinMaxZ", "volDepthUnpack"],
			samplers: ["depthSampler"],
			ratio: 1.0,
			samplingMode: Texture.BILINEAR_SAMPLINGMODE,
			textureType: this._textureType,
			defines: this._linearDepthDefines,
		});
		this._linearDepthPostProcess.onApplyObservable.add((effect) => this._bindLinearDepth(effect));
		this._applyPrePassConfiguration();

		// The input of the raymarching pass is the linear depth, kept at the full resolution so the occlusion by
		// the depth buffer sees the geometry as the scene draws it: the pass itself still rasterizes at the
		// reduced resolution, which is set by the ratio of the pass that follows. The linear depth is only ever
		// read with texel fetches, and a 32 bits float texture can't be filtered on every engine anyway.
		this._scatteringPostProcess = this._createPostProcess({
			name: "VolumetricLightingScattering",
			shaderName: volumetricLightingScatteringShaderName,
			uniforms: scatteringUniforms,
			samplers: scatteringSamplers,
			ratio: 1.0,
			samplingMode: Texture.NEAREST_SAMPLINGMODE,
			textureType: this._linearDepthPacked ? Constants.TEXTURETYPE_UNSIGNED_BYTE : Constants.TEXTURETYPE_FLOAT,
			textureFormat: this._linearDepthPacked ? Constants.TEXTUREFORMAT_RGBA : Constants.TEXTUREFORMAT_R,
			defines: this._scatteringDefines,
		});
		this._scatteringPostProcess.onApplyObservable.add((effect) => this._bindScattering(effect));

		this._blurPostProcesses = [];
		for (let i = 0; i < configuration.blurPasses; ++i) {
			const blurPostProcess = this._createPostProcess({
				name: `VolumetricLightingBlur${i}`,
				shaderName: volumetricLightingBlurShaderName,
				uniforms: ["volCameraMinMaxZ", "volDepthRatio", "volBlurDirection", "volBlurParams"],
				samplers: ["volLinearDepthSampler"],
				ratio: configuration.resolutionScale,
				samplingMode: Texture.BILINEAR_SAMPLINGMODE,
				textureType: this._textureType,
				defines: this._blurDefines,
			});

			blurPostProcess.onApplyObservable.add((effect) => this._bindBlur(effect, i));

			this._blurPostProcesses.push(blurPostProcess);
		}

		// Keeping the ratio at "resolutionScale" is what makes the pass before it rasterize at the reduced
		// resolution; the composition itself still draws at the size of whatever follows it.
		this._composePostProcess = this._createPostProcess({
			name: "VolumetricLightingCompose",
			shaderName: volumetricLightingComposeShaderName,
			uniforms: ["volCameraMinMaxZ", "volDepthRatio", "volComposeParams"],
			samplers: ["volSceneSampler", "volLinearDepthSampler"],
			ratio: configuration.resolutionScale,
			samplingMode: Texture.BILINEAR_SAMPLINGMODE,
			textureType: this._textureType,
			defines: this._composeDefines,
		});
		this._composePostProcess.onApplyObservable.add((effect) => this._bindCompose(effect));

		this.addEffect(new PostProcessRenderEffect(engine, VolumetricLightingRenderingPipeline.SceneColorEffectName, () => this._linearDepthPostProcess, true));
		this.addEffect(new PostProcessRenderEffect(engine, VolumetricLightingRenderingPipeline.ScatteringEffectName, () => this._scatteringPostProcess, true));

		if (this._blurPostProcesses.length) {
			this.addEffect(new PostProcessRenderEffect(engine, VolumetricLightingRenderingPipeline.BlurEffectName, () => this._blurPostProcesses, true));
		}

		this.addEffect(new PostProcessRenderEffect(engine, VolumetricLightingRenderingPipeline.ComposeEffectName, () => this._composePostProcess, true));
	}

	private _disposePostProcesses(cameras: Camera[]): void {
		const postProcesses: (PostProcess | null)[] = [this._linearDepthPostProcess, this._scatteringPostProcess, ...this._blurPostProcesses, this._composePostProcess];

		postProcesses.forEach((postProcess) => {
			if (!postProcess) {
				return;
			}

			cameras.forEach((camera) => postProcess.dispose(camera));
			postProcess.dispose();
		});

		this._linearDepthPostProcess = null;
		this._scatteringPostProcess = null;
		this._blurPostProcesses = [];
		this._composePostProcess = null;
	}

	/**
	 * Rebuilds the chain of post-processes. Changing the resolution of the scattering buffer or the number
	 * of blur passes changes the shape of the chain, which a post-process can't do in place.
	 */
	private _rebuildRenderEffects(): void {
		if (this._disposed) {
			return;
		}

		const manager = this._scene.postProcessRenderPipelineManager;
		const cameras = this._cameras.slice();

		try {
			manager.detachCamerasFromRenderPipeline(this.name, cameras);
			this._disposePostProcesses(cameras);

			Object.keys(this._renderEffects).forEach((key) => {
				delete this._renderEffects[key];
			});

			this._buildRenderEffects();
		} catch (e) {
			console.error("Failed to rebuild the volumetric lighting rendering pipeline.", e);
		} finally {
			// Always re-attach, even after a failure: leaving the cameras detached would make the pipeline
			// impossible to recover from, including for the disposal path.
			try {
				manager.attachCamerasToRenderPipeline(this.name, cameras);
			} catch (e) {
				console.error("Failed to re-attach the cameras to the volumetric lighting rendering pipeline.", e);
			}
		}

		this._lightsDirty = true;
	}

	/**
	 * Runs the selection pass and recompiles the shaders when, and only when, their defines changed. The
	 * identity, the number and the values of the point and spot lights change every frame and only cost a
	 * uniform update: only the directional lights and the kinds of the shadow maps shape the shader.
	 */
	private _updateSelection(): void {
		if (this._disposed || !this._scatteringPostProcess) {
			return;
		}

		++this._frameCount;

		const shouldSelect = this._lightsDirty || !this._selection || this._frameCount % this._configuration.selectionRefreshRate === 0;
		if (!shouldSelect) {
			return;
		}

		this._lightsDirty = false;

		const environment = this._getEnvironment();
		const selection = selectVolumetricLights(this._scene, this._camera, this._configuration, this._budget, this._selection);

		this._selection = selection;

		// Each pass is only recompiled when its own defines changed: recompiling a pass makes it skip its
		// draws until the new program is linked.
		const scatteringDefines = this._buildScatteringDefines(selection, environment);
		if (scatteringDefines !== this._scatteringDefines) {
			this._scatteringDefines = scatteringDefines;
			this._scatteringPostProcess.updateEffect(scatteringDefines);
		}

		const linearDepthDefines = this._buildLinearDepthDefines(environment);
		if (linearDepthDefines !== this._linearDepthDefines) {
			this._linearDepthDefines = linearDepthDefines;
			this._linearDepthPostProcess?.updateEffect(linearDepthDefines);
		}

		const blurDefines = this._buildBlurDefines(environment);
		if (blurDefines !== this._blurDefines) {
			this._blurDefines = blurDefines;
			this._blurPostProcesses.forEach((blurPostProcess) => blurPostProcess.updateEffect(blurDefines));
		}

		const composeDefines = this._buildComposeDefines(environment);
		if (composeDefines !== this._composeDefines) {
			this._composeDefines = composeDefines;
			this._composePostProcess?.updateEffect(composeDefines);
		}
	}

	/**
	 * Fills the four vectors describing a light in the raymarching shader. The packing follows what
	 * "Light.transferToEffect" writes for the surfaces of the scene so the shafts agree with them, except for
	 * the position of the point and spot lights, which is written relative to the camera: the raymarching
	 * works in that space, which keeps its precision whatever the distance of the scene to the origin.
	 */
	private _writeLight(candidate: IVolumetricLightCandidate, index: number, data: Float32Array, diffuse: Float32Array, direction: Float32Array, falloff: Float32Array): void {
		const { light, config } = candidate;
		const offset = index * 4;

		if (isDirectionalLight(light)) {
			getVolumetricLightWorldDirection(light, this._temporaryVector);

			// The shader expects the direction pointing to the light, not the one the light travels along.
			data[offset] = -this._temporaryVector.x;
			data[offset + 1] = -this._temporaryVector.y;
			data[offset + 2] = -this._temporaryVector.z;
			data[offset + 3] = 1;
		} else {
			getVolumetricLightWorldPosition(light, this._temporaryVector).subtractInPlace(this._camera.globalPosition);

			data[offset] = this._temporaryVector.x;
			data[offset + 1] = this._temporaryVector.y;
			data[offset + 2] = this._temporaryVector.z;
			data[offset + 3] = isSpotLight(light) ? 2 : 0;
		}

		if (config.useCustomColor) {
			this._temporaryColor.set(config.color[0], config.color[1], config.color[2]);
		} else {
			this._temporaryColor.copyFrom(light.diffuse);
		}

		const scale = light.getScaledIntensity() * config.volumeIntensity * 0.00001;

		diffuse[offset] = this._temporaryColor.r * scale;
		diffuse[offset + 1] = this._temporaryColor.g * scale;
		diffuse[offset + 2] = this._temporaryColor.b * scale;
		diffuse[offset + 3] = config.anisotropy;

		if (isSpotLight(light)) {
			getVolumetricLightWorldDirection(light, this._temporaryVector);

			direction[offset] = this._temporaryVector.x;
			direction[offset + 1] = this._temporaryVector.y;
			direction[offset + 2] = this._temporaryVector.z;
			direction[offset + 3] = Math.cos(light.angle * 0.5);

			falloff[offset + 1] = light.exponent;
		} else {
			direction[offset] = 0;
			direction[offset + 1] = 0;
			direction[offset + 2] = 1;
			direction[offset + 3] = -1;

			falloff[offset + 1] = 1;
		}

		falloff[offset] = getVolumetricLightRange(light, config, this._configuration);

		// Only read by the unshadowed tier, where it asks for the depth buffer occlusion. The shadowed tier
		// overwrites it with the frustum edge falloff of its generator, and uses its shadow map instead.
		falloff[offset + 2] = config.castVolumetricShadows ? 1 : 0;
		falloff[offset + 3] = config.shadowDarkness;
	}

	private _bindLinearDepth(effect: Effect): void {
		let depthTexture: Texture | null = null;

		switch (this._depthSource) {
			case VolumetricDepthSource.PrePass: {
				const prePassRenderer = getVolumetricPrePassRenderer(this._scene);
				depthTexture = prePassRenderer ? getVolumetricPrePassDepthTexture(prePassRenderer) : null;
				break;
			}

			case VolumetricDepthSource.GeometryBuffer: {
				const geometryBufferRenderer = getVolumetricGeometryBufferRenderer(this._scene);
				depthTexture = geometryBufferRenderer ? getVolumetricGeometryBufferDepthTexture(geometryBufferRenderer) : null;
				break;
			}

			default:
				depthTexture = this._depthRenderer?.getDepthMap() ?? null;
				break;
		}

		if (!depthTexture) {
			return;
		}

		effect.setTexture("depthSampler", depthTexture);
		this._bindDepthUniforms(effect);
	}

	private _bindScattering(effect: Effect): void {
		const scene = this._scene;
		const camera = this._camera;
		const configuration = this._configuration;
		const selection = this._selection;

		if (!selection) {
			return;
		}

		this._inverseViewProjection.copyFrom(scene.getTransformMatrix());
		this._inverseViewProjection.invert();

		effect.setMatrix("volInverseViewProjection", this._inverseViewProjection);
		effect.setVector3("volCameraPosition", camera.globalPosition);

		camera.getDirectionToRef(scene.useRightHandedSystem ? rightHandedForward : leftHandedForward, this._temporaryVector);
		effect.setVector3("volCameraForward", this._temporaryVector.normalize());

		effect.setFloat2("volCameraMinMaxZ", camera.minZ, camera.maxZ);
		effect.setFloat("volFrameIndex", scene.getRenderId() % 64);

		this._bindDepthRatio(effect);

		effect.setFloat4("volFogInfos", configuration.fogMode, configuration.fogStart, configuration.fogEnd, configuration.fogDensity);

		this._temporaryColor.set(configuration.fogColor[0], configuration.fogColor[1], configuration.fogColor[2]);
		effect.setColor3("volFogColor", this._temporaryColor);

		effect.setFloat("volLinearFogEps", Math.max((configuration.fogEnd - configuration.fogStart) * 0.02, 1e-4));

		effect.setFloat4("volMedium", configuration.albedo, configuration.heightFogBaseHeight, configuration.heightFogFalloff, 0);

		if (configuration.screenSpaceShadows) {
			effect.setMatrix("volViewProjection", scene.getTransformMatrix());
			effect.setFloat4("volScreenShadowParams", configuration.screenSpaceShadowMaxDistance, configuration.screenSpaceShadowBias, configuration.screenSpaceShadowThickness, 0);
		}

		this._temporaryColor.set(configuration.ambientColor[0], configuration.ambientColor[1], configuration.ambientColor[2]).scaleInPlace(configuration.ambientIntensity);
		effect.setColor3("volAmbient", this._temporaryColor);

		// The directional lights come first in the arrays, the shader walks the point and spot lights after them.
		const unshadowedCount = selection.unshadowed.length;
		const localCount = unshadowedCount - selection.directionalCount;

		effect.setFloat4("volParams", configuration.maxDistance, configuration.ditherStrength, configuration.lightExtinctionClamp, localCount);

		// Unshadowed lights.
		for (let i = 0; i < unshadowedCount; ++i) {
			this._writeLight(selection.unshadowed[i], i, this._lightData, this._lightDiffuse, this._lightDirection, this._lightFalloff);
		}

		if (unshadowedCount) {
			const count = unshadowedCount * 4;

			effect.setFloatArray4("volLightData", this._lightData.subarray(0, count));
			effect.setFloatArray4("volLightDiffuse", this._lightDiffuse.subarray(0, count));
			effect.setFloatArray4("volLightDirection", this._lightDirection.subarray(0, count));
			effect.setFloatArray4("volLightFalloff", this._lightFalloff.subarray(0, count));
		}

		// Shadowed lights.
		selection.shadowed.forEach((entry, index) => {
			this._writeLight(entry.candidate, index, this._shadowLightData, this._shadowLightDiffuse, this._shadowLightDirection, this._shadowLightFalloff);

			const { generator, kind, mode, mapSize } = entry.shadow;
			const light = entry.candidate.light as any;
			const offset = index * 4;

			this._shadowLightFalloff[offset + 2] = generator.frustumEdgeFalloff;

			const depthMinZ = light.getDepthMinZ?.(scene.activeCamera) ?? 0;
			const depthMaxZ = light.getDepthMaxZ?.(scene.activeCamera) ?? 1;

			this._shadowInfo[offset] = generator.getDarkness();
			this._shadowInfo[offset + 1] = kind === VolumetricShadowKind.Sampler2DShadow ? 1 / mapSize : mode === 0 ? 0 : generator.depthScale;
			this._shadowInfo[offset + 2] = depthMinZ;
			this._shadowInfo[offset + 3] = depthMinZ + depthMaxZ;

			generator.getTransformMatrix().copyToArray(this._shadowMatrices, index * 16);

			const shadowMap = generator.getShadowMapForRendering();
			if (kind === VolumetricShadowKind.Sampler2DShadow) {
				effect.setDepthStencilTexture(`volShadowSampler${index}`, shadowMap);
			} else {
				effect.setTexture(`volShadowSampler${index}`, shadowMap);
			}
		});

		if (selection.shadowed.length) {
			const count = selection.shadowed.length * 4;

			effect.setFloatArray4("volShadowLightData", this._shadowLightData.subarray(0, count));
			effect.setFloatArray4("volShadowLightDiffuse", this._shadowLightDiffuse.subarray(0, count));
			effect.setFloatArray4("volShadowLightDirection", this._shadowLightDirection.subarray(0, count));
			effect.setFloatArray4("volShadowLightFalloff", this._shadowLightFalloff.subarray(0, count));
			effect.setFloatArray4("volShadowInfo", this._shadowInfo.subarray(0, count));
			effect.setMatrices("volShadowMatrix", this._shadowMatrices.subarray(0, selection.shadowed.length * 16));
		}

		// Cascaded shadow map of the directional light, when there is one.
		if (selection.csm) {
			const { candidate, generator, cascades, kind } = selection.csm;
			const light = candidate.light as any;

			this._writeLight(candidate, 0, this._csmLightData, this._csmLightDiffuse, this._csmLightDirection, this._csmLightFalloff);

			effect.setFloat4("volCsmLightData", this._csmLightData[0], this._csmLightData[1], this._csmLightData[2], this._csmLightData[3]);
			effect.setFloat4("volCsmLightDiffuse", this._csmLightDiffuse[0], this._csmLightDiffuse[1], this._csmLightDiffuse[2], this._csmLightDiffuse[3]);
			effect.setFloat4("volCsmLightDirection", this._csmLightDirection[0], this._csmLightDirection[1], this._csmLightDirection[2], this._csmLightDirection[3]);
			effect.setFloat4("volCsmLightFalloff", this._csmLightFalloff[0], this._csmLightFalloff[1], generator.frustumEdgeFalloff, candidate.config.shadowDarkness);

			const depthMinZ = light.getDepthMinZ?.(scene.activeCamera) ?? 1;
			const depthMaxZ = light.getDepthMaxZ?.(scene.activeCamera) ?? 1;
			const mapSize = generator.getShadowMap()?.getSize().width ?? 1024;

			effect.setFloat4("volCsmInfo", generator.getDarkness(), 1 / mapSize, depthMinZ, depthMinZ + depthMaxZ);

			for (let i = 0; i < cascades; ++i) {
				generator.getCascadeTransformMatrix(i)?.copyToArray(this._csmMatrices, i * 16);
			}

			effect.setMatrices("volCsmMatrices", this._csmMatrices.subarray(0, cascades * 16));

			const shadowMap = generator.getShadowMapForRendering();
			if (kind === VolumetricShadowKind.Sampler2DShadow) {
				effect.setDepthStencilTexture("volCsmSampler", shadowMap);
			} else {
				effect.setTexture("volCsmSampler", shadowMap);
			}
		}
	}

	/**
	 * Binds the ratio between the resolution of the linear depth and the resolution of the scattering buffer.
	 * It is computed here rather than in the shaders so every pass rounds it exactly the same way, which is what
	 * makes them all associate each texel of the scattering buffer with the same texel of the linear depth.
	 */
	private _bindDepthRatio(effect: Effect): void {
		// The ratio of a post-process sizes its input texture: the raymarching pass reads the linear depth, and
		// the pass that follows it reads the scattering buffer. Both are activated by the time a pass applies.
		const depth = this._scatteringPostProcess;
		const scattering = this._blurPostProcesses[0] ?? this._composePostProcess;

		const depthWidth = depth && depth.width > 0 ? depth.width : 1;
		const depthHeight = depth && depth.height > 0 ? depth.height : 1;
		const scatteringWidth = scattering && scattering.width > 0 ? scattering.width : depthWidth;
		const scatteringHeight = scattering && scattering.height > 0 ? scattering.height : depthHeight;

		effect.setFloat2("volDepthRatio", depthWidth / scatteringWidth, depthHeight / scatteringHeight);
	}

	private _bindBlur(effect: Effect, index: number): void {
		if (!this._scatteringPostProcess) {
			return;
		}

		// The input of the raymarching pass is the linear depth.
		effect.setTextureFromPostProcess("volLinearDepthSampler", this._scatteringPostProcess);
		effect.setFloat2("volCameraMinMaxZ", this._camera.minZ, this._camera.maxZ);
		this._bindDepthRatio(effect);
		effect.setFloat2("volBlurDirection", index % 2 === 0 ? 1 : 0, index % 2 === 0 ? 0 : 1);
		effect.setFloat2("volBlurParams", Math.max(this._configuration.blurRadius * 0.5, 0.5), this._configuration.blurDepthThreshold);
	}

	private _bindCompose(effect: Effect): void {
		if (!this._linearDepthPostProcess || !this._scatteringPostProcess) {
			return;
		}

		const configuration = this._configuration;

		// The input texture of the first pass is the untouched, full resolution, color of the scene, and the
		// input texture of the raymarching pass is the linear depth of the scene.
		effect.setTextureFromPostProcess("volSceneSampler", this._linearDepthPostProcess);
		effect.setTextureFromPostProcess("volLinearDepthSampler", this._scatteringPostProcess);

		effect.setFloat2("volCameraMinMaxZ", this._camera.minZ, this._camera.maxZ);
		this._bindDepthRatio(effect);

		// The dithering of the output is only useful when the chain ends up in an 8 bits buffer.
		const outputDither = this._ldrEncode ? 1 / 255 : 0;

		effect.setFloat4("volComposeParams", configuration.intensity, configuration.extinctionAmount, configuration.upsampleDepthThreshold, outputDither);
	}
}
