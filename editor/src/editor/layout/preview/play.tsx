import { ipcRenderer } from "electron";
import { join as nativeJoin } from "path";
import { watch, FSWatcher } from "chokidar";
import { basename, dirname, join } from "path/posix";

import { Component, ReactNode } from "react";

import { toast } from "sonner";
import { Grid } from "react-loader-spinner";

import { IoPlay, IoStop, IoRefresh } from "react-icons/io5";

import { Scene, Vector3, HavokPlugin } from "babylonjs";
import {
	setDefaultRenderingPipelineRef,
	setMotionBlurPostProcessRef,
	setSSAO2RenderingPipelineRef,
	setSSRRenderingPipelineRef,
	setTAARenderingPipelineRef,
	setVLSPostProcessRef,
} from "babylonjs-editor-tools";

import { Badge } from "../../../ui/shadcn/ui/badge";
import { Button } from "../../../ui/shadcn/ui/button";

import { ensureTemporaryDirectoryExists } from "../../../tools/project";

import { compileScript } from "../../../tools/compile";
import { setUndoRedoEnabled } from "../../../tools/undoredo";
import { wait, waitNextAnimationFrame } from "../../../tools/tools";
import { forceCompileAllSceneMaterials } from "../../../tools/scene/materials";
import { applyOverrides, restorePlayOverrides } from "../../../tools/scene/play/override";

import { exportProject } from "../../../project/export/export";
import { projectConfiguration } from "../../../project/configuration";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/shadcn/ui/tooltip";

import { Editor } from "../../main";

export interface IEditorPreviewPlayComponentProps {
	/**
	 * The editor reference.
	 */
	editor: Editor;
	/**
	 * Defines wether or not the play button is enabled in the preview.
	 */
	enabled: boolean;

	/**
	 * Called on the user wants to restart the game / application (aka. refresh the page of the game / application).
	 */
	onRestart: () => void;
}

export interface IEditorPreviewPlayComponentState {
	/**
	 * Defines wether or not the player is being prepared.
	 */
	preparingPlay: boolean;
	/**
	 * Defines wether or not the game / application is currently loading.
	 */
	loading: boolean;
	/**
	 * Defines wether or not the game / application is playing in the editor.
	 */
	playing: boolean;

	currentFPS: number;
	activeMeshes: number;
	totalMeshes: number;
}

export class EditorPreviewPlayComponent extends Component<IEditorPreviewPlayComponentProps, IEditorPreviewPlayComponentState> {
	/**
	 * Defines the reference to the scene that is reserved for the game / application when playing.
	 * This scene is used to be renderer directly in the preview panel of the editor and is disposed when the
	 * game / application is stopped.
	 */
	public scene: Scene | null = null;

	private _srcWatcher: FSWatcher | null = null;
	private _temporaryDirectory: string | null = null;

	private _compiledScriptExports: any = null;

	private _intervalId: number | null = null;

	public constructor(props: IEditorPreviewPlayComponentProps) {
		super(props);

		this.state = {
			playing: false,
			loading: false,
			preparingPlay: false,

			currentFPS: 0,
			activeMeshes: 0,
			totalMeshes: 0,
		};
	}

