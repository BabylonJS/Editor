import { Camera, EngineContext, getProjectionMatrix, SceneContext } from "@babylonjs/lite";

import "../post-process/includes";
import { _registerPostProcessPipeline, _unregisterPostProcessPipeline } from "../pipeline";
import { IPostProcessBeforeRenderContext, IPostProcessContext, IPostProcessPipeline } from "../post-process/context";
import { _getDevice, IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";

import { ssao2FragmentWGSL, ssaoCombineFragmentWGSL } from "./shaders";

/**
 * Defines the ratio of the textures of the SSAO, same as the `ratio` parameter of Babylon.js `SSAO2RenderingPipeline`.
 */
export type SSAO2Ratio = number | { ssaoRatio: number; blurRatio: number };

/**
 * Same as Babylon.js `ThinSSAO2PostProcess.PERSPECTIVE_DEPTH_PROJECTION`, laid out as a 3x3 matrix of WGSL (columns
 * aligned on 16 bytes).
 */
const perspectiveDepthProjection = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0];

/**
 * Render pipeline to produce ssao effect, same as Babylon.js `SSAO2RenderingPipeline`: the occlusion is computed from
 * the depth and the normals of the scene (rendered as the pre-pass renderer of Babylon.js renders them), blurred by a
 * bilateral blur and multiplied with the color of the scene. The effect is rendered by the frame graph tasks of the
 * tools (the scene must be created using `createEditorSceneContext`), with the same shaders as Babylon.js.
 */
export class SSAO2RenderingPipeline implements IPostProcessPipeline {
	/**
	 * The PassPostProcess id in the pipeline that contains the original scene color
	 */
	public readonly SSAOOriginalSceneColorEffect: string = "SSAOOriginalSceneColorEffect";
	/**
	 * The SSAO PostProcess id in the pipeline
	 */
	public readonly SSAORenderEffect: string = "SSAORenderEffect";
	/**
	 * The horizontal blur PostProcess id in the pipeline
	 */
	public readonly SSAOBlurHRenderEffect: string = "SSAOBlurHRenderEffect";
	/**
	 * The vertical blur PostProcess id in the pipeline
	 */
	public readonly SSAOBlurVRenderEffect: string = "SSAOBlurVRenderEffect";
	/**
	 * The PostProcess id in the pipeline that combines the SSAO-Blur output with the original scene color (SSAOOriginalSceneColorEffect)
	 */
	public readonly SSAOCombineRenderEffect: string = "SSAOCombineRenderEffect";

	/**
	 * Defines the name of the pipeline.
	 */
	public readonly name: string;

	/**
	 * The output strength of the SSAO post-process. Default value is 1.0.
	 */
	public totalStrength: number = 1.0;
	/**
	 * Maximum depth value to still render AO. A smooth falloff makes the dimming more natural, so there will be no abrupt
	 * shading change.
	 */
	public maxZ: number = 100.0;
	/**
	 * In order to save performances, SSAO radius is clamped on close geometry. This ratio changes by how much.
	 */
	public minZAspect: number = 0.2;
	/**
	 * The radius around the analyzed pixel used by the SSAO post-process. Default value is 2.0
	 */
	public radius: number = 2.0;
	/**
	 * The base color of the SSAO post-process. The final result is "base + ssao" between [0, 1]
	 */
	public base: number = 0;
	/**
	 * The number of samples the bilateral filter uses in both dimensions when denoising the SSAO calculations. Default: 16
	 */
	public bilateralSamples: number = 16;
	/**
	 * Controls the shape of the denoising kernel used by the bilateral filter. Default: 0
	 */
	public bilateralSoften: number = 0;
	/**
	 * How forgiving the bilateral denoiser should be when rejecting samples. Default: 0
	 */
	public bilateralTolerance: number = 0;
	/**
	 * Indicates that the combine stage should use the current camera viewport to render the SSAO result on only a portion
	 * of the output texture (default: true).
	 */
	public useViewportInCombineStage: boolean = true;

	private _scene: SceneContext;
	private _engine: EngineContext;
	private _cameras: Camera[];
	private _ratio: SSAO2Ratio;
	private _isDisposed: boolean = false;

	private _samples: number = 8;
	private _textureSamples: number = 1;
	private _epsilon: number = 0.02;
	private _bypassBlur: boolean = false;
	private _expensiveBlur: boolean = true;

	private _sampleSphere: number[];
	private _randomTexture: GPUTexture;
	private _randomTextureView: IPostProcessTexture;

	private _ssaoPasses: Map<string, PostProcessPass> = new Map();
	private _blurHPasses: Map<string, PostProcessPass> = new Map();
	private _blurVPasses: Map<string, PostProcessPass> = new Map();
	private _combinePass: PostProcessPass | null = null;

