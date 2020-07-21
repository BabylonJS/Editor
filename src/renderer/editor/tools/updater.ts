import { shell } from "electron";

import * as os from "os";
import { join } from "path";
import { mkdtemp, writeFile, remove } from "fs-extra";

import { Intent, Classes } from "@blueprintjs/core";

import { Tools } from "./tools";

import { Editor } from "../editor";

export class EditorUpdater {
    private static _Updating: boolean = false;
    
    /**
     * Checks for updates of the editor.
     * @param editor defines the editor reference.
     */
    public static async CheckForUpdates(editor: Editor, drawResult: boolean): Promise<void> {
        try {
            const packageJson = await this._LoadPackageJson();

            if (!this._CheckNeedsUpdate(editor, packageJson)) {
                return drawResult ? editor.notifyMessage("No update available.", 3000, "info-sign") : void 0;
            }

            // Notify
            editor._toaster?.show({
                message: `New version of the Babylon.JS Editor is available: ${packageJson.version}`,
                timeout: -1,
                intent: Intent.PRIMARY,
                className: Classes.DARK,
                action: {
                    text: "Download",
                    onClick: async () => {
                        try {
                            await this._Download(editor, packageJson);
                        } catch (e) {
                            editor.notifyMessage("Failed to download the update.", 3000, "error");
                        }
                    },
                },
            });
        } catch (e) {
            editor.notifyMessage("Failed to check for updates.", 3000, "error");
        }
    }

    /**
     * Downloads the update.
     */
    private static async _Download(editor: Editor, packageJson: any): Promise<void> {
        if (this._Updating) { return; }

        const versions = JSON.parse(await Tools.LoadFile("http://editor.babylonjs.com/electron/versions.json", false));
        const links = versions[packageJson.version];
        const url = join("http://editor.babylonjs.com/", links[os.platform()]);

        // Download!
        this._Updating = true;

        const task = editor.addTaskFeedback(0, "Downloading Update...", -1);

        try {
            const contentBuffer = await Tools.LoadFile<ArrayBuffer>(url, true, (d) => {
                const percent = (d.loaded / d.total) * 100;
                editor.updateTaskFeedback(task, percent, `Downloading Update: ${percent.toFixed(1)}%`);
            });

            this._WriteAndInstall(editor, contentBuffer);
        } catch (e) {
            editor.notifyMessage("Failed to download the update", 3000, "error");
        }

        editor.closeTaskFeedback(task, 100);

        this._Updating = false;
    }

    /**
     * Writes the installer and installs the editor!
     */
    private static async _WriteAndInstall(editor: Editor, contentBuffer: ArrayBuffer): Promise<void> {
        const tempDir = await mkdtemp(join(os.tmpdir(), "babylonjs-editor"));
        const fileDest = join(tempDir, "babylonjs-editor-installer.exe");

        await writeFile(fileDest, Buffer.from(contentBuffer));

        // Notify
        editor._toaster?.show({
            message: "Downloaded update. Do you want to install now?",
            timeout: -1,
            intent: Intent.PRIMARY,
            className: Classes.DARK,
            onDismiss: () => {
                try { remove(tempDir); } catch (e) { /* Catch silently */ }
            },
            action: {
                text: "Install",
                onClick: () => shell.openItem(fileDest),
            },
        });
    }

    /**
     * Returns wether or not the editor should be updated.
     */
    private static _CheckNeedsUpdate(editor: Editor, packageJson: any): boolean {
        return packageJson.version > editor._packageJson.version;
    }

    /**
     * Loads the package.json file.
     */
    private static async _LoadPackageJson(): Promise<any> {
        return JSON.parse(await Tools.LoadFile("http://editor.babylonjs.com/electron/package.json?" + Date.now(), false));
    }
}
