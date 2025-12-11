import { join, dirname, basename } from "path/posix";

import { ISceneLoaderPluginAsync, ISceneLoaderPluginExtensions, ISceneLoaderProgressEvent, ISceneLoaderAsyncResult, Scene, AssetContainer } from "babylonjs";

import { waitUntil } from "../tools/tools";
import { ipcSendAsyncWithMessageId } from "../tools/ipc";

import { parseNodes } from "./node";
import { writeTexture } from "./texture";
import { parseMaterial } from "./material";
import { parseAnimations } from "./animation";
import { AssimpJSRuntime, IAssimpJSRootData } from "./types";

export class AssimpJSLoader implements ISceneLoaderPluginAsync {
	public name: string = "Babylon.js Editor AssimpJS Loader";

	public extensions: ISceneLoaderPluginExtensions = {
		".x": {
			isBinary: true,
		},
		".fbx": {
			isBinary: true,
		},
		".3ds": {
			isBinary: true,
		},
		".stl": {
			isBinary: true,
		},
		".dae": {
			isBinary: true,
		},
		".b3d": {
			isBinary: true,
		},
		".ms3d": {
			isBinary: true,
		},
		".lwo": {
			isBinary: true,
		},
		".dxf": {
			isBinary: true,
		},
	};

	public constructor(private _useWorker: boolean) {}

	/**
	 * Import meshes into a scene.
	 * @param meshesNames An array of mesh names, a single mesh name, or empty string for all meshes that filter what meshes are imported
	 * @param scene The scene to import into
	 * @param data The data to import
	 * @param rootUrl The root url for scene and resources
	 * @param onProgress The callback when the load progresses
	 * @param fileName Defines the name of the file to load
	 * @returns The loaded objects (e.g. meshes, particle systems, skeletons, animation groups, etc.)
	 */
	public async importMeshAsync(
		meshesNames: any,
		scene: Scene,
		data: any,
		rootUrl: string,
		onProgress?: (event: ISceneLoaderProgressEvent) => void,
		fileName?: string
	): Promise<ISceneLoaderAsyncResult> {
		// Compute meshes names to import
		if (meshesNames) {
			meshesNames = Array.isArray(meshesNames) ? meshesNames : [meshesNames];
		}

		meshesNames ??= [];

		const container = await this.loadAssetContainerAsync(scene, data, rootUrl, onProgress, fileName);
		container.addAllToScene();

		return {
			spriteManagers: [],
			lights: container.lights,
			meshes: container.meshes,
			skeletons: container.skeletons,
			geometries: container.geometries,
			transformNodes: container.transformNodes,
			animationGroups: container.animationGroups,
			particleSystems: container.particleSystems,
		};
	}

	/**
	 * Load into a scene.
	 * @param scene The scene to load into.
	 * @param data The data to import.
	 * @param rootUrl The root url for scene and resources.
	 * @param onProgress The callback when the load progresses.
	 * @param fileName Defines the name of the file to load.
	 */
	public async loadAsync(scene: Scene, data: any, rootUrl: string, onProgress?: (event: ISceneLoaderProgressEvent) => void, fileName?: string): Promise<void> {
		const container = await this.loadAssetContainerAsync(scene, data, rootUrl, onProgress, fileName);
		container.addAllToScene();
	}

	/**
	 * Load into an asset container.
	 * @param scene The scene to load into
	 * @param data The data to import
	 * @param rootUrl The root url for scene and resources
	 * @param onProgress The callback when the load progresses
	 * @param fileName Defines the name of the file to load
	 * @returns The loaded asset container
	 */
	public async loadAssetContainerAsync(
		scene: Scene,
		data: IAssimpJSRootData[],
		rootUrl: string,
		_?: (event: ISceneLoaderProgressEvent) => void,
		fileName?: string
	): Promise<AssetContainer> {
		const container = new AssetContainer(scene);

		const absolutePath = join(rootUrl, fileName ?? "");

		if (this._useWorker) {
			data = await ipcSendAsyncWithMessageId<IAssimpJSRootData[]>("editor:load-model", absolutePath, data);
		} else {
			data = await this._locallyLoadFile(absolutePath, data);
		}

		scene._blockEntityCollection = true;

		data.forEach((d) => {
			const runtime: AssimpJSRuntime = {
				data: d,
				scene,
				container,
				materials: {},
				geometries: {},
				rootUrl: fileName ? rootUrl : dirname(rootUrl),
			};

			this._parseRoot(runtime);
		});

		scene._blockEntityCollection = false;
		return container;
	}

	private _parseRoot(runtime: AssimpJSRuntime): void {
		// Materials
		runtime.data.materials?.forEach((m, materialIndex) => {
			runtime.materials[materialIndex] = parseMaterial(runtime, m);
		});

		// Textures
		runtime.data.textures?.forEach((t) => {
			writeTexture(runtime, t);
		});

		parseNodes(runtime, [runtime.data.rootnode], null);
		parseAnimations(runtime);
	}

	public appPath: string = "";

	private _assimpjs: any;
	private async _locallyLoadFile(absolutePath: string, data: any): Promise<IAssimpJSRootData[]> {
		if (!this._assimpjs) {
			const assimpjs = require("assimpjs");
			const nodeModules = process.env.DEBUG ? "../node_modules" : "node_modules";
			const wasmPath = join(this.appPath, nodeModules, "assimpjs/dist");

			this._assimpjs = await assimpjs({
				locateFile: (file) => {
					return join(wasmPath, file);
				},
			});
		} else {
			await waitUntil(() => this._assimpjs);
		}

		const fileList = new this._assimpjs.FileList();
		fileList.AddFile(basename(absolutePath), new Uint8Array(data));

		const result = this._assimpjs.ConvertFileList(fileList, "assjson");
		if (!result.IsSuccess() || result.FileCount() === 0) {
			console.log(result.GetErrorCode());
		}

		const files: string[] = [];
		for (let i = 0; i < result.FileCount(); ++i) {
			const decoded = new TextDecoder().decode(result.GetFile(i).GetContent());
			files.push(decoded);
		}

		return files.map((f) => JSON.parse(f));
	}
}
