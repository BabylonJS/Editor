import * as os from "os";
import { basename, join } from "path";
import { pathExists, readdir, rename, stat } from "fs-extra";

import { IPCRequests } from "../../../../../../shared/ipc";

import { Editor } from "../../../../editor";

import { IPCTools } from "../../../../tools/ipc";

import { Alert } from "../../../../gui/alert";

import { Project } from "../../../../project/project";
import { WorkSpace } from "../../../../project/workspace";

import { AssetsBrowserMoveHandler } from "./move-handler";

export class AssetsBrowserSceneMoveHandler extends AssetsBrowserMoveHandler {
    /**
     * Defines the list of all extensions handled by the item mover.
     */
    public extensions: string[] = [
        ".scene",
    ];

    private _editor: Editor;

    /**
     * Constructor.
     * @param editor defines the reference to the editor.
     */
    public constructor(editor: Editor) {
        super();

        this._editor = editor;
    }

    /**
     * Returns wether or not the asset located at the given path is used in the project.
     * @param path defines the absolute path to the file.
     */
    public async isFileUsed(path: string): Promise<boolean> {
        const fileName = basename(path);
        const sceneName = fileName.replace(".scene", "");

        return WorkSpace.GetProjectName() === sceneName;
    }

    /**
     * Returns wheter or not the given file can move.
     * @param from defines the previous absolute path to the file being moved.
     * @param to defines the new absolute path to the file being moved.
     */
    public async canRename(_from: string, to: string): Promise<boolean> {
        const filename = basename(to);
        const sceneName = filename.replace(".scene", "");

        const projects = await readdir(join(WorkSpace.DirPath!, "projects"));

        for (const p of projects) {
            if (p !== sceneName) {
                continue;
            }

            const stats = await stat(join(WorkSpace.DirPath!, "projects", p));
            if (stats.isDirectory()) {
                this._editor.console.logWarning(`Can't rename scene to "${sceneName}"`);
                Alert.Show("Can't rename", `Can't rename scene file. A scene named "${sceneName}" already exist.`);
                return false;
            }
        }

        return true;
    }

    /**
     * Called on the user moves the given file from the previous path to the new path.
     * @param from defines the previous absolute path to the file being moved.
     * @param to defines the new absolute path to the file being moved.
     */
    public async moveFile(from: string, to: string): Promise<void> {
        const oldFileName = basename(from);
        const newFileName = basename(to);

        const oldName = oldFileName.replace(".scene", "");
        const newName = newFileName.replace(".scene", "");

        if (oldName === newName) {
            return;
        }

        await rename(
            join(WorkSpace.DirPath!, "projects", oldName),
            join(WorkSpace.DirPath!, "projects", newName),
        );

        Project.DirPath = join(WorkSpace.DirPath!, "projects", newName);
        Project.Path = join(WorkSpace.DirPath!, "projects", newName, basename(Project.DirPath!));

        await WorkSpace.WriteWorkspaceFile(join(WorkSpace.DirPath!, "projects", newName, "scene.editorproject"));

        const scenesOutputPath = join(WorkSpace.DirPath!, WorkSpace.OutputSceneDirectory, "scenes", oldName);

        if (await pathExists(scenesOutputPath)) {
            await rename(scenesOutputPath, join(WorkSpace.DirPath!, WorkSpace.OutputSceneDirectory, "scenes", newName));
        }

        this._editor.notifyMessage("Sucessfully renamed scene.", 3000);
    }

    /**
     * Called on the given file is being remvoed.
     * @param path defines the absolute path to the file that is being removed.
     */
    public async onRemoveFile(path: string): Promise<void> {
        const fileName = basename(path);
        const sceneName = fileName.replace(".scene", "");

        const platform = os.platform();

        try {

            let projectPath = join(WorkSpace.DirPath!, "projects", sceneName);
            projectPath = platform === "win32" ? projectPath.replace(/\//g, "\\") : projectPath;

            IPCTools.CallWithPromise(IPCRequests.TrashItem, projectPath);
        } catch (e) { /* Catch silently */ }

        try {
            let scenePath = join(WorkSpace.DirPath!, WorkSpace.OutputSceneDirectory, "scenes", sceneName);
            scenePath = platform === "win32" ? scenePath.replace(/\//g, "\\") : scenePath;

            IPCTools.CallWithPromise(IPCRequests.TrashItem, scenePath);
        } catch (e) { /* Catch silently */ }
    }
}
