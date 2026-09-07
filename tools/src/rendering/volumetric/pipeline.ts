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
import { PassPostProcess } from "@babylonjs/core/PostProcesses/passPostProcess";
import { PostProcessRenderEffect } from "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderEffect";
import { PostProcessRenderPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipeline";

import { isDirectionalLight, isSpotLight } from "../../tools/guards";

import {
	IVolumetricLightingConfiguration,
	VolumetricDitherMode,
	getDefaultVolumetricLightingConfiguration,
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
	computeVolumetricBudget,
	computeVolumetricShapeKey,
	selectVolumetricLights,
} from "./selector";

import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage";

import { registerVolumetricLightingShaders, volumetricLightingBlurShaderName, volumetricLightingComposeShaderName, volumetricLightingScatteringShaderName } from "./shaders";

const leftHandedForward = new Vector3(0, 0, 1);
const rightHandedForward = new Vector3(0, 0, -1);

/**
 * Defines the keys of the configuration that change the shape of the chain of post-processes and, as a
 * result, require the render effects of the pipeline to be rebuilt instead of simply rebound.
 */
const structuralConfigurationKeys: (keyof IVolumetricLightingConfiguration)[] = ["resolutionScale", "blurPasses"];

/**
 * Defines the list of every uniform the raymarching shader may declare. Listing a uniform that the compiled
 * program optimized away is safe, Babylon.js resolves it to a null location and the setters become no-ops.
 */
const scatteringUniforms = [
	"volInverseViewProjection",
	"volCameraPosition",
	"volCameraForward",
	"volCameraMinMaxZ",
	"volDepthUnpack",
	"volFrameIndex",
	"volFogInfos",
	"volFogColor",
	"volLinearFogEps",
	"volMedium",
	"volViewProjection",
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

const scatteringSamplers = ["depthSampler", "volCsmSampler"];
for (let i = 0; i < maxVolumetricShadowSlots; ++i) {
	scatteringSamplers.push(`volShadowSampler${i}`);
}

/**
 * Defines a rendering pipeline computing single-scattering volumetric lighting: the light shafts are
 * raymarched through a participating medium the pipeline describes on its own, and are occluded either by
 * the shadow map a light already renders or, when it has none, by the depth buffer of the scene.
 *
 * Every light of the scene can take part in the effect, including the lights that live inside a clustered
 * light container, and each one is configured individually through "light.metadata.volumetricLighting".
 *
 * The pipeline is composed of four passes:
 * - a pass keeping an untouched copy of the color of the scene,
 * - the raymarching pass, rendered at a fraction of the resolution of the canvas,
 * - a separable depth aware blur denoising the result of the raymarching,
 * - a composition pass upsampling the result and adding it to the color of the scene.
 */
export class VolumetricLightingRenderingPipeline extends PostProcessRenderPipeline {
	/**
	 * Defines the name of the render effect keeping a copy of the color of the scene.
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
	 * The raymarching shader relies on shadow samplers and texture arrays, which need WebGL 2, and ships as
	 * both GLSL and hand written WGSL so WebGPU is supported without an external transpiler.
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

	private _depthRenderer: DepthRenderer | null = null;
	private _ownsDepthRenderer: boolean = false;
	private _depthMode: 0 | 1 | 2 = 0;

	private _sceneColorPostProcess: PassPostProcess | null = null;
	private _scatteringPostProcess: PostProcess | null = null;
	private _blurPostProcesses: PostProcess[] = [];
	private _composePostProcess: PostProcess | null = null;

	private _selection: IVolumetricLightSelection | null = null;
	private _budget: IVolumetricBudget;
	private _shapeKey: string = "";
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

		this._budget = computeVolumetricBudget(engine, this._configuration);

		this._setupDepthRenderer();
		this._buildRenderEffects();

		scene.postProcessRenderPipelineManager.addPipeline(this);
		scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline(this.name, camera);

		this._beforeCameraRenderObserver = scene.onBeforeCameraRenderObservable.add((renderedCamera) => {
			if (renderedCamera === this._camera) {
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

		if (this._ownsDepthRenderer) {
			this._scene.disableDepthRenderer(this._camera);
		}

		this._depthRenderer = null;
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
	 * Adopts the depth renderer of the camera when one already exists (the SSAO and SSR pipelines create
	 * one) instead of paying for a second full depth pass, and detects the format it stores so the shader
	 * can be compiled for it.
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
		return {
			depthMode: this._depthMode,
			ldrEncode: this._ldrEncode,
			reverseDepth: this._scene.getEngine().useReverseDepthBuffer,
			ndcHalfZ: this._scene.getEngine().isNDCHalfZRange,
			fogMode: this._configuration.fogMode,
			// The medium of the pipeline has a closed form transmittance, so it can always be evaluated
			// analytically unless the height falloff makes the density vary along the ray.
			analyticTransmittance: !this._configuration.heightFogEnabled,
		};
	}

	private _buildDepthDefines(environment: IVolumetricShaderEnvironment): string {
		let defines = "";

		if (environment.depthMode === 2) {
			defines += "#define VOL_DEPTH_PACKED\n";
		} else if (environment.depthMode === 1) {
			defines += "#define VOL_DEPTH_VIEWZ\n";
		}

		return defines;
	}

	private _buildScatteringDefines(selection: IVolumetricLightSelection, environment: IVolumetricShaderEnvironment): string {
		const configuration = this._configuration;

		let defines = this._buildDepthDefines(environment);

		defines += `#define VOL_STEPS ${configuration.steps}\n`;
		defines += `#define VOL_DISTRIBUTION ${configuration.stepDistribution}\n`;
		defines += `#define VOL_DITHER ${configuration.ditherMode}\n`;
		defines += `#define VOL_PCF_TAPS ${configuration.pcfTaps}\n`;
		defines += `#define VOL_FOG_MODE ${environment.fogMode}\n`;
		defines += `#define VOL_DEBUG ${configuration.debugMode}\n`;
		defines += `#define VOL_ARRAY_LIGHT_COUNT ${selection.unshadowed.length}\n`;
		defines += `#define VOL_SHADOW_SLOT_COUNT ${selection.shadowed.length}\n`;

		if (configuration.ditherMode !== VolumetricDitherMode.None && configuration.temporalJitter) {
			defines += "#define VOL_TEMPORAL_JITTER\n";
		}

		if (configuration.heightFogEnabled) {
			defines += "#define VOL_HEIGHT_FOG\n";
		}

		if (environment.analyticTransmittance) {
			defines += "#define VOL_ANALYTIC_TRANSMITTANCE\n";
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

		selection.shadowed.forEach((entry, index) => {
			defines += `#define VOL_SHADOW_KIND${index} ${entry.shadow.kind}\n`;
			defines += `#define VOL_SHADOW_MODE${index} ${entry.shadow.mode}\n`;

			if (entry.shadow.packed) {
				defines += `#define VOL_SHADOW_PACKED${index}\n`;
			}
		});

		defines += `#define VOL_CSM_LIGHT_COUNT ${selection.csm ? 1 : 0}\n`;

		if (selection.csm) {
			defines += "#define VOL_CSM\n";
			defines += `#define VOL_CSM_CASCADES ${selection.csm.cascades}\n`;
			defines += `#define VOL_CSM_KIND ${selection.csm.kind === VolumetricShadowKind.Sampler2DShadow ? 1 : 0}\n`;

			if (selection.csm.packed) {
				defines += "#define VOL_CSM_PACKED\n";
			}
		}

		return defines;
	}

	private _buildBlurDefines(environment: IVolumetricShaderEnvironment): string {
		return `${this._buildDepthDefines(environment)}#define VOL_BLUR_RADIUS ${this._configuration.blurRadius}\n`;
	}

	private _buildComposeDefines(environment: IVolumetricShaderEnvironment): string {
		let defines = this._buildDepthDefines(environment);

		defines += `#define VOL_DEBUG ${this._configuration.debugMode}\n`;

		if (environment.ldrEncode) {
			defines += "#define VOL_LDR_ENCODE\n";
		}

		return defines;
	}

	private _buildRenderEffects(): void {
		const scene = this._scene;
		const engine = scene.getEngine();
		const configuration = this._configuration;
		const environment = this._getEnvironment();

		const emptySelection: IVolumetricLightSelection = {
			shadowed: [],
			unshadowed: [],
			csm: null,
			stats: { candidateCount: 0, culledCount: 0, shadowedCount: 0, unshadowedCount: 0, droppedCount: 0, perLight: new Map() },
		};

		this._shapeKey = computeVolumetricShapeKey(emptySelection, configuration, environment);
		this._blurDefines = this._buildBlurDefines(environment);
		this._composeDefines = this._buildComposeDefines(environment);

		// Keeps a copy of the color of the scene so the composition pass can add the shafts on top of an
		// image the previous passes of this pipeline didn't touch.
		this._sceneColorPostProcess = new PassPostProcess("VolumetricLightingSceneColor", 1.0, null, Texture.BILINEAR_SAMPLINGMODE, engine, false, this._textureType);

		this._scatteringPostProcess = new PostProcess(
			"VolumetricLightingScattering",
			volumetricLightingScatteringShaderName,
			scatteringUniforms,
			scatteringSamplers,
			configuration.resolutionScale,
			null,
			Texture.BILINEAR_SAMPLINGMODE,
			engine,
			false,
			this._buildScatteringDefines(emptySelection, environment),
			this._textureType,
			undefined,
			undefined,
			false,
			undefined,
			this._shaderLanguage
		);
		this._scatteringPostProcess.autoClear = false;
		this._scatteringPostProcess.alphaMode = Constants.ALPHA_DISABLE;
		this._scatteringPostProcess.onApplyObservable.add((effect) => this._bindScattering(effect));

		this._blurPostProcesses = [];
		for (let i = 0; i < configuration.blurPasses; ++i) {
			const blurPostProcess = new PostProcess(
				`VolumetricLightingBlur${i}`,
				volumetricLightingBlurShaderName,
				["volCameraMinMaxZ", "volDepthUnpack", "volBlurDirection", "volBlurParams"],
				["depthSampler"],
				configuration.resolutionScale,
				null,
				Texture.BILINEAR_SAMPLINGMODE,
				engine,
				false,
				this._blurDefines,
				this._textureType,
				undefined,
				undefined,
				false,
				undefined,
				this._shaderLanguage
			);

			blurPostProcess.autoClear = false;
			blurPostProcess.alphaMode = Constants.ALPHA_DISABLE;
			blurPostProcess.onApplyObservable.add((effect) => this._bindBlur(effect, blurPostProcess, i));

			this._blurPostProcesses.push(blurPostProcess);
		}

		// The ratio of a post-process sizes the texture it READS, which is also the texture the previous
		// pass renders into. Keeping it at "resolutionScale" is what makes the pass before it rasterize at
		// the reduced resolution; the composition itself still draws at the size of whatever follows it.
		this._composePostProcess = new PostProcess(
			"VolumetricLightingCompose",
			volumetricLightingComposeShaderName,
			["volCameraMinMaxZ", "volDepthUnpack", "volScatterTexelSize", "volComposeParams"],
			["depthSampler", "volSceneSampler"],
			configuration.resolutionScale,
			null,
			Texture.BILINEAR_SAMPLINGMODE,
			engine,
			false,
			this._composeDefines,
			this._textureType,
			undefined,
			undefined,
			false,
			undefined,
			this._shaderLanguage
		);
		this._composePostProcess.autoClear = false;
		this._composePostProcess.alphaMode = Constants.ALPHA_DISABLE;
		this._composePostProcess.onApplyObservable.add((effect) => this._bindCompose(effect));

		this.addEffect(new PostProcessRenderEffect(engine, VolumetricLightingRenderingPipeline.SceneColorEffectName, () => this._sceneColorPostProcess, true));
		this.addEffect(new PostProcessRenderEffect(engine, VolumetricLightingRenderingPipeline.ScatteringEffectName, () => this._scatteringPostProcess, true));

		if (this._blurPostProcesses.length) {
			this.addEffect(new PostProcessRenderEffect(engine, VolumetricLightingRenderingPipeline.BlurEffectName, () => this._blurPostProcesses, true));
		}

		this.addEffect(new PostProcessRenderEffect(engine, VolumetricLightingRenderingPipeline.ComposeEffectName, () => this._composePostProcess, true));
	}

	private _disposePostProcesses(cameras: Camera[]): void {
		const postProcesses: (PostProcess | null)[] = [this._sceneColorPostProcess, this._scatteringPostProcess, ...this._blurPostProcesses, this._composePostProcess];

		postProcesses.forEach((postProcess) => {
			if (!postProcess) {
				return;
			}

			cameras.forEach((camera) => postProcess.dispose(camera));
			postProcess.dispose();
		});

		this._sceneColorPostProcess = null;
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
	 * Runs the selection pass and recompiles the raymarching shader when, and only when, the shape of the
	 * work it has to do changed. The identity and the values of the lights change every frame and only
	 * cost a uniform update.
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

		const shapeKey = computeVolumetricShapeKey(selection, this._configuration, environment);
		if (shapeKey === this._shapeKey) {
			return;
		}

		this._shapeKey = shapeKey;

		this._scatteringPostProcess.updateEffect(this._buildScatteringDefines(selection, environment));

		// Only recompile the two other passes when their own defines changed: they don't depend on which
		// lights are selected, and recompiling them makes the frame blank until the program is linked.
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

	private _getLightWorldPosition(light: Light, result: Vector3): Vector3 {
		const anyLight = light as any;

		if (anyLight.computeTransformedInformation?.() && anyLight.transformedPosition) {
			result.copyFrom(anyLight.transformedPosition);
		} else if (anyLight.position) {
			result.copyFrom(anyLight.position);
		} else {
			result.copyFromFloats(0, 0, 0);
		}

		return result;
	}

	private _getLightWorldDirection(light: Light, result: Vector3): Vector3 {
		const anyLight = light as any;

		if (anyLight.computeTransformedInformation?.() && anyLight.transformedDirection) {
			result.copyFrom(anyLight.transformedDirection);
		} else if (anyLight.direction) {
			result.copyFrom(anyLight.direction);
		} else {
			result.copyFromFloats(0, 0, 1);
		}

		return result.normalize();
	}

	/**
	 * Fills the four vectors describing a light in the raymarching shader. The packing follows what
	 * "Light.transferToEffect" writes for the surfaces of the scene so the shafts agree with them.
	 */
	private _writeLight(candidate: IVolumetricLightCandidate, index: number, data: Float32Array, diffuse: Float32Array, direction: Float32Array, falloff: Float32Array): void {
		const { light, config } = candidate;
		const offset = index * 4;

		if (isDirectionalLight(light)) {
			this._getLightWorldDirection(light, this._temporaryVector);

			// The shader expects the direction pointing to the light, not the one the light travels along.
			data[offset] = -this._temporaryVector.x;
			data[offset + 1] = -this._temporaryVector.y;
			data[offset + 2] = -this._temporaryVector.z;
			data[offset + 3] = 1;
		} else {
			this._getLightWorldPosition(light, this._temporaryVector);

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
			this._getLightWorldDirection(light, this._temporaryVector);

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

		// "Light.range" defaults to Number.MAX_VALUE, which passes isFinite but becomes Infinity once stored
		// in a Float32Array. Anything past the reach of the march is equivalent to no attenuation at all.
		const range = light.range > 0 && light.range < Number.MAX_VALUE ? light.range : this._configuration.maxDistance;

		falloff[offset] = Math.max(1e-3, Math.min(range * config.rangeMultiplier, 3.4e38));

		// Only read by the unshadowed tier, where it asks for the depth buffer occlusion. The shadowed tier
		// overwrites it with the frustum edge falloff of its generator, and uses its shadow map instead.
		falloff[offset + 2] = config.castVolumetricShadows ? 1 : 0;
		falloff[offset + 3] = config.shadowDarkness;
	}

	private _bindScattering(effect: Effect): void {
		const scene = this._scene;
		const camera = this._camera;
		const configuration = this._configuration;
		const selection = this._selection;

		if (!selection || !this._depthRenderer) {
			return;
		}

		this._inverseViewProjection.copyFrom(scene.getTransformMatrix());
		this._inverseViewProjection.invert();

		effect.setMatrix("volInverseViewProjection", this._inverseViewProjection);
		effect.setVector3("volCameraPosition", camera.globalPosition);

		camera.getDirectionToRef(scene.useRightHandedSystem ? rightHandedForward : leftHandedForward, this._temporaryVector);
		effect.setVector3("volCameraForward", this._temporaryVector.normalize());

		this._bindDepthUniforms(effect);
		effect.setFloat("volFrameIndex", scene.getRenderId() % 64);

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

		effect.setFloat4("volParams", configuration.maxDistance, configuration.ditherStrength, configuration.lightExtinctionClamp, 0);

		effect.setTexture("depthSampler", this._depthRenderer.getDepthMap());

		// Unshadowed lights.
		selection.unshadowed.forEach((candidate, index) => {
			this._writeLight(candidate, index, this._lightData, this._lightDiffuse, this._lightDirection, this._lightFalloff);
		});

		if (selection.unshadowed.length) {
			const count = selection.unshadowed.length * 4;

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

	private _bindBlur(effect: Effect, postProcess: PostProcess, index: number): void {
		if (!this._depthRenderer) {
			return;
		}

		const texelSize = postProcess.texelSize;

		effect.setTexture("depthSampler", this._depthRenderer.getDepthMap());
		this._bindDepthUniforms(effect);
		effect.setFloat2("volBlurDirection", index % 2 === 0 ? texelSize.x : 0, index % 2 === 0 ? 0 : texelSize.y);
		effect.setFloat2("volBlurParams", Math.max(this._configuration.blurRadius * 0.5, 0.5), this._configuration.blurDepthThreshold);
	}

	private _bindCompose(effect: Effect): void {
		if (!this._depthRenderer || !this._sceneColorPostProcess) {
			return;
		}

		const configuration = this._configuration;

		effect.setTexture("depthSampler", this._depthRenderer.getDepthMap());
		// The snapshot renders into the texture of the NEXT pass, which is sized by "resolutionScale", so
		// its output is a downsampled copy. Its own input texture is the untouched full resolution one.
		effect.setTextureFromPostProcess("volSceneSampler", this._sceneColorPostProcess);

		this._bindDepthUniforms(effect);

		const texelSize = this._composePostProcess?.texelSize;
		effect.setFloat2("volScatterTexelSize", texelSize?.x ?? 1, texelSize?.y ?? 1);

		// The dithering of the output is only useful when the chain ends up in an 8 bits buffer.
		const outputDither = this._ldrEncode ? 1 / 255 : 0;

		effect.setFloat4("volComposeParams", configuration.intensity, configuration.extinctionAmount, configuration.upsampleDepthThreshold, outputDither);
	}
}
