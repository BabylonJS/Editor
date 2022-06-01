import { join } from "path";

import { Engine, Scene, SceneLoaderFlags, SceneLoader } from "babylonjs";

import "babylonjs-loaders";
import "babylonjs-materials";
import "babylonjs-procedural-textures";

import { PlayOverride } from "./override";

export default class Play {
	private _engine: Engine;
	private _scene: Scene;

	/**
	 * Constructor.
	 * @param rootUrl 
	 */
	public constructor(public workspaceDir: string, public outputSceneDirectory, public projectName: string, public physicsEngine: string) {
		this._engine = new Engine(document.getElementById("renderCanvas") as HTMLCanvasElement, true);
		this._scene = new Scene(this._engine);

		this._bindEvents();
		this._load();
	}

	/**
	* Loads the first scene.
	*/
	private _load(): void {
		PlayOverride.OverrideEngineFunctions(this.workspaceDir);

		const rootUrl = join(this.workspaceDir, "assets/");

		switch (this.physicsEngine) {
			case "cannon":
				window["CANNON"] = require("cannon");
				break;
			case "oimo":
				window["OIMO"] = require("babylonjs/Oimo.js");
				break;
			case "ammo":
				window["Ammo"] = require(join(__dirname, "../../../../html/libs/ammo.js"));
				break;
		}

		SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;

		const filename = join("../", this.outputSceneDirectory,  `scenes/${this.projectName}/scene.babylon`);
		SceneLoader.Append(rootUrl, filename, this._scene, () => {
			this._scene.executeWhenReady(() => {
				this._run(rootUrl);
			});
		}, undefined, (_, message, e) => {
			console.error(message);
			console.error(e);
		}, "babylon");
	}

	/**
	 * Runs the game.
	 */
	private _run(rootUrl: string): void {
		// Attach camera.
		if (!this._scene.activeCamera) {
			throw new Error("No camera defined in the scene. Please add at least one camera in the project or create one yourself in the code.");
		}
		this._scene.activeCamera.attachControl(this._engine.getRenderingCanvas(), false);

		// Run the scene to attach scripts etc.
		const sceneTools = require(join(this.workspaceDir, "build/src/scenes/tools.js"));
		sceneTools.runScene(this._scene, rootUrl);

		// Render.
		this._engine.runRenderLoop(() => {
			try {
				this._scene.render();
			} catch (e) {
				console.error(e);
				parent.postMessage({ error: e.message }, undefined!);

				this._engine.stopRenderLoop();
			}
		});
	}

	/**
	 * Binds the required events for a full experience.
	 */
	private _bindEvents(): void {
		window.addEventListener("resize", () => this._engine.resize());
	}
}