	/**
	 * Constructor.
	 * @param name The rendering pipeline name
	 * @param scene The scene linked to this pipeline
	 * @param ratio The size of the postprocesses. Can be a number shared between passes or an object for more precision: { ssaoRatio: 0.5, blurRatio: 1.0 }
	 * @param cameras The array of cameras that the rendering pipeline will be attached to
	 */
	public constructor(name: string, scene: SceneContext, ratio: SSAO2Ratio, cameras?: Camera[]) {
		this.name = name;

		this._scene = scene;
		this._engine = scene.surface.engine;
		this._ratio = ratio;
		this._cameras = (cameras ?? (scene.camera ? [scene.camera] : [])).slice();

		// Same order as Babylon.js: the random texture, then the sample sphere.
		const random = SSAO2RenderingPipeline._CreateRandomTextureData();
		this._randomTexture = this._createRandomTexture(random);
		this._randomTextureView = { view: this._randomTexture.createView(), width: 128, height: 128, format: "rgba8unorm" };

		this._sampleSphere = this._generateHemisphere();

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
	 * Number of samples used for the SSAO calculations. Default value is 8.
	 */
	public get samples(): number {
		return this._samples;
	}

	public set samples(n: number) {
		this._samples = n;
		this._sampleSphere = this._generateHemisphere();
	}

	/**
	 * Number of samples to use for antialiasing.
	 */
	public get textureSamples(): number {
		return this._textureSamples;
	}

	public set textureSamples(n: number) {
		this._textureSamples = n;
	}

	/**
	 * Used in SSAO calculations to compensate for accuracy issues with depth values. Default 0.02.
	 */
	public get epsilon(): number {
		return this._epsilon;
	}

	public set epsilon(n: number) {
		this._epsilon = n;
	}

	/**
	 * Skips the denoising (blur) stage of the SSAO calculations.
	 */
	public get bypassBlur(): boolean {
		return this._bypassBlur;
	}

	public set bypassBlur(b: boolean) {
		this._bypassBlur = b;
	}

	/**
	 * Enables the configurable bilateral denoising (blurring) filter. Default is true.
	 * Set to false to instead use a legacy bilateral filter that can't be configured.
	 */
	public get expensiveBlur(): boolean {
		return this._expensiveBlur;
	}

	public set expensiveBlur(b: boolean) {
		this._expensiveBlur = b;
	}

	/**
	 * Support test.
	 */
	public static get IsSupported(): boolean {
		return true;
	}

	/**
	 * Get the class name
	 * @returns "SSAO2RenderingPipeline"
	 */
	public getClassName(): string {
		return "SSAO2RenderingPipeline";
	}

	/**
	 * Returns wether or not the pipeline is ready to render.
	 */
	public isReady(): boolean {
		return true;
	}

	/**
	 * Removes the internal pipeline assets and detaches the pipeline from the scene cameras
	 */
	public dispose(): void {
		this._isDisposed = true;

		this._ssaoPasses.forEach((pass) => pass.dispose());
		this._blurHPasses.forEach((pass) => pass.dispose());
		this._blurVPasses.forEach((pass) => pass.dispose());
		this._combinePass?.dispose();

		this._ssaoPasses.clear();
		this._blurHPasses.clear();
		this._blurVPasses.clear();
		this._combinePass = null;

		this._randomTexture.destroy();

		_unregisterPostProcessPipeline(this._scene, this);
	}

	/**
	 * @internal
	 */
	public isActiveForCamera(camera: Camera): boolean {
		return !this._isDisposed && this._cameras.includes(camera);
	}

	/**
	 * @internal
	 */
	public getSceneSamples(): number {
		return this._textureSamples;
	}

	/**
	 * @internal
	 */
	public beforeRender(context: IPostProcessBeforeRenderContext): void {
		context.requestGeometry({ viewDepth: true, viewNormal: true });
	}

	/**
	 * @internal
	 * Renders the SSAO the same way Babylon.js does: SSAO, horizontal blur, vertical blur, then combination with the
	 * color of the scene.
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget | null): IPostProcessTexture {
		const depth = context.geometry.viewDepth;
		const normal = context.geometry.viewNormal;
		if (!depth || !normal) {
			return input;
		}

		const pool = context.pool;
		const format = context.textureFormat;
		const camera = context.camera;

		const ssaoRatio = typeof this._ratio === "number" ? this._ratio : this._ratio.ssaoRatio;
		const blurRatio = typeof this._ratio === "number" ? this._ratio : this._ratio.blurRatio;

		const size = (ratio: number) => ({ width: (context.width * ratio) | 0, height: (context.height * ratio) | 0 });

		// SSAO, rendered into the input of the horizontal blur.
		const ssaoPass = this._getSSAOPass();
		const uniforms = ssaoPass.uniforms;

		const viewport = camera.viewport;
		const aspectRatio = (context.width * (viewport?.width ?? 1)) / (context.height * (viewport?.height ?? 1));
		const viewportSize = Math.tan(camera.fov / 2);

		uniforms.setArray("sampleSphere", this._getSampleSphereUniform());
		uniforms.set("randTextureTiles", 32.0);
		uniforms.set("samplesFactor", 1 / this._samples);
		uniforms.set("totalStrength", this.totalStrength);
		uniforms.set("texelSize", 1 / input.width, 1 / input.height);
		uniforms.set("radius", this.radius);
		uniforms.set("maxZ", this.maxZ);
		uniforms.set("minZAspect", this.minZAspect);
		uniforms.set("base", this.base);
		uniforms.set("near", camera.nearPlane);
		uniforms.setArray("depthProjection", perspectiveDepthProjection);
		uniforms.set("xViewport", viewportSize * aspectRatio);
		uniforms.set("yViewport", viewportSize);
		uniforms.setArray("projection", getProjectionMatrix(camera, aspectRatio) as unknown as ArrayLike<number>);

		ssaoPass.setTexture("textureSampler", input);
		ssaoPass.setTexture("depthSampler", depth);
		ssaoPass.setTexture("normalSampler", normal);
		ssaoPass.setTexture("randomSampler", this._randomTextureView, "bilinear", "wrap");

		const ssaoSize = size(ssaoRatio);
		const ssao = pool.acquire(ssaoSize.width, ssaoSize.height, format);
		ssaoPass.draw(ssao);

		// Blur
		const blurSize = size(blurRatio);

		const blurH = this._getBlurPass(true);
		blurH.uniforms.set("outSize", input.width * blurRatio);
		this._bindBlurPass(blurH, ssao, depth);

		const blurredH = pool.acquire(blurSize.width, blurSize.height, format);
		blurH.draw(blurredH);
		pool.release(ssao);

		const blurV = this._getBlurPass(false);
		blurV.uniforms.set("outSize", input.height * blurRatio);
		this._bindBlurPass(blurV, blurredH, depth);

		const blurredV = pool.acquire(blurSize.width, blurSize.height, format);
		blurV.draw(blurredV);
		pool.release(blurredH);

		// Combine
		this._combinePass ??= new PostProcessPass(this._engine, { name: "ssaoCombine", fragment: ssaoCombineFragmentWGSL });

		if (this.useViewportInCombineStage) {
			this._combinePass.uniforms.set("viewport", viewport?.x ?? 0, viewport?.y ?? 0, viewport?.width ?? 1, viewport?.height ?? 1);
		} else {
			this._combinePass.uniforms.set("viewport", 0, 0, 1, 1);
		}

		this._combinePass.setTexture("textureSampler", blurredV);
		this._combinePass.setTexture("originalColor", input);

		const output = target ?? pool.acquire(context.width, context.height, format);
		this._combinePass.draw(output);

		pool.release(blurredV);

		return output;
	}

	/**
	 * Returns the values of the sample sphere laid out as an array of vec3 of WGSL (aligned on 16 bytes).
	 */
	private _getSampleSphereUniform(): number[] {
		const result: number[] = [];
		for (let i = 0; i < this._sampleSphere.length; i += 3) {
			result.push(this._sampleSphere[i], this._sampleSphere[i + 1], this._sampleSphere[i + 2], 0);
		}

		return result;
	}

	private _getSSAOPass(): PostProcessPass {
		// Same as Babylon.js "ThinSSAO2PostProcess._getDefinesForSSAO".
		const defines = { SSAO: true, SAMPLES: this._samples, EPSILON: this._epsilon.toFixed(4) };
		const key = JSON.stringify(defines);

		let pass = this._ssaoPasses.get(key);
		if (!pass) {
			pass = new PostProcessPass(this._engine, { name: "ssao", fragment: ssao2FragmentWGSL }, { defines, unflippedTextures: ["randomSampler"] });
			this._ssaoPasses.set(key, pass);
		}

		return pass;
	}

	private _getBlurPass(horizontal: boolean): PostProcessPass {
		// Same as Babylon.js "ThinSSAO2BlurPostProcess._getDefinesForBlur".
		const defines = { BLUR: true, BLUR_BYPASS: this._bypassBlur, BLUR_LEGACY: !this._expensiveBlur, BLUR_H: horizontal };
		const key = JSON.stringify(defines);
		const passes = horizontal ? this._blurHPasses : this._blurVPasses;

		let pass = passes.get(key);
		if (!pass) {
			pass = new PostProcessPass(this._engine, { name: horizontal ? "BlurH" : "BlurV", fragment: ssao2FragmentWGSL }, { defines });
			passes.set(key, pass);
		}

		return pass;
	}

	private _bindBlurPass(pass: PostProcessPass, input: IPostProcessTexture, depth: IPostProcessTexture): void {
		pass.uniforms.set("samples", this.bilateralSamples);
		pass.uniforms.set("soften", this.bilateralSoften);
		pass.uniforms.set("tolerance", this.bilateralTolerance);

		pass.setTexture("textureSampler", input);
		if (!this._bypassBlur) {
			pass.setTexture("depthSampler", depth);
		}
	}

	/**
	 * Creates the data of the random texture, same as Babylon.js `ThinSSAO2PostProcess._createRandomTexture`.
	 * @internal
	 */
	public static _CreateRandomTextureData(): Uint8Array {
		const size = 128;
		const data = new Uint8Array(size * size * 4);

		for (let index = 0; index < data.length; ) {
			let x = Math.random();
			let y = Math.random();

			// Same as Babylon.js "Vector2.normalize" then "scaleInPlace(255)".
			const length = Math.sqrt(x * x + y * y);
			if (length !== 0 && length !== 1.0) {
				const scale = 1.0 / length;
				x *= scale;
				y *= scale;
			}

			data[index++] = Math.floor(x * 255);
			data[index++] = Math.floor(y * 255);
			data[index++] = 0;
			data[index++] = 255;
		}

		return data;
	}

	private _createRandomTexture(data: Uint8Array): GPUTexture {
		const device = _getDevice(this._engine);

		// Same as Babylon.js: the data is uploaded as is (no inversion of the rows), sampled with a bilinear filter and
		// repeated (see the "unflippedTextures" of the SSAO pass).
		const texture = device.createTexture({
			label: "SSAORandomTexture",
			size: { width: 128, height: 128 },
			format: "rgba8unorm",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
		});

		device.queue.writeTexture({ texture }, data, { bytesPerRow: 128 * 4 }, { width: 128, height: 128 });

		return texture;
	}

	/**
	 * Replaces the data of the random texture (used to compare the rendering with Babyl.js using the same random values).
	 * @internal
	 */
	public _setRandomTextureData(data: Uint8Array): void {
		_getDevice(this._engine).queue.writeTexture({ texture: this._randomTexture }, data, { bytesPerRow: 128 * 4 }, { width: 128, height: 128 });
	}

	/**
	 * Replaces the sample sphere (used to compare the rendering with Babylon.js using the same random values).
	 * @internal
	 */
	public _setSampleSphere(sampleSphere: number[]): void {
		this._sampleSphere = sampleSphere.slice();
	}

	/**
	 * Same as Babylon.js `ThinSSAO2PostProcess._radicalInverseVdC` (Van der Corput radical inverse).
	 */
	private _radicalInverseVdC(i: number): number {
		const bits = new Uint32Array(1);
		bits[0] = i;
		bits[0] = ((bits[0] << 16) | (bits[0] >> 16)) >>> 0;
		bits[0] = ((bits[0] & 0x55555555) << 1) | (((bits[0] & 0xaaaaaaaa) >>> 1) >>> 0);
		bits[0] = ((bits[0] & 0x33333333) << 2) | (((bits[0] & 0xcccccccc) >>> 2) >>> 0);
		bits[0] = ((bits[0] & 0x0f0f0f0f) << 4) | (((bits[0] & 0xf0f0f0f0) >>> 4) >>> 0);
		bits[0] = ((bits[0] & 0x00ff00ff) << 8) | (((bits[0] & 0xff00ff00) >>> 8) >>> 0);
		return bits[0] * 2.3283064365386963e-10;
	}

	private _hemisphereSampleUniform(u: number, v: number): number[] {
		const phi = v * 2.0 * Math.PI;
		// rejecting samples that are close to tangent plane to avoid z-fighting artifacts
		const cosTheta = 1.0 - u * 0.85;
		const sinTheta = Math.sqrt(1.0 - cosTheta * cosTheta);
		return [Math.cos(phi) * sinTheta, Math.sin(phi) * sinTheta, cosTheta];
	}

	/**
	 * Same as Babylon.js `ThinSSAO2PostProcess._generateHemisphere`.
	 */
	private _generateHemisphere(): number[] {
		const numSamples = this._samples;
		const result: number[] = [];

		for (let i = 0; i < numSamples; i++) {
			let vector: number[];
			if (numSamples < 16) {
				vector = this._hemisphereSampleUniform(Math.random(), Math.random());
			} else {
				vector = this._hemisphereSampleUniform(i / numSamples, this._radicalInverseVdC(i));
			}

			result.push(vector[0], vector[1], vector[2]);
		}

		return result;
	}
}
