import { platform } from "os";
import { ipcRenderer } from "electron";
import { join, dirname, extname, basename } from "path";
import { readdir, readJSON, writeJSON, stat, copyFile } from "fs-extra";

import { IPCRequests, IPCResponses } from "../../../shared/ipc";
import { Nullable, IStringDictionary } from "../../../shared/types";

import { Terminal } from "xterm";

import { Editor } from "../editor";

import { AppTools } from "../tools/app";
import { Semver } from "../tools/semver";
import { EditorProcess, IEditorProcess } from "../tools/process";

import { Overlay } from "../gui/overlay";

import { IWorkSpace } from "./typings";

export class WorkSpace {
    /**
     * Defines the absolute path of the workspace file.
     */
    public static Path: Nullable<string> = null;
    /**
     * Defines the absolute path of the workspace folder.
     */
    public static DirPath: Nullable<string> = null;
    /**
     * Defines the list of all available projects in the workspace.
     */
    public static AvailableProjects: string[] = [];

    /**
     * Defines the current project datas.
     */
    public static Workspace: Nullable<IWorkSpace> = null;
    /**
     * Defines the port of the server used when testing the game.
     */
    public static ServerPort: Nullable<number> = null;

    private static _WebpackTerminal: Nullable<Terminal> = null;
    private static _TypeScriptTerminal: Nullable<Terminal> = null;

    private static _WatchProjectProgram: Nullable<IEditorProcess> = null;
    private static _WatchTypescriptProgram: Nullable<IEditorProcess> = null;

    private static _BuildingProject: boolean = false;

    /**
     * Returns wether or not the editor has a workspace opened.
     */
    public static HasWorkspace(): boolean {
        return this.Path !== null;
    }

    /**
     * Returns the workspace path set when opened the editor from the OS file system.
     */
    public static GetOpeningWorkspace(): Promise<Nullable<string>> {
        return new Promise<Nullable<string>>((resolve) => {
            ipcRenderer.once(IPCResponses.GetWorkspacePath, (_, path) => resolve(path));
            ipcRenderer.send(IPCRequests.GetWorkspacePath);
        });
    }

    /**
     * Sets the new project path of the project.
     * @param path the new path of the project.
     */
    public static SetOpeningWorkspace(path: string): Promise<void> {
        return new Promise<void>((resolve) => {
            ipcRenderer.once(IPCResponses.SetWorkspacePath, () => resolve());
            ipcRenderer.send(IPCRequests.SetWorkspacePath, path);
        });
    }

    /**
     * Reads the workspace file and configures the workspace class.
     * @param path the absolute path of the workspace file.
     */
    public static async ReadWorkSpaceFile(path: string): Promise<Nullable<IWorkSpace>> {
        const json = await readJSON(path, { encoding: "utf-8" }) as IWorkSpace;

        json.packageManager ??= "npm";
        json.outputSceneDirectory ??= "";

        this.Path = path;
        this.DirPath = join(dirname(path), "/");
        this.Workspace = json;

        return json;
    }

