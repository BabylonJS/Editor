import { Camera, EngineContext, getViewMatrix, SceneContext } from "@babylonjs/lite";

import { _registerPostProcessPipeline, _unregisterPostProcessPipeline } from "../pipeline";
import { IPostProcessBeforeRenderContext, IPostProcessContext, IPostProcessPipeline } from "../post-process/context";
import { _getDevice, IPostProcessTarget, IPostProcessTexture, PostProcessPass } from "../post-process/pass";
import { _getCameraAspectRatio } from "../post-process/matrix";

import { getSceneData } from "../../tools/scene";
import { getShadowGeneratorInfo } from "../../loading/shadows";

import { passFragmentWGSL } from "../default/shaders";

import { Halton2DSequence } from "./halton";
import { taaFragmentWGSL } from "./shaders";

/**
 * Defines a texture of the history of the temporal anti-aliasing.
 */
interface ITAATexture extends IPostProcessTarget {
	readonly texture: GPUTexture;
}

/**
 * Defines the jitter Babylon.js stores in the projection matrix of a camera: it is kept until the projection matrix is
 * computed again (the field of view, the clip planes or the aspect ratio of the camera changed).
 */
interface IProjectionJitter {
	x: number;
	y: number;
	key: number[];
}

/**
 * Simple implementation of Temporal Anti-Aliasing (TAA), same as the `TAARenderingPipeline` of Babylon.js. It is
 * rendered by the frame graph tasks of the tools for the scenes created using `createEditorSceneContext`:
 * - the projection of the camera is jittered by a Halton sequence the same way Babylon.js jitters the projection matrix
 *   of the camera (or the vertices of the materials when the history is reprojected),
 * - the scene is blended with the history of the previous frames stored in ping-pong textures, then copied to the
 *   output.
 */
export class TAARenderingPipeline implements IPostProcessPipeline {
	/**
	 * The TAA PostProcess effect id in the pipeline
	 */
	public TAARenderEffect: string = "TAARenderEffect";
	/**
	 * The pass PostProcess effect id in the pipeline
	 */
	public TAAPassEffect: string = "TAAPassEffect";

	/**
	 * The blend factor of the current frame against the history (default: 0.05).
	 */
	public factor: number = 0.05;
	/**
	 * Disable TAA on camera move (default: true).
	 * You generally want to keep this enabled, otherwise you will get a ghost effect when the camera moves (but if it's
	 * what you want, go for it!)
	 */
	public disableOnCameraMove: boolean = true;

	private _name: string;
	private _scene: SceneContext;
	private _engine: EngineContext;
	private _cameras: Camera[];
	private _camerasToBeAttached: Camera[];

	private _isDisposed: boolean = false;
	private _isEnabled: boolean = true;
	private _isDirty: boolean = false;
	private _msaaSamples: number = 1;

	// Same state as the "ThinTAAPostProcess" of Babylon.js.
	private _samples: number = 8;
	private _disabled: boolean = false;
	private _textureWidth: number = 0;
	private _textureHeight: number = 0;
	private _reprojectHistory: boolean = false;
	private _clampHistory: boolean = false;
	private _firstUpdate: boolean = true;
	private _hs: Halton2DSequence;

	/**
	 * Same as the jitter of the material manager of Babylon.js applied by the materials when the history is reprojected.
	 */
	private _materialJitter: { x: number; y: number } = { x: 0, y: 0 };
	private _projectionJitters: Map<Camera, IProjectionJitter> = new Map();
	private _viewMatrices: Map<Camera, Float64Array> = new Map();

	private _pingpong: number = 0;
	private _ping: ITAATexture | null = null;
	private _pong: ITAATexture | null = null;

	private _taaPasses: Map<string, PostProcessPass> = new Map();
	private _passPass: PostProcessPass | null = null;

