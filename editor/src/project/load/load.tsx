import { dirname, join } from "path/posix";
import { pathExists, readJSON } from "fs-extra";

import { toast } from "sonner";

import { Editor } from "../../editor/main";

import { IEditorProject } from "../typings";

import { execNodePty } from "../../tools/node-pty";

import { loadScene } from "./scene";
import { LoadScenePrepareComponent } from "./prepare";

export async function loadProject(editor: Editor, path: string): Promise<void> {
    const directory = dirname(path);
    const project = await readJSON(path, "utf-8") as IEditorProject;

    editor.setState({
        projectPath: path,
        plugins: project.plugins.map((plugin) => plugin.nameOrPath),
        lastOpenedScenePath: project.lastOpenedScene ? join(directory, project.lastOpenedScene) : null,

        compressedTexturesEnabled: project.compressedTexturesEnabled ?? false,
        compressedTexturesCliPath: project.compressedTexturesCliPath ?? null,
    });

    // Update dependencies
    const toastId = toast(<LoadScenePrepareComponent />, {
        duration: Infinity,
        dismissible: false,
    });

    const p = await execNodePty("yarn", { cwd: directory });
    p.wait().then(() => {
        toast.dismiss(toastId);
        toast.success("Dependencies successfully updated");

        // Load plugins
        for (const plugin of project.plugins) {
            try {
                const result = require(plugin.nameOrPath);
                result.main(editor);
                editor.layout.console.log(`Loaded plugin "${result.title ?? plugin.nameOrPath}"`);
            } catch (e) {
                console.error(e);
                editor.layout.console.error(`Failed to load plugin "${plugin.nameOrPath}"`);
            }
        }
    });

    if (project.lastOpenedScene) {
        const absolutePath = join(directory, project.lastOpenedScene);

        if (!await pathExists(absolutePath)) {
            toast(`Scene "${project.lastOpenedScene}" does not exist.`);

            return editor.layout.console.error(`Scene "${project.lastOpenedScene}" does not exist.`);
        }

        editor.layout.console.log(`Loading project "${project.lastOpenedScene}"`);
        await loadScene(editor, directory, absolutePath);
        editor.layout.console.log("Project loaded and editor is ready.");

        editor.layout.inspector.setEditedObject(editor.layout.preview.scene);
    }
}
