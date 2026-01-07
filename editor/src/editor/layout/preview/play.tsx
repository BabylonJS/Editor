import { ipcRenderer } from "electron";
import { join as nativeJoin } from "path";
import { watch, FSWatcher } from "chokidar";
import { basename, dirname, join } from "path/posix";

import { Button } from "@blueprintjs/core";
import { Component, ReactNode } from "react";

import { Grid } from "react-loader-spinner";

import { IoPlay, IoStop, IoRefresh } from "react-icons/io5";

import { Scene, Vector3, HavokPlugin } from "babylonjs";

import { ensureTemporaryDirectoryExists } from "../../../tools/project";

import { wait, waitNextAnimationFrame } from "../../../tools/tools";
import { compilePlayScript } from "../../../tools/scene/play/compile";
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

	public constructor(props: IEditorPreviewPlayComponentProps) {
		super(props);

		this.state = {
			playing: false,
			loading: false,
			preparingPlay: false,
		};
	}

	public render(): ReactNode {
		return (
			<TooltipProvider>
				{this.state.playing && !this.state.preparingPlay && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								minimal
								onClick={() => this.props.onRestart()}
								icon={<IoRefresh className="w-6 h-6" strokeWidth={1} color="red" />}
								className="w-10 h-10 bg-muted/50 !rounded-lg transition-all duration-300 ease-in-out"
							/>
						</TooltipTrigger>
						<TooltipContent>Restart the game / application</TooltipContent>
					</Tooltip>
				)}

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							minimal
							active={this.state.playing}
							disabled={this.state.preparingPlay || !this.props.enabled}
							icon={
								this.state.preparingPlay ? (
									<Grid width={24} height={24} color="gray" />
								) : this.state.playing ? (
									<IoStop className="w-6 h-6" strokeWidth={1} color="red" />
								) : (
									<IoPlay className="w-6 h-6" strokeWidth={1} color="green" />
								)
							}
							onClick={() => this.playOrStopApplication()}
							className={`
                                w-10 h-10 bg-muted/50 !rounded-lg
                                ${this.state.preparingPlay || !this.props.enabled ? `bg-muted/50 ${!this.props.enabled && "opacity-35"}` : this.state.playing ? "!bg-red-500/35" : "hover:!bg-green-500/35"}
                                transition-all duration-300 ease-in-out
                            `}
						/>
					</TooltipTrigger>
					<TooltipContent className="flex gap-2 items-center">
						{this.props.enabled ? "Play the game / application" : "Can't play the game now. Dependencies are still installing..."}
					</TooltipContent>
				</Tooltip>
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
		restorePlayOverrides(this.props.editor);

		this.scene?.dispose();
		this.scene = null;

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
	 * @see compilePlayScript for more information.
	 */
	private async _compileScripts(): Promise<boolean> {
		const log = await this.props.editor.layout.console.progress("Compiling scripts...");

		try {
			await compilePlayScript(this._temporaryDirectory!, {
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

		const projectDir = dirname(projectConfiguration.path!);
		const rootUrl = join(projectDir, "public", "scene", "/");

		const sceneName = basename(this.props.editor.state.lastOpenedScenePath!).split(".").shift()!;

		try {
			await this._compiledScriptExports.loadScene(rootUrl, `${sceneName}.babylon`, scene, this._compiledScriptExports.scriptsMap, {
				quality: "high",
				onProgress: (progress) =>
					this.props.editor.layout.preview.setState({
						playSceneLoadingProgress: progress,
					}),
			});
		} catch (e) {
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

		this.setState({
			loading: false,
		});
	}

	private _requireCompiledScripts(): void {
		const scriptPath = join(this._temporaryDirectory!, "play/script.cjs");
		this._compiledScriptExports = require(scriptPath);
		delete require.cache[nativeJoin(scriptPath)];
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
