import { readdir, rename, pathExists } from "fs-extra";
import { join, basename, resolve } from "path";

import { Node } from "babylonjs";

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
        const name = await Dialog.Show("New Project Name", "Please provide the new name of the project.");
        
        Overlay.Show("Renaming...", true);
        try {
            await this._Rename(editor, name);
        } catch (e) {
            Alert.Show("Can't Rename Project", "An error occured when renaming project.");
        }

        Overlay.Hide();
    }

    /**
     * Renames the current project.
     */
    private static async _Rename(editor: Editor, name: string): Promise<void> {
        if (!Project.DirPath || !WorkSpace.DirPath) { return; }
        if (!Project.Path || ! WorkSpace.Path) { return; }

        const files = await readdir(join(WorkSpace.DirPath, "projects"));

        const existing = files.find((f) => f.toLowerCase() === name.toLowerCase()) ?? null;
        if (existing !== null) {
            return Alert.Show("Can't Rename Project", `A project named "${name}" already exists. Please provide another name`);
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
                // Catch silently.
            }
        }

        // Rename scr's folder
        const srcFolder = join(WorkSpace.DirPath, "src", "scenes", projectName);
        const srcFolderExists = await pathExists(srcFolder);
        if (srcFolderExists) {
            try {
                await rename(srcFolder, join(WorkSpace.DirPath, "src", "scenes", name));
            } catch (e) {
                // Catch silently.
            }
        }

        // Rename all nodes metadatas
        const nodes = (editor.scene!.meshes as Node[])
                        .concat(editor.scene!.lights)
                        .concat(editor.scene!.cameras)
                        .concat(editor.scene!.transformNodes) as Node[];

        nodes.forEach((n) => {
            if (!n.metadata) { return; }

            // Attached script.
            if (n.metadata.script && n.metadata.script.name && n.metadata.script.name !== "None") {
                n.metadata.script.name = n.metadata.script.name.replace(`src/scenes/${projectName}`, `src/scenes/${name}`);
            }
        });

        // Update project and workspace
        Project.DirPath = resolve(Project.DirPath, "..", name);
        Project.Path = join(Project.DirPath, basename(Project.Path));

        // Update workspace
        WorkSpace.Workspace!.lastOpenedScene = join("projects", name, basename(Project.Path));
        await WorkSpace.WriteWorkspaceFile(Project.Path);
    }
}