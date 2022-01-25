import { ipcRenderer } from "electron";
import { extname } from "path";

import { Nullable } from "../../../shared/types";
import { IPCRequests, IPCResponses } from "../../../shared/ipc";

import { Tools } from "../tools/tools";

import { Overlay } from "../gui/overlay";

import { Cinematic } from "../cinematic/cinematic";

import { IProject } from "./typings";

export class Project {
    /**
     * Defines the path of the currently opened project.
     */
    public static Path: Nullable<string> = null;
    /**
     * Defines the path to the directory containing the project.
     */
    public static DirPath: Nullable<string> = null;
    /**
     * Defines the current project datas.
     */
    public static Project: Nullable<IProject> = null;

    /**
     * Defines the list of all available cinematics for the project.
     */
    public static Cinematics: Cinematic[] = [];

    /**
     * Returns the project path set when opened the editor from the OS file system.
     */
    public static GetOpeningProject(): Promise<Nullable<string>> {
        return new Promise<Nullable<string>>((resolve) => {
            ipcRenderer.once(IPCResponses.GetProjectPath, (_, path) => resolve(path));
            ipcRenderer.send(IPCRequests.GetProjectPath);
        });
    }

    /**
     * Sets the new project path of the project.
     * @param path the new path of the project.
     */
    public static SetOpeningProject(path: string): Promise<void> {
        return new Promise<void>((resolve) => {
            ipcRenderer.once(IPCResponses.SetProjectPath, () => resolve());
            ipcRenderer.send(IPCRequests.SetProjectPath, path);
        });
    }

    /**
     * Opens the file dialog and loads the selected project.
     */
    public static async Browse(): Promise<void> {
        const file = await Tools.ShowNativeOpenFileDialog();
        if (!file || extname(file.name).toLowerCase() !== ".editorproject") { return; }

        Overlay.Show("Preparing...", true);
        await Project.SetOpeningProject(file.path);
        window.location.reload();
    }
}