	/**
	 * Constructs a new TAA rendering pipeline
	 * @param name The rendering pipeline name
	 * @param scene The scene linked to this pipeline
	 * @param cameras The array of cameras that the rendering pipeline will be attached to (default: scene.camera)
	 * @param textureType The type of texture where the scene will be rendered (default: half float, as the textures of
	 * the rendering pipelines of the tools)
	 */
	public constructor(name: string, scene: SceneContext, cameras?: Camera[], textureType?: number) {
		void textureType;

		this._name = name;
		this._scene = scene;
		this._engine = scene.surface.engine;

		this._cameras = (cameras ?? (scene.camera ? [scene.camera] : [])).slice();
		this._camerasToBeAttached = this._cameras.slice();

		this._hs = new Halton2DSequence(this._samples);

		// Same as Babylon.js: the history textures are created with the size of the rendering.
		const canvas = scene.surface.canvas;
		this._createPingPongTextures(canvas.width, canvas.height);

		_registerPostProcessPipeline(scene, this);
		this._buildPipeline();
	}

	/**
	 * Gets the name of the pipeline.
	 */
	public get name(): string {
		return this._name;
	}

	/**
	 * Gets the scene the pipeline belongs to.
	 */
	public get scene(): SceneContext {
		return this._scene;
	}

	/**
	 * Gets the list of cameras the pipeline is attached to.
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
	 * Gets or sets the number of samples used for the jittering of the camera (default: 8).
	 */
	public get samples(): number {
		return this._samples;
	}

	public set samples(samples: number) {
		if (this._samples === samples) {
			return;
		}

		this._samples = samples;
		this._hs.regenerate(samples);
	}

	/**
	 * MSAA samples (default: 1)
	 */
	public get msaaSamples(): number {
		return this._msaaSamples;
	}

	public set msaaSamples(samples: number) {
		this._msaaSamples = samples;
	}

	/**
	 * Enables reprojecting the history texture with a per-pixel velocity.
	 * If set the "disableOnCameraMove" property is ignored.
	 */
	public get reprojectHistory(): boolean {
		return this._reprojectHistory;
	}

	public set reprojectHistory(reproject: boolean) {
		if (this._reprojectHistory === reproject) {
			return;
		}

		this._reprojectHistory = reproject;

		// The velocity buffer may be old so reset for one frame
		if (reproject) {
			this._reset();
		}

		this._buildPipeline();
	}

	/**
	 * Clamps the history pixel to the min and max of the 3x3 pixels surrounding the target pixel.
	 * This can help further reduce ghosting and artifacts.
	 */
	public get clampHistory(): boolean {
		return this._clampHistory;
	}

	public set clampHistory(clamp: boolean) {
		this._clampHistory = clamp;
	}

	/**
	 * Gets or sets wether or not the pipeline is enabled (default: true).
	 */
	public get isEnabled(): boolean {
		return this._isEnabled;
	}

	public set isEnabled(value: boolean) {
		if (this._isEnabled === value) {
			return;
		}

		this._isEnabled = value;
		this._setDisabled(!value);

		if (!value) {
			this._cameras = this._camerasToBeAttached.slice();
		} else if (!this._isDirty) {
			this._reset();
		} else {
			this._buildPipeline();
		}
	}

	/**
	 * Returns true if TAA is supported by the running hardware
	 */
	public get isSupported(): boolean {
		return true;
	}

	/**
	 * Gets the width of the textures of the history.
	 */
	public get textureWidth(): number {
		return this._textureWidth;
	}

	/**
	 * Gets the height of the textures of the history.
	 */
	public get textureHeight(): number {
		return this._textureHeight;
	}

