import { join } from "path";

import { Engine, Scene, SceneLoaderFlags, SceneLoader } from "babylonjs";

import "babylonjs-loaders";
import "babylonjs-materials";
import "babylonjs-procedural-textures";

export default class Play {
	private _engine: Engine;
	private _scene: Scene;

	/**
	 * Constructor.
	 * @param rootUrl 
	 */
	public constructor(public workspaceDir: string, public projectName: string) {
		this._engine = new Engine(document.getElementById("renderCanvas") as HTMLCanvasElement, true);
		this._scene = new Scene(this._engine);

		this._bindEvents();
		this._load();
	}

	/**
	* Loads the first scene.
	*/
	private _load(): void {
		const rootUrl = join(this.workspaceDir, "scenes", this.projectName, "/");

		SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;
		SceneLoader.Append(rootUrl, "scene.babylon", this._scene, () => {
			this._scene.executeWhenReady(() => {
				// Attach camera.
				if (!this._scene.activeCamera) {
					throw new Error("No camera defined in the scene. Please add at least one camera in the project or create one yourself in the code.");
				}
				this._scene.activeCamera.attachControl(this._engine.getRenderingCanvas(), false);

				// Run the scene to attach scripts etc.
				const sceneTools = require(join(this.workspaceDir, "build/src/scenes", this.projectName, "index.js"));
				sceneTools.runScene(this._scene, rootUrl);

				// Render.
				this._engine.runRenderLoop(() => this._scene.render());
			});
		}, undefined, (_, message) => {
			console.error(message);
		}, "babylon");
	}

	/**
	 * Binds the required events for a full experience.
	 */
	private _bindEvents(): void {
		window.addEventListener("resize", () => this._engine.resize());
	}
}