    /**
     * Writes the workspace file.
     * @param projectPath the absolute path of the saved project.
     */
    public static WriteWorkspaceFile(projectPath: string): Promise<void> {
        if (!this.DirPath || !this.Path) { return Promise.resolve(); }

        // Get all plugin prefernces
        const pluginsPreferences: IStringDictionary<any> = {};
        for (const p in Editor.LoadedExternalPlugins) {
            const plugin = Editor.LoadedExternalPlugins[p];
            if (!plugin.getWorkspacePreferences) { continue; }

            try {
                const preferences = plugin.getWorkspacePreferences();
                JSON.stringify(preferences);

                pluginsPreferences[p] = preferences;
            } catch (e) {
                console.error(e);
            }
        }

        return writeJSON(this.Path, {
            editorVersion: this.Workspace!.editorVersion,
            lastOpenedScene: projectPath.replace(this.DirPath!, ""),
            serverPort: this.Workspace!.serverPort,
            generateSceneOnSave: this.Workspace!.generateSceneOnSave,
            useIncrementalLoading: this.Workspace!.useIncrementalLoading,
            firstLoad: this.Workspace!.firstLoad,
            watchProject: this.Workspace!.watchProject,
            physicsEngine: this.Workspace!.physicsEngine,
            pluginsPreferences,
            packageManager: this.Workspace!.packageManager,
            outputSceneDirectory: this.Workspace!.outputSceneDirectory,
            playProjectInIFrame: this.Workspace!.playProjectInIFrame,
            plugins: this.Workspace!.plugins,
            https: this.Workspace!.https ?? {
                enabled: false,
            },
            ktx2CompressedTextures: {
                enabled: this.Workspace!.ktx2CompressedTextures?.enabled ?? false,
                pvrTexToolCliPath: this.Workspace!.ktx2CompressedTextures?.pvrTexToolCliPath ?? "",
                forcedFormat: this.Workspace!.ktx2CompressedTextures?.forcedFormat ?? "automatic",
                enabledInPreview: this.Workspace!.ktx2CompressedTextures?.enabledInPreview ?? false,
                astcOptions: this.Workspace!.ktx2CompressedTextures?.astcOptions ?? {
                    quality: "astcveryfast",
                },
                pvrtcOptions: this.Workspace!.ktx2CompressedTextures?.pvrtcOptions ?? {
                    quality: "pvrtcfastest",
                },
                ect1Options: this.Workspace!.ktx2CompressedTextures?.ect1Options ?? {
                    enabled: false,
                    quality: "etcfast",
                },
                ect2Options: this.Workspace!.ktx2CompressedTextures?.ect2Options ?? {
                    enabled: false,
                    quality: "etcfast",
                },
            },
        } as IWorkSpace, {
            spaces: "\t",
            encoding: "utf-8",
        });
    }

    /**
     * Returns the relative path to the directory where the output scene should be written.
     */
    public static get OutputSceneDirectory(): string {
        return this.Workspace?.outputSceneDirectory ?? "";
    }

    /**
     * Refreshes the list of available projects in the workspace.
     */
    public static async RefreshAvailableProjects(): Promise<void> {
        if (!this.DirPath) { return; }

        const projectsFolder = join(this.DirPath, "projects");
        const files = await readdir(projectsFolder);

        this.AvailableProjects = [];
        for (const f of files) {
            const infos = await stat(join(projectsFolder, f));
            if (infos.isDirectory()) { this.AvailableProjects.push(f); }
        }
    }

    /**
     * Returns the path of the latest opened project.
     */
    public static GetProjectPath(): string {
        return join(this.DirPath!, this.Workspace!.lastOpenedScene);
    }

    /**
     * Returns the name of the project.
     */
    public static GetProjectName(): string {
        return basename(dirname(this.GetProjectPath()));
    }

    /**
     * Gets the reference to the webpack terminal.
     */
    public static get WebpackTerminal(): Terminal {
        return this._WebpackTerminal ??= EditorProcess.CreateTerminal();
    }

    /**
     * Gets the reference to the TypeScript terminal.
     */
    public static get TypeScriptTerminal(): Terminal {
        return this._TypeScriptTerminal ??= EditorProcess.CreateTerminal();
    }

    /**
     * Opens the file dialog and loads the selected project.
     */
    public static async Browse(): Promise<void> {
        const file = await AppTools.ShowOpenFileDialog("Please select the workspace to open.");
        if (!file || extname(file).toLowerCase() !== ".editorworkspace") { return; }

        Overlay.Show("Preparing...", true);
        await this.SetOpeningWorkspace(file);
        window.location.reload();
    }

    /**
     * Closes the current workspace.
     */
    public static async Close(): Promise<void> {
        Overlay.Show("Closing...", true);
        await new Promise<void>((resolve) => {
            ipcRenderer.once(IPCResponses.SetWorkspacePath, () => resolve());
            ipcRenderer.send(IPCRequests.SetWorkspacePath, null);
        });
        window.location.reload();
    }

