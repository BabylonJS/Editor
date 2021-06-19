import { readdir, rename, pathExists } from "fs-extra";
import { join, basename, resolve } from "path";

import { Editor } from "../editor";

import { Dialog } from "../gui/dialog";
import { Alert } from "../gui/alert";
import { Overlay } from "../gui/overlay";

import { Project } from "./project";
import { WorkSpace } from "./workspace";

export class ProjectRenamer {
    /**
     * Renames the current project. This will take care of attached scripts, etc.
     * @param editor the editor reference.
     */
    public static async Rename(editor: Editor): Promise<void> {
        const basename = WorkSpace.GetProjectName();
        const name = await Dialog.Show("New Project Name", "Please provide the new name of the project.");
        
        Overlay.Show("Renaming...", true);
        try {
            await this._Rename(editor, name, basename);
        } catch (e) {
            Alert.Show("Can't Rename Project", "An error occured when renaming project.");
        }

        Overlay.Hide();
    }

    /**
     * Renames the current project.
     */
    private static async _Rename(editor: Editor, name: string, originalname: string): Promise<void> {
        if (!Project.DirPath || !WorkSpace.DirPath) { return; }
        if (!Project.Path || ! WorkSpace.Path) { return; }

        const files = await readdir(join(WorkSpace.DirPath, "projects"));
        const existing = files.find((f) => f.toLowerCase() === name.toLowerCase()) ?? null;
        if (existing !== null) {
            return Alert.Show("Can't Rename Project", `A project named "${name}" already exists. Please provide another name.`);
        }

        const projectName = WorkSpace.GetProjectName();

        // Rename project's folder
        await rename(Project.DirPath, join(WorkSpace.DirPath, "projects", name));

        // Rename scene's folder
        const sceneFolder = join(WorkSpace.DirPath, "scenes", projectName);
        const sceneFolderExists = await pathExists(sceneFolder);
        if (sceneFolderExists) {
            try {
                await rename(sceneFolder, join(WorkSpace.DirPath, "scenes", name));
            } catch (e) {
                return this._Rename(editor, originalname, originalname);
            }
        }

        // Update project and workspace
        Project.DirPath = resolve(Project.DirPath, "..", name);
        Project.Path = join(Project.DirPath, basename(Project.Path));

        // Update workspace
        WorkSpace.Workspace!.lastOpenedScene = join("projects", name, basename(Project.Path));
        await WorkSpace.WriteWorkspaceFile(Project.Path);

        // Update assets
        await editor.assets.refresh();
    }
}