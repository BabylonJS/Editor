import { Camera, Scene, Viewport } from "babylonjs";

export interface ICameraPreviewOptions {
	/**
	 * The border size around the camera preview (0-1)
	 */
	border: number;
	/**
	 * The width of the camera preview (0-1)
	 */
	width: number;
	/**
	 * The height of the camera preview (0-1)
	 */
	height: number;

	/**
	 * Whether to disable shadows for camera preview
	 */
	disableShadows: boolean;
	/**
	 * Whether to disable post-processes for camera preview
	 */
	disablePostProcesses: boolean;
	/**
	 * Whether to disable render targets for camera preview
	 */
	disableRenderTargets: boolean;

	/**
	 * Distance culling multiplier for camera preview (0-1)
	 */
	distanceCulling: number;
}

export class CameraPreview {
	private _scene: Scene;
	private _mainCamera: Camera;
	private _cameraPreview: Camera | null = null;
	private _options: ICameraPreviewOptions;

	constructor(scene: Scene, mainCamera: Camera, options?: Partial<ICameraPreviewOptions>) {
		this._scene = scene;
		this._mainCamera = mainCamera;
		this._options = {
			border: 0.025,
			width: 0.25,
			height: 0.25,
			disableShadows: true,
			disablePostProcesses: true,
			disableRenderTargets: true,
			distanceCulling: 0.5,
			...options,
		};
	}

	/**
	 * Sets the given camera active as a preview.
	 * This helps to visualize what the selected camera sees when being manipulated
	 * using gizmos for example.
	 * When "null", the preview is removed.
	 * @param camera the camera to activate the preview
	 */
	public setCameraPreviewActive(camera: Camera | null): void {
		if (!this._scene) {
			return;
		}

		// If no camera -> restore full viewport / clear multi-camera setup
		if (!camera) {
			this._deactivateCameraPreview();
			return;
		}

		// Activate multi-camera: editor/main camera + selected camera as preview
		try {
			this._activateCameraPreview(camera);
		} catch (e) {
			console.error("Failed to activate camera preview", e);
		}
	}

	/**
	 * Applies performance optimizations for camera preview rendering
	 */
	public applyCameraPreviewOptimizations(): void {
		if (!this._cameraPreview || !(this._cameraPreview as any)._cameraPreviewOptimizations) {
			return;
		}

		const optimizations = (this._cameraPreview as any)._cameraPreviewOptimizations;

		// Store current scene settings
		(this._scene as any)._originalShadowsEnabled = this._scene.shadowsEnabled;
		(this._scene as any)._originalPostProcessesEnabled = this._scene.postProcessesEnabled;
		(this._scene as any)._originalRenderTargetsEnabled = this._scene.renderTargetsEnabled;

		// Apply optimizations
		if (optimizations.disableShadows) {
			this._scene.shadowsEnabled = false;
		}
		if (optimizations.disablePostProcesses) {
			this._scene.postProcessesEnabled = false;
		}
		if (optimizations.disableRenderTargets) {
			this._scene.renderTargetsEnabled = false;
		}
	}

	/**
	 * Restores original scene settings after camera preview rendering
	 */
	public restoreSceneSettings(): void {
		if ((this._scene as any)._originalShadowsEnabled !== undefined) {
			this._scene.shadowsEnabled = (this._scene as any)._originalShadowsEnabled;
		}
		if ((this._scene as any)._originalPostProcessesEnabled !== undefined) {
			this._scene.postProcessesEnabled = (this._scene as any)._originalPostProcessesEnabled;
		}
		if ((this._scene as any)._originalRenderTargetsEnabled !== undefined) {
			this._scene.renderTargetsEnabled = (this._scene as any)._originalRenderTargetsEnabled;
		}
	}

	/**
	 * Gets the current camera preview
	 */
	public getCameraPreview(): Camera | null {
		return this._cameraPreview;
	}

	/**
	 * Updates the camera preview options
	 */
	public updateOptions(options: Partial<ICameraPreviewOptions>): void {
		this._options = { ...this._options, ...options };
	}

	/**
	 * Activates the camera preview with optimizations
	 */
	private _activateCameraPreview(camera: Camera): void {
		const previewX = 1 - this._options.width - this._options.border;
		const previewY = this._options.border;

		this._scene.activeCameras = [this._mainCamera, camera];

		camera.viewport = new Viewport(previewX, previewY, this._options.width, this._options.height);
		this._mainCamera.viewport = new Viewport(0, 0, 1, 1);

		// Store camera preview reference for optimization
		this._cameraPreview = camera;

		// Optimize camera preview rendering
		this._optimizeCameraPreview(camera);

		// Keep interactions with the editor camera (main preview)
		this._scene.activeCamera = this._mainCamera;
		this._scene.cameraToUseForPointers = this._mainCamera;
	}

	/**
	 * Deactivates the camera preview and restores settings
	 */
	private _deactivateCameraPreview(): void {
		if (this._scene.activeCameras) {
			this._scene.activeCameras.forEach((c) => {
				c.viewport = new Viewport(0, 0, 1, 1);
				// Restore original camera settings
				this._restoreCameraPreview(c);
			});
			this._scene.activeCameras = null;
		} else if (this._mainCamera) {
			this._mainCamera.viewport = new Viewport(0, 0, 1, 1);
		}

		this._scene.activeCamera = this._mainCamera;
		this._scene.cameraToUseForPointers = this._mainCamera;
		this._cameraPreview = null;
	}

	/**
	 * Optimizes the camera preview for better performance
	 * @param camera the camera to optimize
	 */
	private _optimizeCameraPreview(camera: Camera): void {
		// Store original settings to restore later
		(camera as any)._originalMaxZ = camera.maxZ;
		(camera as any)._originalRenderTargetsEnabled = this._scene.renderTargetsEnabled;
		(camera as any)._originalShadowsEnabled = this._scene.shadowsEnabled;
		(camera as any)._originalPostProcessesEnabled = this._scene.postProcessesEnabled;

		// Reduce culling distance to reduce rendered objects
		camera.maxZ = camera.maxZ * this._options.distanceCulling;

		// Disable expensive effects for camera preview
		// Note: These are scene-wide settings, so we'll handle them in the render loop
		(camera as any)._cameraPreviewOptimizations = {
			disableShadows: this._options.disableShadows,
			disablePostProcesses: this._options.disablePostProcesses,
			disableRenderTargets: this._options.disableRenderTargets,
		};
	}

	/**
	 * Restores original camera settings when camera preview is disabled
	 * @param camera the camera to restore
	 */
	private _restoreCameraPreview(camera: Camera): void {
		if ((camera as any)._originalMaxZ !== undefined) {
			camera.maxZ = (camera as any)._originalMaxZ;
		}
		// Clear optimization flags
		delete (camera as any)._cameraPreviewOptimizations;
	}
}