    /**
     * Installs the workspace's dependencies.
     * @param editor defines the reference to the editor.
     * @returns the promise resolved on the dependencies have been installed.
     */
    public static async InstallDependencies(editor: Editor): Promise<void> {
        if (!this.Workspace) { return; }

        await EditorProcess.RegisterProcess(editor, "npm install", {
            command: `${this.Workspace.packageManager} install`,
            cwd: WorkSpace.DirPath!,
            terminal: this.WebpackTerminal,
        })?.wait();
    }

    /**
     * Installs and builds the project.
     * @param editor the editor reference.
     */
    public static async InstallAndBuild(editor: Editor): Promise<void> {
        if (!this.Workspace) { return; }

        const task = editor.addTaskFeedback(0, "Installing dependencies. Please wait...", 0);
        try {
            await this.InstallDependencies(editor);

            editor.updateTaskFeedback(task, 50, "Building project...");
            await EditorProcess.RegisterProcess(editor, "npm build", {
                cwd: WorkSpace.DirPath!,
                terminal: this.WebpackTerminal,
                command: `${this.Workspace.packageManager} run build -- --progress`,
            })?.wait();
            editor.updateTaskFeedback(task, 100, "Done!");
        } catch (e) {
            editor.updateTaskFeedback(task, 0, "Failed");
        }

        this.Workspace.firstLoad = false;
        editor.closeTaskFeedback(task, 1000);
    }

    /**
     * Builds the project.
     * @param editor the editor reference.
     */
    public static async BuildProject(editor: Editor): Promise<void> {
        if (!this.Workspace || this._BuildingProject) { return; }

        this._BuildingProject = true;

        const task = editor.addTaskFeedback(50, "Building project...");

        try {
            await EditorProcess.RegisterProcess(editor, "npm build", {
                cwd: WorkSpace.DirPath!,
                terminal: this.WebpackTerminal,
                command: `${this.Workspace.packageManager} run build -- --progress`,
            })?.wait();
            editor.updateTaskFeedback(task, 100, "Done!");
        } catch (e) {
            editor.updateTaskFeedback(task, 0, "Failed");
        }

        this._BuildingProject = false;

        editor.closeTaskFeedback(task, 1000);
    }

    /**
     * Watchs the project using webpack.
     * @param editor the editor reference.
     */
    public static async WatchProject(editor: Editor): Promise<void> {
        if (this._WatchProjectProgram) { return; }

        // Get command
        const packageJson = await readJSON(join(this.DirPath!, "package.json"));

        const isWin32 = platform() === "win32";
        const watchScript = join("node_modules", ".bin", isWin32 ? packageJson.scripts.watch.replace("webpack", "webpack.cmd") : packageJson.scripts.watch);

        this._WatchProjectProgram = EditorProcess.RegisterProcess(editor, "npm webpack watch", {
            cwd: WorkSpace.DirPath!,
            command: `./${watchScript}`,
            terminal: this.WebpackTerminal,
        });
    }

    /**
     * Returns wether or not the project is being watched using webpack.
     */
    public static get IsWatchingProject(): boolean {
        return this._WatchProjectProgram !== null;
    }

    /**
     * Stops watching the project using webpack.
     */
    public static StopWatchingProject(): void {
        if (this._WatchProjectProgram) {
            EditorProcess.RemoveProcessById(this._WatchProjectProgram.id);
        }

        this._WatchProjectProgram = null;
    }

    /**
     * Watchs the project's typescript using tsc. This is used to safely watch attached scripts on nodes.
     * @param editor the editor reference.
     */
    public static WatchTypeScript(editor: Editor): Promise<Nullable<IEditorProcess>> {
        return this.CompileTypeScript(editor, true);
    }

