import { shell } from "electron";
import { writeJSON, writeFile } from "fs-extra";
import { join, extname, dirname, basename } from "path";

import { Mesh, Scene, SceneLoader, SceneSerializer, BaseTexture } from "babylonjs";
import { GLTF2Export } from 'babylonjs-serializers';

import { Alert } from "../gui/alert";
import { Dialog } from "../gui/dialog";

import { Project } from "../project/project";

import { Tools } from "../tools/tools";

import { Editor } from "../editor";

export class SceneTools {
    /**
     * Merges the given meshes into a single one, by creating sub meshes and keeping materials.
     * @param editor the editor reference.
     * @param meshes the list of all meshes to merge into a single mesh.
     */
    public static MergeMeshes(editor: Editor, meshes: Mesh[]): void {
        const merged = Mesh.MergeMeshes(meshes, false, true, undefined, true, undefined);
        if (!merged) {
            Alert.Show("Can't merge meshes", "An error occured while merging meshes.");
            return;
        }

        // Refresh graph!
        editor.graph.refresh();
    }

    /**
     * Exports the given scene to a BabylonJS Scene.
     * @param editor the editor reference.
     * @param meshName defines the name of the mesh to export.
     */
    public static async ExportMeshToBabylonJSFormat(editor: Editor, meshName: string): Promise<void> {
        const task = editor.addTaskFeedback(0, "Exporting to Babylon...");

        const rootUrl = join(Project.DirPath!, "files", "/");
        const name = join("..", "assets/meshes", meshName);

        const scene = new Scene(editor.engine!);
        await SceneLoader.AppendAsync(rootUrl, name, scene);

        editor.updateTaskFeedback(task, 50);

        try {
            let dest = await Tools.ShowSaveFileDialog("Please select the path where to save the exported scene.");
            if (extname(dest) !== ".babylon") {
                dest += ".babylon";
            }

            const json = SceneSerializer.Serialize(scene);
            await writeJSON(dest, json, { encoding: "utf-8", spaces: "\t" });

            shell.openItem(dirname(dest));
        } catch (e) {

        }

        scene.dispose();

        editor.updateTaskFeedback(task, 100);
        editor.closeTaskFeedback(task, 500);
    }

    /**
     * Exports the given scene to a GLTF scene.
     * @param editor the editor reference.
     * @param meshName defines the name of the mesh to export.
     */
    public static async ExportMeshToGLTF(editor: Editor, meshName: string, format: "gltf" | "glb"): Promise<void> {
        const task = editor.addTaskFeedback(0, "Exporting to GLTF...");

        const rootUrl = join(Project.DirPath!, "files", "/");
        const name = join("..", "assets/meshes", meshName);

        const scene = new Scene(editor.engine!);
        await SceneLoader.AppendAsync(rootUrl, name, scene);

        editor.updateTaskFeedback(task, 35);

        const prefix = await Dialog.Show("GLTF file prefix", "Please provide a prefix for files.");
        const data = format === "glb" ? await GLTF2Export.GLBAsync(scene, prefix, { }) : await GLTF2Export.GLTFAsync(scene, prefix, { });

        editor.updateTaskFeedback(task, 75);

        try {
            const dest = await Tools.ShowSaveDialog();
            for (const f in data.glTFFiles) {
                const file = data.glTFFiles[f];

                if (file instanceof Blob) {
                    const buffer = await Tools.ReadFileAsArrayBuffer(file);
                    await writeFile(join(dest, f), Buffer.from(buffer));
                } else {
                    await writeFile(join(dest, f), file, { encoding: "utf-8" });
                }
            }

            shell.openItem(dest);
        } catch (e) {

        }
        scene.dispose();

        editor.updateTaskFeedback(task, 100);
        editor.closeTaskFeedback(task, 500);
    }

    /**
     * Exports the current scene to GLTF/GLB.
     * @param editor the editor reference.
     * @param format defines the format (GLTF or GLB).
     */
    public static async ExportSceneToGLTF(editor: Editor, format: "gltf" | "glb"): Promise<void> {
        const prefix = await Dialog.Show("GLTF file prefix", "Please provide a prefix for files.");

        const savedTextures: { texture: BaseTexture; name: string; }[] = [];
        editor.scene!.textures.forEach((texture) => {
            savedTextures.push({ texture, name: texture.name });

            const extension = extname(texture.name);
            texture.name = basename(texture.name).replace(extension, "");
        });
        
        try {
            const data = format === "glb" ? await GLTF2Export.GLBAsync(editor.scene!, prefix, { }) : await GLTF2Export.GLTFAsync(editor.scene!, prefix, { });
            const dest = await Tools.ShowSaveDialog();
            for (const f in data.glTFFiles) {
                const file = data.glTFFiles[f];

                if (file instanceof Blob) {
                    const buffer = await Tools.ReadFileAsArrayBuffer(file);
                    await writeFile(join(dest, f), Buffer.from(buffer));
                } else {
                    await writeFile(join(dest, f), file, { encoding: "utf-8" });
                }
            }

            shell.openItem(dest);
        } catch (e) {
            // Catch silently.
        } finally {
            savedTextures.forEach((texture) => {
                texture.texture.name = texture.name;
            });
        }
    }
}
