import { ipcRenderer } from "electron";
import { join, dirname, extname, basename } from "path";
import { readdir, readJSON, writeJSON, stat } from "fs-extra";

import { Nullable } from "../../../shared/types";
import { IPCRequests, IPCResponses } from "../../../shared/ipc";

import { Editor } from "../editor";

import { Tools } from "../tools/tools";
import { ExecTools, IExecProcess } from "../tools/exec";

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

    private static _WatchProgram: Nullable<IExecProcess> = null;

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
        const json = await readJSON(path, { encoding: "utf-8" });

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

        return writeJSON(this.Path, {
            lastOpenedScene: projectPath.replace(this.DirPath!, ""),
            serverPort: this.Workspace!.serverPort,
            generateSceneOnSave: this.Workspace!.generateSceneOnSave,
            firstLoad: this.Workspace!.firstLoad,
            watchProject: this.Workspace!.watchProject,
        } as IWorkSpace, {
            encoding: "utf-8",
            spaces: "\t",
        });
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
     * Opens the file dialog and loads the selected project.
     */
    public static async Browse(): Promise<void> {
        const file = await Tools.ShowNativeOpenFileDialog();
        if (!file || extname(file.name).toLowerCase() !== ".editorworkspace") { return; }

        Overlay.Show("Preparing...", true);
        await this.SetOpeningWorkspace(file.path);
        window.location.reload();
    }

    /**
     * Installs and builds the project.
     * @param editor the editor reference.
     */
    public static async InstallAndBuild(editor: Editor): Promise<void> {
        if (!this.Workspace) { return; }
        
        const task = editor.addTaskFeedback(0, "Installing dependencies", 0);
        try {
            await ExecTools.Exec(editor, "npm install", WorkSpace.DirPath!);

            editor.updateTaskFeedback(task, 50, "Building project...");
            await ExecTools.Exec(editor, "npm run build", WorkSpace.DirPath!);
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
        if (!this.Workspace) { return; }

        const task = editor.addTaskFeedback(50, "Building project...");

        try {
            await ExecTools.Exec(editor, "npm run build", WorkSpace.DirPath!);
            editor.updateTaskFeedback(task, 100, "Done!");
        } catch (e) {
            editor.updateTaskFeedback(task, 0, "Failed");
        }

        editor.closeTaskFeedback(task, 1000);
    }

    /**
     * Watchs the project using webpack.
     * @param editor the editor reference.
     */
    public static async WatchProject(editor: Editor): Promise<void> {
        // Get command
        const packageJson = await readJSON(join(this.DirPath!, "package.json"));
        const watchScript = join("node_modules", ".bin", packageJson.scripts.watch);
        
        this._WatchProgram = ExecTools.ExecAndGetProgram(editor, watchScript, this.DirPath!);
    }

    /**
     * Returns wether or not the project is being watched using webpack.
     */
    public static get IsWatching(): boolean {
        return this._WatchProgram !== null;
    }

    /**
     * Stops watching the project using webpack.
     */
    public static StopWatching(): void {
        if (this._WatchProgram) {
            this._WatchProgram.process.kill();
        }

        this._WatchProgram = null;
    }

    /**
     * Kills all the existing programs.
     */
    public static KillAllProcesses(): void {
        this.StopWatching();
    }
}
