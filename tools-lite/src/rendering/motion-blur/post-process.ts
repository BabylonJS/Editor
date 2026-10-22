import { Camera, EngineContext, Mesh, SceneContext } from "@babylonjs/lite";

import { warnOnce } from "../../tools/warn";

import { _registerPostProcessPipeline, _unregisterPostProcessPipeline } from "../pipeline";
import { IPostProcessBeforeRenderContext, IPostProcessContext, IPostProcessPipeline } from "../post-process/context";
import { IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";
import {
	_getBabylonProjectionMatrix,
	_getBabylonViewMatrix,
	_getCameraAspectRatio,
	_invertMatrix,
	_matrixFromValues,
	_multiplyMatrices,
	BabylonMatrix,
} from "../post-process/matrix";

import { motionBlurFragmentWGSL } from "./shaders";

/**
 * Same as Babylon.js `Scene.MinDeltaTime` and `Scene.MaxDeltaTime`: bounds of the time elapsed since the previous frame
 * used to compute the animation ratio.
 */
const minDeltaTime = 1;
const maxDeltaTime = 1000;

/**
 * The Motion Blur Post Process which blurs an image based on the objects velocity in scene, same as Babylon.js
 * `MotionBlurPostProcess`. It is rendered by the frame graph tasks of the tools for the scenes created using
 * `createEditorSceneContext`:
 * - object based (default): the velocity of the meshes is rendered and encoded the same way the pre-pass renderer of
 *   Babylon.js renders and encodes it (motion of the camera and of the meshes),
 * - screen based: the velocity is computed from the depth of the scene and the previous view projection of the camera.
 * As with Babylon.js, the blur is scaled by the animation ratio of the scene (time elapsed since the previous frame).
 */
export class MotionBlurPostProcess implements IPostProcessPipeline {
	/**
	 * Defines the name of the post-process.
	 */
	public readonly name: string;
	/**
	 * Defines how much the image is blurred by the movement. Default value is equal to 1
	 */
	public motionStrength: number = 1;
	/**
	 * Defines the number of samples (MSAA) of the texture the scene renders into when the post-process is the first one to
	 * render the camera.
	 */
	public samples: number = 1;

	private _scene: SceneContext;
	private _engine: EngineContext;
	private _cameras: Camera[];
	private _isDisposed: boolean = false;

	private _motionBlurSamples: number = 32;
	private _isObjectBased: boolean = true;
	private _previousViewProjection: BabylonMatrix = _matrixFromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
	private _excludedSkinnedMeshes: Mesh[] = [];

	private _passes: Map<string, PostProcessPass> = new Map();

	/**
	 * Creates a new instance MotionBlurPostProcess
	 * @param name The name of the effect.
	 * @param scene The scene containing the objects to blur according to their velocity.
	 * @param options The required width/height ratio to downsize to before computing the render pass. Only 1 is supported.
	 * @param camera The camera to apply the render pass to.
	 */
	public constructor(name: string, scene: SceneContext, options: number = 1, camera: Camera | null = null) {
		this.name = name;

		this._scene = scene;
		this._engine = scene.surface.engine;
		this._cameras = camera ? [camera] : scene.camera ? [scene.camera] : [];

		if (options !== 1) {
			warnOnce("motion-blur-ratio", "the motion blur post-process is rendered at the size of the rendering (the ratio of its size is not supported).");
		}

		this._applyMode();

		_registerPostProcessPipeline(scene, this);
	}

	/**
	 * Gets the number of iterations are used for motion blur quality. Default value is equal to 32
	 */
	public get motionBlurSamples(): number {
		return this._motionBlurSamples;
	}

	/**
	 * Sets the number of iterations to be used for motion blur quality
	 */
	public set motionBlurSamples(samples: number) {
		this._motionBlurSamples = samples;
	}

	/**
	 * Gets whether or not the motion blur post-process is in object based mode.
	 */
	public get isObjectBased(): boolean {
		return this._isObjectBased;
	}

	/**
	 * Sets whether or not the motion blur post-process is in object based mode.
	 */
	public set isObjectBased(value: boolean) {
		if (this._isObjectBased === value) {
			return;
		}

		this._isObjectBased = value;
		this._applyMode();
	}

	/**
	 * Gets the cameras the post-process is attached to.
	 */
	public get cameras(): Camera[] {
		return this._cameras;
	}

	/**
	 * Returns wether or not the post-process has been disposed.
	 */
	public get isDisposed(): boolean {
		return this._isDisposed;
	}

	/**
	 * Gets a string identifying the name of the class
	 * @returns "MotionBlurPostProcess" string
	 */
	public getClassName(): string {
		return "MotionBlurPostProcess";
	}

	/**
	 * Excludes the given skinned mesh from computing bones velocities. The meshes of the editor scenes have no skeleton
	 * with Babylon Lite: the list is kept for compatibility.
	 * @param skinnedMesh The mesh containing the skeleton to ignore when computing the velocity map.
	 */
	public excludeSkinnedMesh(skinnedMesh: Mesh): void {
		if (this._excludedSkinnedMeshes.indexOf(skinnedMesh) === -1) {
			this._excludedSkinnedMeshes.push(skinnedMesh);
		}
	}

	/**
	 * Removes the given skinned mesh from the excluded meshes to integrate bones velocities while rendering the velocity map.
	 * @param skinnedMesh The mesh containing the skeleton that has been ignored previously.
	 */
	public removeExcludedSkinnedMesh(skinnedMesh: Mesh): void {
		const index = this._excludedSkinnedMeshes.indexOf(skinnedMesh);
		if (index !== -1) {
			this._excludedSkinnedMeshes.splice(index, 1);
		}
	}

	/**
	 * Disposes the post process.
	 */
	public dispose(): void {
		this._isDisposed = true;

		this._passes.forEach((pass) => pass.dispose());
		this._passes.clear();

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
		return this.samples;
	}

	/**
	 * @internal
	 */
	public beforeRender(context: IPostProcessBeforeRenderContext): void {
		// Same as the pre-pass configuration of Babylon.js: the velocity or the depth of the scene.
		context.requestGeometry(this._isObjectBased ? { velocity: true } : { viewDepth: true });
	}

	/**
	 * @internal
	 * Renders the motion blur the same way Babylon.js does (see `ThinMotionBlurPostProcess.bind`).
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget | null): IPostProcessTexture {
		const geometry = this._isObjectBased ? context.geometry.velocity : context.geometry.viewDepth;
		if (!geometry) {
			return input;
		}

		const pool = context.pool;
		const pass = this._getPass();
		const uniforms = pass.uniforms;

		// Same as Babylon.js "scene.getAnimationRatio()".
		const deltaTime = Math.max(minDeltaTime, Math.min(context.deltaMs, maxDeltaTime));

		uniforms.set("screenSize", input.width, input.height);
		uniforms.set("motionScale", deltaTime * (60 / 1000));
		uniforms.set("motionStrength", this.motionStrength);

		pass.setTexture("textureSampler", input);

		if (this._isObjectBased) {
			pass.setTexture("velocitySampler", geometry);
		} else {
			const viewProjection = this._getViewProjection(context);

			uniforms.setArray("inverseViewProjection", _invertMatrix(viewProjection));
			uniforms.setArray("prevViewProjection", this._previousViewProjection);
			uniforms.setArray("projection", this._getProjection(context));

			this._previousViewProjection = viewProjection;

			pass.setTexture("depthSampler", geometry);
		}

		const output = target ?? pool.acquire(context.width, context.height, context.textureFormat);
		pass.draw(output);

		return output;
	}

	/**
	 * Same as Babylon.js "ThinMotionBlurPostProcess._applyMode": the previous view projection is the current one.
	 */
	private _applyMode(): void {
		const camera = this._cameras[0];
		const canvas = this._scene.surface.canvas;

		if (camera && canvas) {
			this._previousViewProjection = _multiplyMatrices(
				_getBabylonViewMatrix(camera),
				_getBabylonProjectionMatrix(camera, _getCameraAspectRatio(camera, canvas.width, canvas.height))
			);
		}
	}

	private _getProjection(context: IPostProcessContext): BabylonMatrix {
		return _getBabylonProjectionMatrix(context.camera, _getCameraAspectRatio(context.camera, context.width, context.height));
	}

	private _getViewProjection(context: IPostProcessContext): BabylonMatrix {
		return _multiplyMatrices(_getBabylonViewMatrix(context.camera), this._getProjection(context));
	}

	private _getPass(): PostProcessPass {
		// Same as Babylon.js "ThinMotionBlurPostProcess._updateEffect".
		const defines = {
			GEOMETRY_SUPPORTED: true,
			SAMPLES: this._motionBlurSamples.toFixed(1),
			OBJECT_BASED: this._isObjectBased,
			SCREEN_BASED: !this._isObjectBased,
		};

		const key = `${defines.SAMPLES}|${this._isObjectBased}`;

		let pass = this._passes.get(key);
		if (!pass) {
			pass = new PostProcessPass(this._engine, { name: "motionBlur", fragment: motionBlurFragmentWGSL }, { defines });
			this._passes.set(key, pass);
		}

		return pass;
	}
}
