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
    });

    // Update dependencies
    const toastId = toast(<LoadScenePrepareComponent />, {
        duration: Infinity,
        dismissible: false,
    });

    const p = await execNodePty("yarn", { cwd: directory });
    p.wait().then(async () => {
        toast.dismiss(toastId);
        toast.success("Dependencies successfully updated");

        // Load plugins
        for (const plugin of project.plugins) {
            try {
                const isLocalPlugin = await pathExists(plugin.nameOrPath);

                let requireId = plugin.nameOrPath;
                if (!isLocalPlugin) {
                    const projectDir = dirname(path);
                    requireId = join(projectDir, "node_modules", plugin.nameOrPath);
                }

                const result = require(requireId);
                result.main(editor);

                if (isLocalPlugin) {
                    editor.layout.console.log(`Loaded plugin from local drive "${result.title ?? plugin.nameOrPath}"`);
                } else {
                    editor.layout.console.log(`Loaded plugin "${result.title ?? plugin.nameOrPath}"`);
                }
            } catch (e) {
                console.error(e);
                editor.layout.console.error(`Failed to load plugin from project "${plugin.nameOrPath}"`);
            }
        }
    });

    // Load scene?
    if (project.lastOpenedScene) {
        const absolutePath = join(directory, project.lastOpenedScene);

        if (!await pathExists(absolutePath)) {
            toast(`Scene "${project.lastOpenedScene}" does not exist.`);

            return editor.layout.console.error(`Scene "${project.lastOpenedScene}" does not exist.`);
        }

        await loadScene(editor, directory, absolutePath);

        editor.layout.inspector.setEditedObject(editor.layout.preview.scene);
    }
}