	/**
	 * Get the class name
	 * @returns "TAARenderingPipeline"
	 */
	public getClassName(): string {
		return "TAARenderingPipeline";
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
	 * Removes the internal pipeline assets and detaches the pipeline from the scene cameras
	 */
	public dispose(): void {
		this._isDisposed = true;

		this._disposePostProcesses();

		this._taaPasses.forEach((pass) => pass.dispose());
		this._taaPasses.clear();

		this._passPass?.dispose();
		this._passPass = null;

		this._ping?.texture.destroy();
		this._pong?.texture.destroy();
		this._ping = null;
		this._pong = null;

		this._viewMatrices.clear();

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
		return this._msaaSamples;
	}

	/**
	 * @internal
	 */
	public beforeRender(context: IPostProcessBeforeRenderContext): void {
		if (this._reprojectHistory) {
			context.requestGeometry({ linearVelocity: true });
		}
	}

	/**
	 * @internal
	 * Renders the temporal anti-aliasing the same way Babylon.js does (see "onActivateObservable" and "onApplyObservable"
	 * of the TAA post-process of the `TAARenderingPipeline` of Babylon.js).
	 */
	public render(context: IPostProcessContext, input: IPostProcessTexture, target: IPostProcessTarget | null): IPostProcessTexture {
		const camera = context.camera;
		const hasMoved = this._hasCameraMoved(camera);

		// Babylon.js computes the projection matrix of the camera again when the camera changed, and each time it renders a
		// render target before drawing the scene (shadow maps, depth renderers): the jitter is removed.
		const projectionKey = this._getProjectionKey(context);
		const projectionJitter = this._projectionJitters.get(camera);
		if (projectionJitter && (!this._isSameProjectionKey(projectionJitter.key, projectionKey) || this._rendersTargetsBeforeDraws(context))) {
			this._projectionJitters.delete(camera);
		}

		if (context.width !== this._ping?.width || context.height !== this._ping?.height) {
			this._createPingPongTextures(context.width, context.height);
		}

		// The TAA post-process of Babylon.js jitters the projection when activated: before the scene is drawn when it is
		// the first post-process of the camera rendering the scene, after otherwise (the jitter applies the next frame).
		// The scene is drawn before the pre-pass renderer activates the post-processes, enabled to render the velocity.
		const jitterBeforeDraws = context.pipelines[0] === this && !this._reprojectHistory;
		if (jitterBeforeDraws) {
			this._updateJitter(camera, hasMoved, projectionKey);
		}

		if (this._reprojectHistory) {
			context.jitterVertices(this._materialJitter.x, this._materialJitter.y);
		} else {
			const jitter = this._projectionJitters.get(camera);
			context.jitterProjection(jitter?.x ?? 0, jitter?.y ?? 0, true);
		}

		if (!jitterBeforeDraws) {
			this._updateJitter(camera, hasMoved, projectionKey);
		}

		const destination = (this._pingpong ? this._ping : this._pong)!;
		this._pingpong = this._pingpong ^ 1;
		const history = (this._pingpong ? this._ping : this._pong)!;

		// TAA
		const pass = this._getTAAPass();
		pass.uniforms.set("factor", (hasMoved && this.disableOnCameraMove) || this._firstUpdate ? 1 : this.factor);
		this._firstUpdate = false;

		pass.setTexture("textureSampler", input);
		pass.setTexture("historySampler", history);

		const velocity = context.geometry.linearVelocity;
		if (this._reprojectHistory && velocity) {
			pass.setTexture("velocitySampler", velocity);
		}

		pass.draw(destination);

		if (!target) {
			return destination;
		}

		// Pass
		this._passPass ??= new PostProcessPass(this._engine, { name: "TAAPass", fragment: passFragmentWGSL });
		this._passPass.setTexture("textureSampler", destination);
		this._passPass.draw(target);

		return target;
	}

	/**
	 * Same as Babylon.js "ThinTAAPostProcess._reset".
	 */
	private _reset(): void {
		this._hs.setDimensions(this._textureWidth / 2, this._textureHeight / 2);
		this._hs.next();
		this._firstUpdate = true;
	}

	/**
	 * Same as the "disabled" setter of Babylon.js "ThinTAAPostProcess".
	 */
	private _setDisabled(value: boolean): void {
		if (this._disabled === value) {
			return;
		}

		this._disabled = value;
		this._reset();
	}

	private _setTextureSize(width: number, height: number): void {
		if (this._textureWidth !== width) {
			this._textureWidth = width;
			this._reset();
		}

		if (this._textureHeight !== height) {
			this._textureHeight = height;
			this._reset();
		}
	}

	private _createPingPongTextures(width: number, height: number): void {
		this._ping?.texture.destroy();
		this._pong?.texture.destroy();

		this._ping = this._createTexture("TAAPing", width, height);
		this._pong = this._createTexture("TAAPong", width, height);

		this._setTextureSize(width, height);
	}

	private _createTexture(label: string, width: number, height: number): ITAATexture {
		const texture = _getDevice(this._engine).createTexture({
			label,
			size: { width: Math.max(1, width), height: Math.max(1, height) },
			format: "rgba16float",
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
		});

		return { texture, view: texture.createView(), width, height, format: "rgba16float" };
	}

	/**
	 * Same as Babylon.js "TAARenderingPipeline._buildPipeline": the projection of the cameras is computed again.
	 */
	private _buildPipeline(): void {
		if (!this._isEnabled) {
			this._isDirty = true;
			return;
		}

		this._isDirty = false;

		this._disposePostProcesses();
		this._cameras = this._camerasToBeAttached.slice();
	}

	private _disposePostProcesses(): void {
		this._cameras.forEach((camera) => this._projectionJitters.delete(camera));
	}

	/**
	 * Same as Babylon.js "ThinTAAPostProcess._updateJitter".
	 */
	private _updateJitter(camera: Camera, hasMoved: boolean, projectionKey: number[]): void {
		if (this._reprojectHistory) {
			// Applying jitter to the projection matrix messes with the velocity buffer, so Babylon.js jitters the
			// vertices of the materials instead.
			if (!hasMoved || !this.disableOnCameraMove) {
				this._hs.next();
			}

			this._materialJitter.x = this._hs.x;
			this._materialJitter.y = this._hs.y;
		} else {
			// Same as "ThinTAAPostProcess._updateProjectionMatrix".
			if (this._disabled) {
				return;
			}

			if (!hasMoved) {
				this._projectionJitters.set(camera, { x: this._hs.x, y: this._hs.y, key: projectionKey });
			}

			this._hs.next();
		}
	}

	/**
	 * Returns wether or not the view matrix of the given camera changed since the previous frame (same as
	 * `camera.hasMoved` of Babylon.js).
	 */
	private _hasCameraMoved(camera: Camera): boolean {
		const view = getViewMatrix(camera) as unknown as ArrayLike<number>;

		const previous = this._viewMatrices.get(camera);
		if (previous && Array.prototype.every.call(previous, (value: number, index: number) => value === view[index])) {
			return false;
		}

		const copy = previous ?? new Float64Array(16);
		for (let i = 0; i < 16; ++i) {
			copy[i] = view[i];
		}

		this._viewMatrices.set(camera, copy);

		return true;
	}

	/**
	 * Returns wether or not Babylon.js renders render targets before drawing the scene this frame: Babylon.js computes the
	 * projection matrix of the camera again when rendering a render target. The Babylon.js version of the tools creates a
	 * clustered light container for the scenes it loads, which renders its tiles into a render target each frame. The other
	 * scenes render the shadow maps (not rendered once only) and the depth renderers (depth of field, thickness of the
	 * screen space reflections, volumetric lighting).
	 */
	private _rendersTargetsBeforeDraws(context: IPostProcessContext): boolean {
		if (getSceneData(context.scene).cameras.includes(context.camera)) {
			return true;
		}

		const geometry = context.geometry;
		if (geometry.depthRenderer || geometry.backDepth || geometry.volumetricDepth) {
			return true;
		}

		return context.scene.lights.some((light) => light.shadowGenerator && (getShadowGeneratorInfo(light.shadowGenerator)?.data?.refreshRate ?? 1) !== 0);
	}

	/**
	 * Returns the values Babylon.js compares to know if the projection matrix of the camera must be computed again.
	 */
	private _getProjectionKey(context: IPostProcessContext): number[] {
		const camera = context.camera;
		const ortho = camera.ortho;

		return [
			camera.fov,
			camera.nearPlane,
			camera.farPlane,
			_getCameraAspectRatio(camera, context.width, context.height),
			ortho ? 1 : 0,
			ortho?.halfHeight ?? 0,
			ortho?.left ?? NaN,
			ortho?.right ?? NaN,
			ortho?.bottom ?? NaN,
			ortho?.top ?? NaN,
		];
	}

	private _isSameProjectionKey(a: number[], b: number[]): boolean {
		return a.every((value, index) => Object.is(value, b[index]));
	}

	private _getTAAPass(): PostProcessPass {
		// Same as Babylon.js "ThinTAAPostProcess._updateEffect".
		const defines: Record<string, boolean> = {};
		if (this._reprojectHistory) {
			defines.TAA_REPROJECT_HISTORY = true;
		}
		if (this._clampHistory) {
			defines.TAA_CLAMP_HISTORY = true;
		}

		const key = Object.keys(defines).join("|");

		let pass = this._taaPasses.get(key);
		if (!pass) {
			pass = new PostProcessPass(this._engine, { name: "taa", fragment: taaFragmentWGSL }, { defines });
			this._taaPasses.set(key, pass);
		}

		return pass;
	}
}
