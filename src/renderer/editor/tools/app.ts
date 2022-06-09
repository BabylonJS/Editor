import { ipcRenderer } from "electron";

import { Nullable } from "../../../shared/types";
import { IPCRequests, IPCResponses } from "../../../shared/ipc";

import { IPCTools } from "./ipc";

export class AppTools {
    private static _AppPath: string;

    /**
     * Initializes the tools.
     */
    public static async Init(): Promise<void> {
        this._AppPath = await IPCTools.CallWithPromise<string>(IPCRequests.GetAppPath);
    }

    /**
     * Returns the current root path of the app.
     */
    public static GetAppPath(): string {
        return this._AppPath;
    }

    /**
     * Opens the save dialog and returns the selected path.
     * @param path optional path where to open the save dialog.
     */
    public static async ShowSaveDialog(path: Nullable<string> = null): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            ipcRenderer.once(IPCResponses.OpenDirectoryDialog, (_, path) => resolve(path));
            ipcRenderer.once(IPCResponses.CancelOpenFileDialog, () => reject("User decided to not save any file."));
            ipcRenderer.send(IPCRequests.OpenDirectoryDialog, "Open Babylon.JS Editor Project", path ?? "");
        });
    }

    /**
     * Opens the open-file dialog and returns the selected path.
     * @param path the path where to start the dialog.
     */
    public static async ShowOpenFileDialog(title: string, path: Nullable<string> = null): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            ipcRenderer.once(IPCResponses.OpenFileDialog, (_, path) => resolve(path));
            ipcRenderer.once(IPCResponses.CancelOpenFileDialog, () => reject("User decided to not save any file."));
            ipcRenderer.send(IPCRequests.OpenFileDialog, title, path ?? "");
        });
    }

    /**
     * Opens the save file dialog and returns the selected path.
     * @param title the title of the save file dialog.
     * @param path optional path where to open the save dialog.
     */
    public static async ShowSaveFileDialog(title: Nullable<string>, path: Nullable<string> = null): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            ipcRenderer.once(IPCResponses.SaveFileDialog, (_, path) => resolve(path));
            ipcRenderer.once(IPCResponses.CancelSaveFileDialog, () => reject("User decided to not save any file."));
            ipcRenderer.send(IPCRequests.SaveFileDialog, title ?? "Save File", path ?? "");
        });
    }
}
