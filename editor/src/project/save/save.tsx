import { dirname } from "path/posix";
import { writeJSON } from "fs-extra";

import { ImCheckboxChecked } from "react-icons/im";

import packageJson from "../../../package.json";

import { Editor } from "../../editor/main";

import { IEditorProject } from "../typings";
import { saveScene } from "./scene";

export async function saveProject(editor: Editor): Promise<void> {
    if (!editor.state.projectPath) {
        return;
    }

    const directory = dirname(editor.state.projectPath);

    const project: Partial<IEditorProject> = {
        version: packageJson.version,
        lastOpenedScene: editor.state.lastOpenedScenePath?.replace(dirname(editor.state.projectPath), ""),
    };

    await writeJSON(editor.state.projectPath, project, {
        spaces: 4,
    });

    if (editor.state.lastOpenedScenePath) {
        await saveScene(editor, directory, editor.state.lastOpenedScenePath);
    }

    editor.toaster.show({
        timeout: 1000,
        intent: "success",
        message: (
            <div className="flex gap-2 items-center">
                <div>
                    <ImCheckboxChecked className="w-4 h-4" />
                </div>
                <div className="mt-1">Project saved</div>
            </div>
        ),
    }, "editor:project-saved");
}