    /**
     * Compiles the project's typescript using tsc.
     * @param editor defines the reference to the editor.s
     * @param watch defines wether or not the TypeScript code should be watched.
     */
    public static async CompileTypeScript(editor: Editor, watch: boolean = false): Promise<Nullable<IEditorProcess>> {
        if (watch && this._WatchTypescriptProgram) { return null; }

        // Update the tsconfig file
        await copyFile(join(AppTools.GetAppPath(), "assets", "scripts", "editor.tsconfig.json"), join(this.DirPath!, "editor.tsconfig.json"));

        // Get command
        const isWin32 = platform() === "win32";
        const watchScript = join("node_modules", ".bin", isWin32 ? "tsc.cmd" : "tsc");

        if (watch) {
            return this._WatchTypescriptProgram = EditorProcess.RegisterProcess(editor, "npm watch", {
                cwd: WorkSpace.DirPath!,
                terminal: this.TypeScriptTerminal,
                command: `./${watchScript} -p ./editor.tsconfig.json --watch`,
            });
        } else {
            return EditorProcess.RegisterProcess(editor, "npm compile", {
                cwd: WorkSpace.DirPath!,
                terminal: this.TypeScriptTerminal,
                command: `./${watchScript} -p ./editor.tsconfig.json`,
            });
        }
    }

    /**
     * Returns wether or not the typescript project is being watched.
     */
    public static get IsWatchingTypeScript(): boolean {
        return this._WatchTypescriptProgram !== null;
    }

    /**
     * Stops watching the TypeScript project.
     */
    public static StopWatchingTypeScript(): void {
        if (this._WatchTypescriptProgram) {
            try {
                EditorProcess.RemoveProcessById(this._WatchTypescriptProgram.id);
            } catch (e) {
                // Catch silently.
            }
        }

        this._WatchTypescriptProgram = null;
    }

    /**
     * Restarts the TypeScript watcher in case it goes in error.
     * @param editor defines the editor reference.
     */
    public static RestartTypeScriptWatcher(editor: Editor): Nullable<IEditorProcess> {
        if (this._WatchTypescriptProgram) {
            EditorProcess.RestartProcessById(editor, this._WatchTypescriptProgram.id);
        }

        return this._WatchTypescriptProgram;
    }

    /**
     * Returns wether or not the major Babylon.JS version of the project matches with the one of the editor.
     * Checked at initialization time of the Editor.
     * @param version defines the version of Babylon.JS being used by the editor.
     */
    public static async MatchesEditorBabylonJSMajorVersion(version: string): Promise<boolean> {
        if (!this.DirPath) {
            return true;
        }

        try {
            const packageJson = await readJSON(join(this.DirPath, "package.json"), { encoding: "utf-8" });
            const projectVersion = packageJson.dependencies?.["@babylonjs/core"] ?? packageJson.devDependencies?.["@babylonjs/core"];

            const versionSemver = new Semver(version);
            const projectSemver = new Semver(projectVersion);

            return versionSemver.isSameMajorVersion(projectSemver);
        } catch (e) {
            // Catch silently
        }

        return true;
    }

    /**
     * Configures the package.json file of the project to match the Babylon.JS version used in the editor.
     * Checked at initialization time of the Editor.
     * @param version defines the version of Babylon.JS being used by the editor.
     */
    public static async MatchBabylonJSEditorVersion(version: string): Promise<void> {
        if (!this.DirPath) {
            return;
        }

        try {
            const packageJson = await readJSON(join(this.DirPath, "package.json"), { encoding: "utf-8" });
            const dependenciesVersion = packageJson.dependencies?.["@babylonjs/core"];
            const devDependenciesVersion = packageJson.devDependencies?.["@babylonjs/core"];

            const modules = [
                "@babylonjs/core",
                "@babylonjs/gui",
                "@babylonjs/loaders",
                "@babylonjs/materials",
                "@babylonjs/serializers",
                "@babylonjs/post-processes",
                "@babylonjs/procedural-textures",
            ];

            modules.forEach((m) => {
                if (dependenciesVersion && packageJson.dependencies[m]) {
                    packageJson.dependencies[m] = version;
                }

                if (devDependenciesVersion && packageJson.devDependencies[m]) {
                    packageJson.devDependencies[m] = version;
                }
            });

            await writeJSON(join(this.DirPath, "package.json"), packageJson, { encoding: "utf-8", spaces: "    " });
        } catch (e) {
            // Catch silently.
        }
    }

    /**
     * Kills all the existing programs.
     */
    public static KillAllProcesses(): void {
        this.StopWatchingProject();
        this.StopWatchingTypeScript();
    }
}
