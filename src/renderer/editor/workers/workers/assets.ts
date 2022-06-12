import "../../../module";

import { basename, dirname, join } from "path";
import { createReadStream, pathExists, readJSON } from "fs-extra";

import { IStringDictionary, Nullable } from "../../../../shared/types";

import {
	Engine, Scene, SceneLoader, TargetCamera, Vector3, CubeTexture, Color3,
	DirectionalLight, ShadowGenerator, Mesh, Material, Tools as BabylonTools,
} from "babylonjs";

import { GridMaterial } from "babylonjs-materials";
import "babylonjs-loaders";

import { Tools } from "../../tools/tools";

import { FBXLoader } from "../../loaders/fbx/loader";

export default class AssetsWorker {
	private _scene: Scene;
	private _engine: Engine;
	private _camera: TargetCamera;

	private _ground: Mesh;

	private _light: DirectionalLight;
	private _shadowGenerator: ShadowGenerator;

	private _isBusy: boolean = false;

	private _workspaceDir: Nullable<string> = null;
	private _cachedPreviews: IStringDictionary<string> = {};

	/**
	 * Constructor.
	 * @param canvas defines the reference to the canvas used to render the scene.
	 */
	public constructor(canvas: HTMLCanvasElement) {
		this._engine = new Engine(canvas, true, {
			stencil: true,
			antialias: true,
			audioEngine: false,
			preserveDrawingBuffer: true,
			disableWebGL2Support: false,
			useHighPrecisionFloats: true,
			powerPreference: "high-performance",
			failIfMajorPerformanceCaveat: false,
		});

		this._scene = new Scene(this._engine);
		this._scene.ambientColor.set(1, 1, 1);
		this._scene.clearColor.set(0, 0, 0, 1);

		this._camera = new TargetCamera("AssetsWorkerCamera", Vector3.Zero(), this._scene, true);
		this._camera.minZ = 0.1;

		// Light
		this._light = new DirectionalLight("AssetsWorkerDirectionalLight", Vector3.Zero(), this._scene);
		this._shadowGenerator = new ShadowGenerator(1024, this._light, false);

		// Environment
		const environmentTexture = CubeTexture.CreateFromPrefilteredData("../../../../../assets/textures/parking.env", this._scene);
		this._scene.environmentTexture = environmentTexture;

		// Ground
		this._ground = Mesh.CreateGround("AssetsWorkerGround", 1, 1, 1, this._scene, false);
		this._ground.receiveShadows = true;

		// Ground material
		const groundMaterial = new GridMaterial("AssetsWorkerGridMaterial", this._scene);
		groundMaterial.opacity = 0.4;
		groundMaterial.majorUnitFrequency = 6;
		groundMaterial.minorUnitVisibility = 0.43;
		groundMaterial.gridRatio = 0.5;
		groundMaterial.mainColor = new Color3(0.35, 0.35, 0.35);
		groundMaterial.lineColor = new Color3(1, 1, 1);
		groundMaterial.backFaceCulling = false;
		this._ground.material = groundMaterial;

		// Loaders
		SceneLoader.RegisterPlugin(new FBXLoader(false));
	}

	/**
	 * Returns the current cache JSON data.
	 */
	public async getCache(): Promise<IStringDictionary<string>> {
		if (this._workspaceDir) {
			const keys = Object.keys(this._cachedPreviews);

			await Promise.all(keys.map(async (k) => {
				const exists = await pathExists(join(this._workspaceDir!, "assets", k));
				if (!exists) {
					delete this._cachedPreviews[k];
				}
			}));
		}

		return this._cachedPreviews;
	}

	/**
	 * Sets the previously saved cache JSON representation.
	 * @param cache defines the reference to the previously saved cache.
	 */
	public setCache(cache: IStringDictionary<string>): void {
		this._cachedPreviews = cache;
	}

	/**
	 * Sets the workspace path.
	 * @param path defines the absolute path to the workspace.
	 */
	public setWorkspacePath(path: string): void {
		this._workspaceDir = path;
	}

	/**
	 * Deletes the given key from the cache.
	 * @param key defines the key in the cache to delete.
	 */
	public deleteFromCache(key: string): void {
		if (this._cachedPreviews[key]) {
			delete this._cachedPreviews[key];
		}
	}

	/**
	 * Loads the material located at the given absolute path and returns its preview image.
	 * @param relativePath defines the relative path to the material file.
	 * @param absolutePath defines the absolute path to the material file.
	 * @param rootUrl defines the rootUrl the files are relative to.
	 */
	public async createMaterialPreview(relativePath: string, absolutePath: string, rootUrl: string): Promise<string> {
		if (this._cachedPreviews[relativePath]) {
			return this._cachedPreviews[relativePath];
		}

		await this._waitQueue();

		if (this._cachedPreviews[relativePath]) {
			return this._cachedPreviews[relativePath];
		}

		this._isBusy = true;

		let parsedData: any;
		let result: string;

		try {
			parsedData = await readJSON(absolutePath, { encoding: "utf-8" });

			if (parsedData.customType === "BABYLON.NodeMaterial") {
				rootUrl = undefined!;
			}

			let material: Nullable<Material> = null;
			if (parsedData.metadata?.sourcePath && this._workspaceDir) {
				const jsPath = Tools.GetSourcePath(this._workspaceDir, parsedData.metadata.sourcePath);

				delete require.cache[jsPath];
				const exports = require(jsPath);
				material = exports.default.Parse(parsedData, this._scene, rootUrl);
			} else {
				material = Material.Parse(parsedData, this._scene, rootUrl);
			}

			const sphere = Mesh.CreateSphere("AssetsWorkerSphere", 32, 10, this._scene, false);
			sphere.material = material;

			await this._waitPendingData();

			this._shadowGenerator.addShadowCaster(sphere, false);
			this._setupDecoration();

			this._scene.render();

			this._shadowGenerator.removeShadowCaster(sphere, false);

			material?.dispose(true, true);
			sphere.dispose(true, false);

			result = await this._convertCanvasToBase64();

			this._cachedPreviews[relativePath] = result;
		} catch (e) {
			result = "";
		}

		this._isBusy = false;

		return result;
	}

