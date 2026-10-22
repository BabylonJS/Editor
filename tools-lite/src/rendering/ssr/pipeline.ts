import { Camera, EngineContext, SceneContext } from "@babylonjs/lite";

import "../post-process/includes";
import { _registerPostProcessPipeline, _unregisterPostProcessPipeline } from "../pipeline";
import { IPostProcessBeforeRenderContext, IPostProcessContext, IPostProcessPipeline } from "../post-process/context";
import { IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";
import { _getBabylonProjectionMatrix, _getBabylonViewMatrix, _getCameraAspectRatio, _invertMatrix, _matrixFromValues, _multiplyMatrices } from "../post-process/matrix";

import { screenSpaceReflection2BlurCombinerFragmentWGSL, screenSpaceReflection2BlurFragmentWGSL, screenSpaceReflection2FragmentWGSL } from "./shaders";

/**
 * Same as the "TrsWebGPU" matrix of Babylon.js `ThinSSRPostProcess`: `Matrix.Compose((0.5, 0.5, 1), identity, (0.5, 0.5, 0))`.
 */
const trsWebGPU = _matrixFromValues(0.5, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 1, 0, 0.5, 0.5, 0, 1);

/**
 * Defines the environment texture the SSR uses when a ray misses (see `SSRRenderingPipeline.environmentTexture`): a cube
 * texture of Babylon Lite.
 */
export interface ISSREnvironmentTexture {
	/**
	 * Defines the view of the cube texture.
	 */
	readonly view: GPUTextureView;
	readonly width: number;
	readonly height: number;
	readonly format: GPUTextureFormat;
	/**
	 * Defines wether or not the texture stores colors in gamma space.
	 */
	readonly gammaSpace?: boolean;
	/**
	 * Defines the size of the bounding box of the texture, for the local cube maps.
	 */
	readonly boundingBoxSize?: { x: number; y: number; z: number } | null;
	/**
	 * Defines the position of the bounding box of the texture, for the local cube maps.
	 */
	readonly boundingBoxPosition?: { x: number; y: number; z: number };
}

/**
 * Render pipeline to produce Screen Space Reflections (SSR) effect, same as Babylon.js `SSRRenderingPipeline`: the
 * reflections are ray marched in screen space using the depth, the normals and the reflectivity of the scene (rendered
 * as the pre-pass renderer of Babylon.js renders them), blurred according to the roughness, then combined with the color
 * of the scene. The effect is rendered by the frame graph tasks of the tools (the scene must be created using
 * `createEditorSceneContext`), with the same shaders as Babylon.js.
 */
export class SSRRenderingPipeline implements IPostProcessPipeline {
	/**
	 * The SSR PostProcess effect id in the pipeline
	 */
	public readonly SSRRenderEffect: string = "SSRRenderEffect";
	/**
	 * The blur PostProcess effect id in the pipeline
	 */
	public readonly SSRBlurRenderEffect: string = "SSRBlurRenderEffect";
	/**
	 * The PostProcess effect id in the pipeline that combines the SSR-Blur output with the original scene color
	 */
	public readonly SSRCombineRenderEffect: string = "SSRCombineRenderEffect";

	/**
	 * Defines the name of the pipeline.
	 */
	public readonly name: string;

	/**
	 * Gets or sets the maxDistance used to define how far we look for reflection during the ray-marching on the reflected ray (default: 1000).
	 */
	public maxDistance: number = 1000.0;
	/**
	 * Gets or sets the step size used to iterate until the effect finds the color of the reflection's pixel (default: 1).
	 */
	public step: number = 1.0;
	/**
	 * Gets or sets the thickness value used as tolerance when computing the intersection between the reflected ray and the scene (default: 0.5).
	 */
	public thickness: number = 0.5;
	/**
	 * Gets or sets the current reflection strength (default: 1).
	 */
	public strength: number = 1;
	/**
	 * Gets or sets the falloff exponent used to compute the reflection strength (default: 1).
	 */
	public reflectionSpecularFalloffExponent: number = 1;
	/**
	 * Maximum number of steps during the ray marching process after which we consider an intersection could not be found (default: 1000).
	 */
	public maxSteps: number = 1000.0;
	/**
	 * Gets or sets the factor applied when computing roughness. Default value is 0.2.
	 */
	public roughnessFactor: number = 0.2;
	/**
	 * Number of steps to skip at start when marching the ray to avoid self collisions (default: 1)
	 */
	public selfCollisionNumSkip: number = 1;
	/**
	 * Gets or sets the downsample factor used to reduce the size of the texture used to compute the SSR contribution (default: 0).
	 */
	public ssrDownsample: number = 0;
	/**
	 * Gets or sets the downsample factor used to reduce the size of the textures used to blur the reflection effect (default: 0).
	 */
	public blurDownsample: number = 0;
	/**
	 * Gets or sets the downsample factor (default: 0) used to create the backface depth texture.
	 */
	public backfaceDepthTextureDownsample: number = 0;
	/**
	 * Gets or sets a boolean indicating if the transparent meshes write the backface depth (default: true).
	 */
	public backfaceForceDepthWriteTransparentMeshes: boolean = true;
	/**
	 * Gets or sets a boolean defining if the environment texture is a standard cubemap (false) or a probe (true). Default value is false.
	 */
	public environmentTextureIsProbe: boolean = false;
	/**
	 * Gets or sets the environment cube texture used to define the reflection when the reflected rays of SSR leave the view space or when the maxDistance/maxSteps is reached.
	 */
	public environmentTexture: ISSREnvironmentTexture | null = null;
	/**
	 * Gets or sets a boolean indicating if the reflections should be smooth when the step size is greater than 1 (default: false).
	 */
	public enableSmoothReflections: boolean = false;
	/**
	 * Gets or sets a boolean indicating if the reflections should be attenuated at the screen borders (default: true).
	 */
	public attenuateScreenBorders: boolean = true;
	/**
	 * Gets or sets a boolean indicating if the reflections should be attenuated according to the distance of the intersection (default: true).
	 */
	public attenuateIntersectionDistance: boolean = true;
	/**
	 * Gets or sets a boolean indicating if the reflections should be attenuated according to the number of iterations performed to find the intersection (default: true).
	 */
	public attenuateIntersectionIterations: boolean = true;
	/**
	 * Gets or sets a boolean indicating if the reflections should be attenuated when the reflection ray is facing the camera (the view direction) (default: false).
	 */
	public attenuateFacingCamera: boolean = false;
	/**
	 * Gets or sets a boolean indicating if the backface reflections should be attenuated (default: false).
	 */
	public attenuateBackfaceReflection: boolean = false;
	/**
	 * Gets or sets a boolean indicating if the ray should be clipped to the frustum (default: true).
	 */
	public clipToFrustum: boolean = true;
	/**
	 * Gets or sets a boolean indicating whether the blending between the current color pixel and the reflection color should be done with a Fresnel coefficient (default: false).
	 */
	public useFresnel: boolean = false;
	/**
	 * Gets or sets a boolean defining if geometry thickness should be computed automatically (default: false).
	 */
	public enableAutomaticThicknessComputation: boolean = false;
	/**
	 * Gets or sets a boolean defining if the input color texture is in gamma space (default: true).
	 */
	public inputTextureColorIsInGammaSpace: boolean = true;
	/**
	 * Gets or sets a boolean defining if the output color texture generated by the SSR pipeline should be in gamma space (default: true).
	 */
	public generateOutputInGammaSpace: boolean = true;
	/**
	 * Gets or sets a boolean indicating if the effect should be rendered in debug mode (default: false).
	 */
	public debug: boolean = false;
	/**
	 * Gets or sets a boolean indicating whether the normals are in world space (false by default, the normals of the
	 * pre-pass renderer are in camera space).
	 */
	public normalsAreInWorldSpace: boolean = false;
	/**
	 * Gets or sets a boolean indicating whether the normals are encoded as unsigned, that is normalUnsigned = normal*0.5+0.5 (default: false).
	 */
	public normalsAreUnsigned: boolean = false;
	/**
	 * Gets or sets the reflectivity threshold used to determine if a pixel should be reflective (default: 0.04).
	 */
	public reflectivityThreshold: number = 0.04;
	/**
	 * Gets or sets the blur dispersion strength. Set this value to 0 to disable blurring (default: 0.03).
	 */
	public blurDispersionStrength: number = 0.03;

	private _scene: SceneContext;
	private _engine: EngineContext;
	private _cameras: Camera[];
	private _camerasToBeAttached: Camera[];
	private _samples: number = 1;
	private _isEnabled: boolean = true;
	private _isDisposed: boolean = false;
	private _useScreenspaceDepth: boolean;

	private _ssrPasses: Map<string, PostProcessPass> = new Map();
	private _blurXPass: PostProcessPass | null = null;
	private _blurYPass: PostProcessPass | null = null;
	private _combinerPasses: Map<string, PostProcessPass> = new Map();

	/**
	 * Constructor.
	 * @param name The rendering pipeline name
	 * @param scene The scene linked to this pipeline
	 * @param cameras The array of cameras that the rendering pipeline will be attached to (default: the active camera of the scene)
	 * @param forceGeometryBuffer Kept for compatibility: the geometry textures are rendered as the pre-pass renderer of Babylon.js renders them
	 * @param textureType Kept for compatibility: the textures of the post-processes are half floats
	 * @param useScreenspaceDepth Indicates if the depth buffer should be linear or screenspace (default: false).
	 */
	public constructor(name: string, scene: SceneContext, cameras?: Camera[], forceGeometryBuffer: boolean = false, textureType: number = 0, useScreenspaceDepth: boolean = false) {
		void forceGeometryBuffer;
		void textureType;

		this.name = name;

		this._scene = scene;
		this._engine = scene.surface.engine;
		this._cameras = (cameras ?? (scene.camera ? [scene.camera] : [])).slice();
		this._camerasToBeAttached = this._cameras.slice();
		this._useScreenspaceDepth = useScreenspaceDepth;

		_registerPostProcessPipeline(scene, this);
	}

	/**
	 * Gets the scene the pipeline belongs to.
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
	 * MSAA sample count, setting this to 4 will provide 4x anti aliasing. (default: 1)
	 */
	public get samples(): number {
		return this._samples;
	}

	public set samples(sampleCount: number) {
		this._samples = sampleCount;
	}

	/**
	 * Gets or sets a boolean indicating if the effect is enabled (default: true).
	 */
	public get isEnabled(): boolean {
		return this._isEnabled;
	}

	public set isEnabled(value: boolean) {
		this._isEnabled = value;
	}

	/**
	 * Gets a boolean indicating if the depth buffer is in screen space (only the linear depth is supported).
	 */
	public get useScreenspaceDepth(): boolean {
		return this._useScreenspaceDepth;
	}

	/**
	 * Gets a boolean indicating if the SSR is supported: always true, the geometry textures are rendered by the tools.
	 */
	public get isSSRSupported(): boolean {
		return true;
	}

	/**
	 * Get the class name
	 * @returns "SSRRenderingPipeline"
	 */
	public getClassName(): string {
		return "SSRRenderingPipeline";
	}

	/**
	 * Adds a camera to the pipeline
	 * @param camera the camera to be added
	 */
	public addCamera(camera: Camera): void {
		this._camerasToBeAttached.push(camera);
		this._cameras = this._camerasToBeAttached.slice();
	}

	/**
	 * Removes a camera from the pipeline
	 * @param camera the camera to remove
	 */
	public removeCamera(camera: Camera): void {
		const index = this._camerasToBeAttached.indexOf(camera);
		this._camerasToBeAttached.splice(index, 1);
		this._cameras = this._camerasToBeAttached.slice();
	}

	/**
	 * Removes the internal pipeline assets and detaches the pipeline from the scene cameras
	 */
	public dispose(): void {
		this._isDisposed = true;

		this._ssrPasses.forEach((pass) => pass.dispose());
		this._combinerPasses.forEach((pass) => pass.dispose());
		this._blurXPass?.dispose();
		this._blurYPass?.dispose();

		this._ssrPasses.clear();
		this._combinerPasses.clear();
		this._blurXPass = null;
		this._blurYPass = null;

		_unregisterPostProcessPipeline(this._scene, this);
	}

	/**
	 * @internal
	 */
	public isActiveForCamera(camera: Camera): boolean {
		return !this._isDisposed && this._isEnabled && this._cameras.includes(camera);
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
		context.requestGeometry({
			viewDepth: !this._useScreenspaceDepth,
			screenDepth: this._useScreenspaceDepth,
			viewNormal: true,
			reflectivity: true,
			backDepth: this.enableAutomaticThicknessComputation,
			backDepthDownsample: this.backfaceDepthTextureDownsample,
			backDepthNonLinear: this._useScreenspaceDepth,
			backDepthTransparent: this.backfaceForceDepthWriteTransparentMeshes,
		});
	}

	/**
	 * @internal
	 * Renders the SSR the same way Babylon.js does: SSR, then (when the blur is enabled) horizontal blur, vertical blur and
	 * combination with the color of the scene.
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget | null): IPostProcessTexture {
		const geometry = context.geometry;
		const depth = this._useScreenspaceDepth ? geometry.screenDepth : geometry.viewDepth;
		const normal = geometry.viewNormal;
		const reflectivity = geometry.reflectivity;
		if (!depth || !normal || !reflectivity) {
			return input;
		}

		const pool = context.pool;
		const format = context.textureFormat;
		const camera = context.camera;
		const useBlur = this.blurDispersionStrength > 0;

		const projection = _getBabylonProjectionMatrix(camera, _getCameraAspectRatio(camera, context.width, context.height));
		const view = _getBabylonViewMatrix(camera);

		// SSR
		const ssrPass = this._getSSRPass(useBlur);
		const uniforms = ssrPass.uniforms;

		uniforms.setArray("projection", projection);
		uniforms.setArray("view", view);
		uniforms.setArray("invView", _invertMatrix(view));
		uniforms.setArray("invProjectionMatrix", _invertMatrix(projection));
		uniforms.set("thickness", this.thickness);
		uniforms.set("reflectionSpecularFalloffExponent", this.reflectionSpecularFalloffExponent);
		uniforms.set("strength", this.strength);
		uniforms.set("stepSize", this.step);
		uniforms.set("maxSteps", this.maxSteps);
		uniforms.set("roughnessFactor", this.roughnessFactor);
		uniforms.set("nearPlaneZ", camera.nearPlane);
		uniforms.set("farPlaneZ", camera.farPlane);
		uniforms.set("maxDistance", this.maxDistance);
		uniforms.set("selfCollisionNumSkip", this.selfCollisionNumSkip);
		uniforms.set("reflectivityThreshold", this.reflectivityThreshold);

		// Same as Babylon.js: the size of the texture is the size of the input of the SSR.
		const scaling = _matrixFromValues(input.width, 0, 0, 0, 0, input.height, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
		uniforms.setArray("projectionPixel", _multiplyMatrices(_multiplyMatrices(projection, trsWebGPU), scaling));

		ssrPass.setTexture("textureSampler", input);
		ssrPass.setTexture("reflectivitySampler", reflectivity);
		ssrPass.setTexture("normalSampler", normal);
		ssrPass.setTexture("depthSampler", depth);

		if (this.enableAutomaticThicknessComputation && geometry.backDepth) {
			ssrPass.setTexture("backDepthSampler", geometry.backDepth);
			uniforms.set("backSizeFactor", this.backfaceDepthTextureDownsample + 1);
		}

		const environment = this.environmentTexture;
		if (environment) {
			ssrPass.setTexture("envCubeSampler", environment, "trilinear");
			if (environment.boundingBoxSize) {
				const position = environment.boundingBoxPosition ?? { x: 0, y: 0, z: 0 };
				uniforms.set("vReflectionPosition", position.x, position.y, position.z);
				uniforms.set("vReflectionSize", environment.boundingBoxSize.x, environment.boundingBoxSize.y, environment.boundingBoxSize.z);
			}
		}

		if (!useBlur) {
			const output = target ?? pool.acquire(context.width, context.height, format);
			ssrPass.draw(output);
			return output;
		}

		// The SSR renders into the input of the horizontal blur.
		const ssrWidth = Math.floor(context.width / (this.ssrDownsample + 1));
		const ssrHeight = Math.floor(context.height / (this.ssrDownsample + 1));
		const blurWidth = Math.floor(context.width / (this.blurDownsample + 1));
		const blurHeight = Math.floor(context.height / (this.blurDownsample + 1));

		const ssr = pool.acquire(ssrWidth, ssrHeight, format);
		ssrPass.draw(ssr);

		// Blur
		this._blurXPass ??= new PostProcessPass(this._engine, { name: "SSRblurX", fragment: screenSpaceReflection2BlurFragmentWGSL });
		this._blurXPass.uniforms.set("texelOffsetScale", (1 / ssr.width) * this.blurDispersionStrength, 0);
		this._blurXPass.setTexture("textureSampler", ssr);

		const blurredX = pool.acquire(blurWidth, blurHeight, format);
		this._blurXPass.draw(blurredX);
		pool.release(ssr);

		this._blurYPass ??= new PostProcessPass(this._engine, { name: "SSRblurY", fragment: screenSpaceReflection2BlurFragmentWGSL });
		this._blurYPass.uniforms.set("texelOffsetScale", 0, (1 / blurredX.height) * this.blurDispersionStrength);
		this._blurYPass.setTexture("textureSampler", blurredX);

		const blurredY = pool.acquire(blurWidth, blurHeight, format);
		this._blurYPass.draw(blurredY);
		pool.release(blurredX);

		// Combine
		const combiner = this._getCombinerPass();
		combiner.uniforms.set("strength", this.strength);
		combiner.uniforms.set("reflectionSpecularFalloffExponent", this.reflectionSpecularFalloffExponent);
		combiner.uniforms.set("reflectivityThreshold", this.reflectivityThreshold);

		if (this.useFresnel) {
			combiner.uniforms.setArray("projection", projection);
			combiner.uniforms.setArray("invProjectionMatrix", _invertMatrix(projection));
			combiner.uniforms.setArray("view", view);

			if (this._useScreenspaceDepth) {
				combiner.uniforms.set("nearPlaneZ", camera.nearPlane);
				combiner.uniforms.set("farPlaneZ", camera.farPlane);
			}

			combiner.setTexture("normalSampler", normal);
			combiner.setTexture("depthSampler", depth);
		}

		// Same as Babylon.js: the blurred reflections are sampled without filtering.
		combiner.setTexture("textureSampler", blurredY, "nearest");
		combiner.setTexture("mainSampler", input);
		combiner.setTexture("reflectivitySampler", reflectivity);

		const output = target ?? pool.acquire(context.width, context.height, format);
		combiner.draw(output);

		pool.release(blurredY);

		return output;
	}

	private _getSSRPass(useBlur: boolean): PostProcessPass {
		// Same as Babylon.js "ThinSSRPostProcess._updateEffectDefines".
		const environment = this.environmentTexture;
		const defines = {
			SSR_SUPPORTED: true,
			SSRAYTRACE_ENABLE_REFINEMENT: this.enableSmoothReflections,
			SSRAYTRACE_SCREENSPACE_DEPTH: this._useScreenspaceDepth,
			SSR_USE_ENVIRONMENT_CUBE: !!environment,
			SSR_USE_LOCAL_REFLECTIONMAP_CUBIC: !!environment?.boundingBoxSize,
			SSR_ENVIRONMENT_CUBE_IS_GAMMASPACE: !!environment?.gammaSpace,
			SSR_INVERTCUBICMAP: this.environmentTextureIsProbe,
			SSRAYTRACE_USE_BACK_DEPTHBUFFER: this.enableAutomaticThicknessComputation,
			SSR_ATTENUATE_SCREEN_BORDERS: this.attenuateScreenBorders,
			SSR_ATTENUATE_INTERSECTION_DISTANCE: this.attenuateIntersectionDistance,
			SSR_ATTENUATE_INTERSECTION_NUMITERATIONS: this.attenuateIntersectionIterations,
			SSR_ATTENUATE_FACING_CAMERA: this.attenuateFacingCamera,
			SSR_ATTENUATE_BACKFACE_REFLECTION: this.attenuateBackfaceReflection,
			SSRAYTRACE_CLIP_TO_FRUSTUM: this.clipToFrustum,
			SSR_USE_BLUR: useBlur,
			SSRAYTRACE_DEBUG: this.debug,
			SSR_INPUT_IS_GAMMA_SPACE: this.inputTextureColorIsInGammaSpace,
			SSR_OUTPUT_IS_GAMMA_SPACE: this.generateOutputInGammaSpace,
			SSR_BLEND_WITH_FRESNEL: this.useFresnel,
			SSR_DISABLE_REFLECTIVITY_TEST: this.reflectivityThreshold === 0,
			SSR_NORMAL_IS_IN_WORLDSPACE: this.normalsAreInWorldSpace,
			SSR_DECODE_NORMAL: this.normalsAreUnsigned,
		};

		const key = JSON.stringify(defines);

		let pass = this._ssrPasses.get(key);
		if (!pass) {
			pass = new PostProcessPass(this._engine, { name: "ssr", fragment: screenSpaceReflection2FragmentWGSL }, { defines });
			this._ssrPasses.set(key, pass);
		}

		return pass;
	}

	private _getCombinerPass(): PostProcessPass {
		// Same as Babylon.js "ThinSSRBlurCombinerPostProcess._updateEffectDefines".
		const defines = {
			SSRAYTRACE_DEBUG: this.debug,
			SSR_INPUT_IS_GAMMA_SPACE: this.inputTextureColorIsInGammaSpace,
			SSR_OUTPUT_IS_GAMMA_SPACE: this.generateOutputInGammaSpace,
			SSR_BLEND_WITH_FRESNEL: this.useFresnel,
			SSRAYTRACE_SCREENSPACE_DEPTH: this._useScreenspaceDepth,
			SSR_DISABLE_REFLECTIVITY_TEST: this.reflectivityThreshold === 0,
			SSR_NORMAL_IS_IN_WORLDSPACE: this.normalsAreInWorldSpace,
			SSR_DECODE_NORMAL: this.normalsAreUnsigned,
		};

		const key = JSON.stringify(defines);

		let pass = this._combinerPasses.get(key);
		if (!pass) {
			pass = new PostProcessPass(this._engine, { name: "SSRblurCombiner", fragment: screenSpaceReflection2BlurCombinerFragmentWGSL }, { defines });
			this._combinerPasses.set(key, pass);
		}

		return pass;
	}
}
