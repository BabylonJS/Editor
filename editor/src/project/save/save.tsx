import { dirname } from "path/posix";
import { writeJSON } from "fs-extra";
import { ipcRenderer } from "electron";

import { toast } from "sonner";

import packageJson from "../../../package.json";

import { Editor } from "../../editor/main";

import { IEditorProject } from "../typings";

import { exportProject } from "../export/export";

import { projectsKey } from "../../tools/project";
import { tryGetProjectsFromLocalStorage } from "../../tools/local-storage";

import { saveScene } from "./scene";
import { EditorSaveProjectProgressComponent } from "./progress";

export async function saveProject(editor: Editor): Promise<void> {
    if (!editor.state.projectPath) {
        return;
    }

    const toastId = toast(<EditorSaveProjectProgressComponent />, {
        duration: Infinity,
        dismissible: false,
    });

    const directory = dirname(editor.state.projectPath);

    const project: Partial<IEditorProject> = {
        plugins: editor.state.plugins.map((plugin) => ({
            nameOrPath: plugin,
        })),
        version: packageJson.version,
        lastOpenedScene: editor.state.lastOpenedScenePath?.replace(dirname(editor.state.projectPath), ""),

        compressedTexturesEnabled: editor.state.compressedTexturesEnabled,
        compressedTexturesCliPath: editor.state.compressedTexturesCliPath,
    };

    await writeJSON(editor.state.projectPath, project, {
        spaces: 4,
    });

    if (editor.state.lastOpenedScenePath) {
        editor.layout.console.log(`Saving project "${project.lastOpenedScene}"`);
        await saveScene(editor, directory, editor.state.lastOpenedScenePath);
        editor.layout.console.log(`Project "${project.lastOpenedScene}" saved.`);
    }

    toast.dismiss(toastId);
    toast.success("Project saved");

    try {
        const base64 = editor.layout.preview.engine.getRenderingCanvas()?.toDataURL("image/png");

        const projects = tryGetProjectsFromLocalStorage();
        const project = projects.find((project) => project.absolutePath === editor.state.projectPath);
        if (project) {
            project.preview = base64;
            project.updatedAt = new Date();

            localStorage.setItem(projectsKey, JSON.stringify(projects));
            ipcRenderer.send("dashboard:update-projects");
        }
    } catch (e) {
        // Catch silently.
    }

    await exportProject(editor, false);
}