	/**
	 * Loads the scene located at the given absolute path and returns its preview image.
	 * @param relativePath defines the relative path to the scene file.
	 * @param absolutePath defines the absolute path to the scene file.
	 */
	public async createScenePreview(relativePath: string, absolutePath: string): Promise<string> {
		if (this._cachedPreviews[relativePath]) {
			return this._cachedPreviews[relativePath];
		}

		await this._waitQueue();

		if (this._cachedPreviews[relativePath]) {
			return this._cachedPreviews[relativePath];
		}

		this._isBusy = true;

		try {
			const rootUrl = join(dirname(absolutePath), "/");
			const filename = basename(absolutePath);

			const container = await SceneLoader.LoadAssetContainerAsync(rootUrl, filename, this._scene);
			container.addAllToScene();

			await this._waitPendingData();

			this._setupDecoration();

			container.meshes.forEach((m) => {
				this._shadowGenerator.addShadowCaster(m, false);
			});

			this._scene.render();

			container.meshes.forEach((m) => {
				this._shadowGenerator.removeShadowCaster(m);
			});

			container.removeAllFromScene();
			container.materials.forEach((m) => m.dispose(true, true));

			container.dispose();
		} catch (e) {
			// Catch silently.
		}

		const result = await this._convertCanvasToBase64();

		this._isBusy = false;
		this._cachedPreviews[relativePath] = result;

		return result;
	}

	/**
	 * Checks wether or not the given texture has alpha channel and distinct alpha values.
	 * @param texturePath defines the absolute path to the texture to check.
	 */
	public textureHasAlpha(texturePath: string): Promise<boolean> {
		const { PNG } = require("pngjs");
		return new Promise<boolean>((resolve, reject) => {
			const stream = createReadStream(texturePath);
			stream.pipe(new PNG())
				.on("metadata", (m) => {
					resolve(m.alpha === true);
					stream.close();
				})
				.on("error", (err) => {
					reject(err);
					stream.close();
				});
		});
	}

	/**
	 * Waits the current queue.
	 */
	private async _waitQueue(): Promise<void> {
		while (this._isBusy) {
			await Tools.Wait(100);
		}
	}

	/**
	 * Waits until all pending data are loaded.
	 */
	private _waitPendingData(): Promise<void> {
		return new Promise<void>(async (resolve, reject) => {
			const timeoutId = setTimeout(async () => {
				reject();
			}, 10000);

			while (this._scene._pendingData.length) {
				await Tools.Wait(100);
			}

			this._scene.executeWhenReady(() => {
				clearTimeout(timeoutId);
				resolve();
			});
		});
	}

	/**
	 * Setups decoration for the scene to render (light, ground, etc.).
	 */
	private _setupDecoration(): void {
		const minimum = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
		const maximum = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

		this._scene.meshes.forEach((d) => {
			if (d === this._ground) {
				return;
			}

			const scaling = Vector3.Zero();
			const translation = Vector3.Zero();
			d.getWorldMatrix().decompose(scaling, undefined, translation);

			translation.divideInPlace(scaling);
			
			const bMinimum = d.getBoundingInfo()?.minimum.add(translation).multiply(scaling);
			const bMaximum = d.getBoundingInfo()?.maximum.add(translation).multiply(scaling);

			if (!bMinimum || !bMaximum) { return; }

			maximum.x = Math.max(bMaximum.x, maximum.x);
			maximum.y = Math.max(bMaximum.y, maximum.y);
			maximum.z = Math.max(bMaximum.z, maximum.z);

			minimum.x = Math.min(bMinimum.x, minimum.x);
			minimum.y = Math.min(bMinimum.y, minimum.y);
			minimum.z = Math.min(bMinimum.z, minimum.z);
		});

		const center = Vector3.Center(minimum, maximum);
		const distance = Vector3.Distance(minimum, maximum) * 0.5;

		this._camera.position = center.add(new Vector3(distance, distance, distance));
		this._camera.setTarget(center);

		this._light.position.copyFrom(maximum);
		this._light.setDirectionToTarget(center);

		const maxGroundValue = Math.max(
			(maximum.x - minimum.x) * 10,
			(maximum.z - minimum.z) * 10,
		);

		this._ground.position.y = minimum.y;
		this._ground.scaling.setAll(maxGroundValue);
	}

	/**
	 * Converts the current canvas blob result to a readable object Url.
	 */
	private async _convertCanvasToBase64(): Promise<string> {
		const canvas = this._engine.getRenderingCanvas() as unknown as OffscreenCanvas;

		const blob = await canvas.convertToBlob({ type: "image/png" });
		return new Promise<string>((resolve) => {
			BabylonTools.ReadFileAsDataURL(blob, (d) => resolve(d), null!);
		});
	}
}