	public render(): ReactNode {
		return (
			<TooltipProvider>
				<div className="flex justify-between items-center w-full">
					<div className="flex gap-2 items-center">
						{this.state.playing && (
							<>
								<Badge variant="default">FPS {this.state.currentFPS}</Badge>
								<Badge variant="secondary">Active Meshes {this.state.activeMeshes}</Badge>
								<Badge variant="secondary">Total Meshes {this.state.totalMeshes}</Badge>
							</>
						)}
					</div>

					<div className="flex gap-2 items-center">
						{this.state.playing && !this.state.preparingPlay && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										onClick={() => this.props.onRestart()}
										className="h-9 py-0 px-2 aspect-square bg-background !rounded-lg transition-all duration-300 ease-in-out"
									>
										<IoRefresh className="w-6 h-6" strokeWidth={1} color="red" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Restart the game / application</TooltipContent>
							</Tooltip>
						)}

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="outline"
									onClick={() => this.playOrStopApplication()}
									disabled={this.state.preparingPlay || !this.props.enabled}
									className={`
										flex gap-2 items-center h-9 py-0 px-3 border-input bg-background shadow-sm
										${this.state.preparingPlay || !this.props.enabled ? `bg-muted/50 ${!this.props.enabled && "opacity-35"}` : this.state.playing ? "hover:!bg-red-500/35" : "hover:!bg-green-500/35"}
										transition-all duration-300 ease-in-out
									`}
								>
									{this.state.preparingPlay ? (
										<Grid width={24} height={24} color="gray" />
									) : this.state.playing ? (
										<>
											<IoStop className="w-6 h-6 fill-red-500" strokeWidth={1} /> Stop
										</>
									) : (
										<>
											<IoPlay className="w-6 h-6 fill-green-500" strokeWidth={1} /> Play
										</>
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent className="flex gap-2 items-center">
								{this.props.enabled ? "Play the scene" : "Can't play the scene now. Dependencies are still installing..."}
							</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</TooltipProvider>
		);
	}

	public componentDidMount(): void {
		ipcRenderer.on("preview:play-scene", () => {
			this.triggerPlayScene();
		});
	}

	public triggerPlayScene(): void {
		if (this.state.playing) {
			this.props.onRestart();
		} else if (!this.state.preparingPlay) {
			this.playOrStopApplication();
		}
	}

	public componentDidUpdate(_: Readonly<IEditorPreviewPlayComponentProps>, prevState: Readonly<IEditorPreviewPlayComponentState>): void {
		if (prevState !== this.state) {
			this.props.editor.layout.preview.forceUpdate();
			this.props.editor.layout.preview.gizmo._gizmosLayer.pickingEnabled = this.scene ? false : true;
		}
	}

	/**
	 * Gets wether or not everything is ready to play the current scene of the game / application.
	 */
	public get canPlayScene(): boolean {
		return this.state.playing && !this.state.preparingPlay && !this.state.loading;
	}

	/**
	 * Sets the game / application to play or stop.
	 * If the game / application is not playing, it will start it.
	 * If the game / application is playing, it will stop it.
	 */
	public async playOrStopApplication(): Promise<void> {
		if (this.state.playing) {
			this.stop();
		} else {
			await this.play();
		}
	}

	/**
	 * Restarts the game / application.
	 * This will just clean the current scene instance (event receivers, etc.) and reload the same scene.
	 */
	public async restart(): Promise<void> {
		if (!this.state.playing) {
			return;
		}

		this._clearInterval();

		this.scene?.dispose();
		this.scene = null;

		restorePlayOverrides(this.props.editor);

		this.props.editor.layout.preview.engine.wipeCaches(true);

		this.setState({
			loading: true,
		});

		this.props.editor.layout.preview.setState({
			playSceneLoadingProgress: 0,
		});

		// TODO: find why we need to wait before starting the loading
		// Try it: play scene, restart it and then stop it. The edited scene in "edit mode" will be full of glitches.
		await wait(150);

		await this._createAndLoadScene();
	}

	/**
	 * Stops the game / application.
	 * It will dispose the scene and reset the state.
	 */
	public stop(): void {
		setUndoRedoEnabled(true);

		this._clearInterval();

		this.scene?.dispose();
		this.scene = null;

		restorePlayOverrides(this.props.editor);

		this.props.editor.layout.graph.setState({
			isLoading: false,
		});
		this.props.editor.layout.graph.setPlayScene(null);
		this.props.editor.layout.preview.engine.wipeCaches(true);

		this.setState({
			playing: false,
			loading: false,
			preparingPlay: false,
		});

		this.props.editor.layout.preview.setState({
			pickingEnabled: true,
			playSceneLoadingProgress: 0,
		});

		this.props.editor.layout.preview.scene.activeCamera?.attachControl(true);

		this._closeWatchSrcDirectory();
	}

	/**
	 * Starts the game / application.
	 * The play process consists on:
	 * - the exporting the final scene without optimizations (to save export time)
	 * - compiling the scripts map using esbuild (located at projectAbsoluteDir/src/scripts.ts)
	 * - store the output of esbuild and put it in the temporary directory of the project (.bjseditor folder)
	 * - require the compiled script and use babylonjs-editor-tools to render the scene.
	 */
	public async play(noExportScene?: boolean, noCompile?: boolean): Promise<void> {
		if (this.state.playing) {
			return;
		}

		this.setState({
			playing: true,
			preparingPlay: true,
		});

		this.props.editor.layout.preview.setState({
			pickingEnabled: false,
		});

		this.props.editor.layout.preview.scene.activeCamera?.detachControl();

		this._temporaryDirectory ??= await ensureTemporaryDirectoryExists(projectConfiguration.path!);

		if (!noExportScene) {
			// Export first as src/scripts.ts may change during the export.
			await exportProject(this.props.editor, {
				optimize: false,
				debugMode: true,
				noProgress: true,
			});
		}

		if (!noCompile) {
			// Once exported, the src/scripts.ts file is updated and can be compiled.
			await this._compileScripts();
		}

		await waitNextAnimationFrame();

		if (!this.state.playing) {
			return; // In case the user stopped the play while preparing it
		}

		this.setState({
			preparingPlay: false,
		});

		await this._createAndLoadScene();

		this._watchSrcDirectory();
	}

	/**
	 * The script that is required and executed is a bundled version of the "src/scripts.ts" file.
	 * Here we use esbuild to bundle the scripts and transform the imports to use the correct paths.
	 * @see compileScript for more information.
	 */
	private async _compileScripts(): Promise<boolean> {
		const log = await this.props.editor.layout.console.progress("Compiling scripts...");

		try {
			await compileScript({
				entryPoints: [join(dirname(projectConfiguration.path!), "src/scripts.ts")],
				outfile: join(this._temporaryDirectory!, "play/script.cjs"),
				onTransformSource: (path) =>
					log.setState({
						message: `Compiling source: ${basename(path)}`,
					}),
			});

			log.setState({
				done: true,
				message: "Scripts compiled",
			});

			return true;
		} catch (e) {
			console.error("Failed to compile play scripts:", e);
			if (e instanceof Error) {
				this.props.editor.layout.console.error(`Failed to compile play scripts:\n${e.message}`);
			}

			log.setState({
				error: true,
				message: "Failed to compile scripts",
			});

			return false;
		}
	}

	private async _createAndLoadScene(): Promise<void> {
		this.setState({
			loading: true,
		});

		applyOverrides(this.props.editor);

		this._requireCompiledScripts();

		const scene = new Scene(this.props.editor.layout.preview.engine);
		scene.enablePhysics(new Vector3(0, -981, 0), new HavokPlugin());

		this.scene = scene;
		this.props.editor.layout.graph.setState({
			isLoading: true,
		});

		const projectDir = dirname(projectConfiguration.path!);
		const rootUrl = join(projectDir, "public", "scene", "/");

		const sceneName = basename(this.props.editor.state.lastOpenedScenePath!).split(".").shift()!;

		try {
			await this._compiledScriptExports.loadScene(rootUrl, `${sceneName}.babylon`, scene, this._compiledScriptExports.scriptsMap, {
				quality: "high",
				onProgress: (progress: number) =>
					this.props.editor.layout.preview.setState({
						playSceneLoadingProgress: progress,
					}),
			});

			setVLSPostProcessRef(this._compiledScriptExports.getVLSPostProcess());
			setSSRRenderingPipelineRef(this._compiledScriptExports.getSSRRenderingPipeline());
			setTAARenderingPipelineRef(this._compiledScriptExports.getTAARenderingPipeline());
			setMotionBlurPostProcessRef(this._compiledScriptExports.getMotionBlurPostProcess());
			setSSAO2RenderingPipelineRef(this._compiledScriptExports.getSSAO2RenderingPipeline());
			setDefaultRenderingPipelineRef(this._compiledScriptExports.getDefaultRenderingPipeline());
		} catch (e) {
			console.error(e);
			toast.error("Failed to load scene. Check the console for more information.");

			if (!scene.isDisposed) {
				this.props.editor.layout.selectTab("console");
				this.props.editor.layout.console.error(`Failed to load scene: ${(e as Error).message}`);
				return this.stop();
			}
		}

		if (scene.isDisposed) {
			return; // scene may be disposed if the user stopped the play while loading it
		}

		scene.activeCamera?.attachControl(true);

		await forceCompileAllSceneMaterials(scene);

		setUndoRedoEnabled(false);

		this.props.editor.layout.graph.setState({
			isLoading: false,
		});

		this.props.editor.layout.graph.setPlayScene(scene);
		this.props.editor.layout.inspector.setEditedObject(scene);
		this.props.editor.layout.animations.setEditedObject(scene);

		this.setState({
			loading: false,
		});

		this._intervalId = window.setInterval(() => {
			this.setState({
				currentFPS: scene.getEngine().getFps() >> 0,
				activeMeshes: scene.getActiveMeshes().length,
				totalMeshes: scene.meshes.length,
			});
		}, 1000);
	}

	private _requireCompiledScripts(): void {
		const scriptPath = join(this._temporaryDirectory!, "play/script.cjs");
		this._compiledScriptExports = require(scriptPath);
		delete require.cache[nativeJoin(scriptPath)];
	}

	private _clearInterval(): void {
		if (this._intervalId !== null) {
			clearInterval(this._intervalId);
			this._intervalId = null;
		}
	}

	/**
	 * Watches all the src directory of the project to detect changes in the scripts.
	 * If a change is detected, it will restart the game / application.
	 * TODO: change only those one that changed.
	 */
	private _watchSrcDirectory(): void {
		if (this._srcWatcher || !projectConfiguration.path) {
			return;
		}

		const srcPath = join(dirname(projectConfiguration.path), "src");

		this._srcWatcher = watch(srcPath, {
			persistent: false,
			ignoreInitial: true,
		});

		this._srcWatcher.on("change", async (path) => {
			if (this.canPlayScene) {
				this.props.editor.layout.console.log(`Detected change in ${path}, restarting play...`);
				await this._compileScripts();
				await this.restart();
			}
		});
	}

	private _closeWatchSrcDirectory(): void {
		this._srcWatcher?.close();
		this._srcWatcher = null;
	}
}
