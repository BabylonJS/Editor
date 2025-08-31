import { Engine, Scene, Vector3, DirectionalLight, HemisphericLight, UniversalCamera, Color3 } from "babylonjs";

export interface IBaseThumbnailRendererProps {
	/**
	 * The absolute path to the asset file.
	 */
	absolutePath: string;
	/**
	 * The width of the thumbnail.
	 */
	width?: number;
	/**
	 * The height of the thumbnail.
	 */
	height?: number;
}

export abstract class BaseThumbnailRenderer {
	protected engine: Engine | null = null;
	protected scene: Scene | null = null;
	protected canvas: HTMLCanvasElement | null = null;

	/**
	 * Sets up the basic scene with lighting and camera.
	 * This method should be called before setupGeometry.
	 */
	protected setupScene(canvas: HTMLCanvasElement): Scene {
		this.canvas = canvas;

		// Create engine with appropriate settings for thumbnails
		this.engine = new Engine(canvas, true, {
			antialias: true,
			audioEngine: false,
			adaptToDeviceRatio: true,
			preserveDrawingBuffer: true,
			premultipliedAlpha: false,
		});

		this.scene = new Scene(this.engine);
		this.scene.clearColor.set(0, 0, 0, 0);

		// Setup camera
		const camera = new UniversalCamera("UniversalCamera", new Vector3(0, 10, 30), this.scene);
		camera.fov = 0.4;
		camera.minZ = 0.1;

		// Setup lighting
		const dirLight = new DirectionalLight("dirLight", new Vector3(4, -4, -4), this.scene);
		dirLight.intensity = 1;
		dirLight.position = new Vector3(100, 100, 100);
		dirLight.diffuse = new Color3(1, 1, 1);
		dirLight.specular = new Color3(1, 1, 1);

		const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
		hemiLight.intensity = 0.2;
		hemiLight.diffuse = new Color3(1, 1, 1);
		hemiLight.groundColor = new Color3(1, 1, 1);

		return this.scene;
	}

	/**
	 * Abstract method that subclasses must implement to setup the specific geometry/content.
	 * @param scene The Babylon.js scene to setup geometry in
	 */
	protected abstract setupGeometry(scene: Scene): Promise<void>;

	/**
	 * Starts the render loop.
	 */
	protected startRenderLoop(): void {
		if (this.engine && this.scene) {
			this.engine.runRenderLoop(() => {
				this.scene!.render();
			});
		}
	}

	/**
	 * Stops the render loop and disposes resources.
	 */
	protected dispose(): void {
		if (this.engine) {
			this.engine.stopRenderLoop();
		}
		if (this.scene) {
			this.scene.dispose();
		}
		if (this.engine) {
			this.engine.dispose();
		}
		this.engine = null;
		this.scene = null;
		this.canvas = null;
	}

	/**
	 * Captures the current canvas content as a base64 image.
	 * @param targetWidth The target width for the captured image
	 * @param targetHeight The target height for the captured image
	 * @returns Base64 encoded image data
	 */
	protected captureThumbnail(targetWidth: number = 256, targetHeight: number = 256): string | null {
		if (!this.canvas || !this.engine) {
			return null;
		}

		// Create a temporary canvas for resizing
		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = targetWidth;
		tempCanvas.height = targetHeight;
		const tempCtx = tempCanvas.getContext("2d");

		if (!tempCtx) {
			return null;
		}

		// Draw the current canvas content to the temp canvas with resizing
		tempCtx.drawImage(this.canvas, 0, 0, targetWidth, targetHeight);

		// Convert to base64
		return tempCanvas.toDataURL("image/png");
	}
}
