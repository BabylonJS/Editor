import { readJSON } from "fs-extra";
import { dirname, join } from "path/posix";

import { Editor } from "../../editor/main";

import { IEditorProject } from "../typings";

import { loadScene } from "./scene";

export async function loadProject(editor: Editor, path: string): Promise<void> {
    const directory = dirname(path);

    const project = await readJSON(path, "utf-8") as IEditorProject;

    editor.setState({
        projectPath: path,
        lastOpenedScenePath: project.lastOpenedScene ? join(directory, project.lastOpenedScene) : null,
    });

    if (project.lastOpenedScene) {
        await loadScene(editor, directory, join(directory, project.lastOpenedScene));
    }
}
