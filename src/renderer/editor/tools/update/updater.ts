import * as os from "os";
import { shell } from "electron";
import { writeFile } from "fs-extra";
import { join, basename, dirname } from "path";

import { Nullable } from "../../../../shared/types";

import { Intent, Classes } from "@blueprintjs/core";

import { Tools } from "../tools";
import { AppTools } from "../app";
import { Semver } from "../semver";

import { Editor } from "../../editor";

interface _IEditorVersions {
    [version: string]: {
        win32: string;
        darwin: string;
        linux?: string;
    }
}

export class EditorUpdater {
    private static _Updating: boolean = false;

    /**
     * Checks for updates of the editor.
     * @param editor defines the editor reference.
     */
    public static async CheckForUpdates(editor: Editor, drawResult: boolean): Promise<void> {
        try {
            const availableVersions = JSON.parse(await Tools.LoadFile("http://editor.babylonjs.com/electron/versions.json?" + Date.now(), false));
            const foundVersion = this._CheckNeedsUpdate(editor, availableVersions);

            if (!foundVersion) {
                return drawResult ? editor.notifyMessage("No update available.", 3000, "info-sign") : void 0;
            }

            // Notify
            editor._toaster?.show({
                message: `New version of the Babylon.JS Editor is available: ${foundVersion.version}`,
                timeout: -1,
                intent: Intent.PRIMARY,
                className: Classes.DARK,
                action: {
                    text: "Download",
                    onClick: async () => {
                        try {
                            await this._Download(editor, availableVersions, foundVersion);
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
    private static async _Download(editor: Editor, availableVersions: _IEditorVersions, version: Semver): Promise<void> {
        if (this._Updating) { return; }

        const links = availableVersions[version.version];
        const link = links[`${os.platform()}-${os.arch()}`] ?? links[os.platform()];
        
        const url = join("http://editor.babylonjs.com/", link);

        const destFolder = await AppTools.ShowSaveDialog();
        const dest = join(destFolder, basename(url));

        // Download!
        this._Updating = true;

        const task = editor.addTaskFeedback(0, "Downloading Update...", -1);

        try {
            const contentBuffer = await Tools.LoadFile<ArrayBuffer>(url, true, (d) => {
                const percent = (d.loaded / d.total) * 100;
                editor.updateTaskFeedback(task, percent, `Downloading Update: ${percent.toFixed(1)}%`);
            });

            this._WriteAndInstall(editor, dest, contentBuffer);
        } catch (e) {
            editor.notifyMessage("Failed to download the update", 3000, "error");
        }

        editor.closeTaskFeedback(task, 100);

        this._Updating = false;
    }

    /**
     * Writes the installer and installs the editor!
     */
    private static async _WriteAndInstall(editor: Editor, dest: string, contentBuffer: ArrayBuffer): Promise<void> {
        // const tempDir = await mkdtemp(join(os.tmpdir(), "babylonjs-editor"));
        await writeFile(dest, Buffer.from(contentBuffer));

        // Notify
        editor._toaster?.show({
            message: "Downloaded update. Do you want to install now?",
            timeout: -1,
            intent: Intent.PRIMARY,
            className: Classes.DARK,
            onDismiss: () => {
                // try { remove(tempDir); } catch (e) { /* Catch silently */ }
            },
            action: {
                text: "Install",
                onClick: () => {
                    // shell.openItem(dest);
                    shell.openPath(dirname(dest));
                },
            },
        });
    }

    /**
     * Returns wether or not the editor should be updated.
     */
    private static _CheckNeedsUpdate(editor: Editor, versions: _IEditorVersions): Nullable<Semver> {
        let highestVersion = new Semver("0.0.0");
        const currentSemver = new Semver(editor._packageJson.version);

        for (const v in versions) {
            const version = new Semver(v);
            if (!version.isSameMajorVersion(currentSemver)) {
                continue;
            }

            if (version.isVersionGreaterThan(highestVersion)) {
                highestVersion = version;
            }
        }

        return highestVersion.isVersionGreaterThan(currentSemver) ? highestVersion : null;
    }
}
