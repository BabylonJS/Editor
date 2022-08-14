import { dirname, join } from "path";
import { pathExists, readdir, readJSON, stat, writeJSON } from "fs-extra";

import { Editor } from "../../editor";

import { Semver } from "../../tools/semver";

import { IWorkSpace } from "../typings";

export class WorkspaceSceneConverter {
    /**
     * Returns wether or not the workspace needs to be converted to fit new scenes files assets.
     * @param workspacePath defines the path to the workspace file being opened.
     * @returns wether or not the workspace should be converted.
     */
    public static async NeedsConversion(workspacePath: string): Promise<boolean> {
        const workspace = await readJSON(workspacePath, { encoding: "utf-8" }) as IWorkSpace;
        const semver = new Semver(workspace.editorVersion!);

        if (semver.major < "4" || (semver.major === "4" && semver.minor < "4")) {
            return true;
        }

        return false;
    }

    /**
     * Converts the given workspace to the new workspace-based format.
     * @param workspacePath defines the path to the workspace file to convert.
     */
    public static async Convert(editor: Editor, workspacePath: string): Promise<void> {
        const directory = dirname(workspacePath);
        const assetsDirectory = join(directory, "assets");
        const projectsDirectory = join(directory, "projects");

        const projects = await readdir(projectsDirectory);

        editor.console.logSection("Converting scenes");

        await Promise.all(projects.map(async (p) => {
            const stats = await stat(join(projectsDirectory, p));
            if (!stats.isDirectory()) {
                return;
            }

            if (!await pathExists(join(projectsDirectory, p, "scene.editorproject"))) {
                return;
            }

            const sceneFileName = join(assetsDirectory, `${p}.scene`);

            if (await pathExists(sceneFileName)) {
                return;
            }

            await writeJSON(sceneFileName, {
                createdAt: new Date(Date.now()).toDateString(),
            }, {
                spaces: "\t",
                encoding: "utf-8",
            });

            editor.console.logInfo(`Converted scene "${p}" to scene file "${sceneFileName}"`);
        }));

        // Update workspace file
        const workspaceJson = await readJSON(workspacePath, { encoding: "utf-8" }) as IWorkSpace;
        workspaceJson.editorVersion = editor._packageJson.version;

        await writeJSON(workspacePath, workspaceJson, {
            spaces: "\t",
            encoding: "utf-8",
        });
    }
}
