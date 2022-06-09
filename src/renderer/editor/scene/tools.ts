import { shell } from "electron";
import { writeJSON, writeFile, readJSON } from "fs-extra";
import { join, extname, dirname, basename } from "path";

import { Mesh, Scene, SceneLoader, SceneSerializer, BaseTexture, AnimationGroup, Node } from "babylonjs";
import { GLTF2Export } from 'babylonjs-serializers';

import { Alert } from "../gui/alert";
import { Dialog } from "../gui/dialog";

import { Tools } from "../tools/tools";
import { AppTools } from "../tools/app";

import { Project } from "../project/project";

import { MeshExporter } from "../export/mesh";

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

        merged.id = Tools.RandomId();

        // Refresh graph!
        editor.graph.refresh();
    }

    /**
     * 
     * @param editor defines the reference to the editor.
     * @param mesh defines the reference to the mesh to export.
     */
    public static async ExportMeshToBabylonJSFormat(editor: Editor, mesh: Mesh): Promise<void> {
        let destPath = await AppTools.ShowSaveFileDialog(`Export location for mesh "${mesh.name ?? ""}"`);
        
        if (!destPath) { return; }

        if (extname(destPath).toLowerCase() !== ".babylon") {
            destPath += ".babylon";
        }

        try {
            // Serialize and clear
            const serializedMesh = MeshExporter.ExportMesh(mesh, false, false);
            serializedMesh.meshes?.forEach((m) => m.instances = []);
            delete serializedMesh.lods;

            // Write file
            await writeJSON(destPath, serializedMesh, { encoding: "utf-8" });

            editor.notifyMessage(`Successfully exported mesh at "${destPath}"`, 2000);
        } catch (e) {
            if (e.message) {
                editor.console.logError(e.message);
            }
            editor.notifyMessage(`Failed to export mesh "${mesh.name ?? ""}". Please refer to console.`, 2000, "error");
        }
    }

    /**
     * Exports the given scene to a BabylonJS Scene.
     * @param editor the editor reference.
     * @param meshName defines the name of the mesh to export.
     */
    public static async ExportMeshAssetToBabylonJSFormat(editor: Editor, meshName: string): Promise<void> {
        const task = editor.addTaskFeedback(0, "Exporting to Babylon...");

        const rootUrl = join(Project.DirPath!, "files", "/");
        const name = join("..", "assets/meshes", meshName);

        const scene = new Scene(editor.engine!);
        await SceneLoader.AppendAsync(rootUrl, name, scene);

        editor.updateTaskFeedback(task, 50);

        try {
            let dest = await AppTools.ShowSaveFileDialog("Please select the path where to save the exported scene.");
            if (extname(dest) !== ".babylon") {
                dest += ".babylon";
            }

            const json = SceneSerializer.Serialize(scene);
            await writeJSON(dest, json, { encoding: "utf-8", spaces: "\t" });

            shell.openPath(dirname(dest));
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
    public static async ExportMeshAssetToGLTF(editor: Editor, meshName: string, format: "gltf" | "glb"): Promise<void> {
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
            const dest = await AppTools.ShowSaveDialog();
            for (const f in data.glTFFiles) {
                const file = data.glTFFiles[f];

                if (file instanceof Blob) {
                    const buffer = await Tools.ReadFileAsArrayBuffer(file);
                    await writeFile(join(dest, f), Buffer.from(buffer));
                } else {
                    await writeFile(join(dest, f), file, { encoding: "utf-8" });
                }
            }

            shell.openPath(dest);
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
        const task = editor.addTaskFeedback(0, `Exporting to ${format}...`);

        const savedTextures: { texture: BaseTexture; name: string; }[] = [];
        editor.scene!.textures.forEach((texture) => {
            savedTextures.push({ texture, name: texture.name });

            const extension = extname(texture.name);
            texture.name = basename(texture.name).replace(extension, "");
        });
        
        try {
            editor.updateTaskFeedback(task, 50);

            const data = format === "glb" ? await GLTF2Export.GLBAsync(editor.scene!, prefix, { }) : await GLTF2Export.GLTFAsync(editor.scene!, prefix, { });
            const dest = await AppTools.ShowSaveDialog();
            for (const f in data.glTFFiles) {
                const file = data.glTFFiles[f];

                if (file instanceof Blob) {
                    const buffer = await Tools.ReadFileAsArrayBuffer(file);
                    await writeFile(join(dest, f), Buffer.from(buffer));
                } else {
                    await writeFile(join(dest, f), file, { encoding: "utf-8" });
                }
            }

            editor.updateTaskFeedback(task, 100, "Done");
            editor.closeTaskFeedback(task, 1000);

            shell.openPath(dest);
        } catch (e) {
            editor.updateTaskFeedback(task, 0, "Error!");
            editor.closeTaskFeedback(task, 1000);
        } finally {
            savedTextures.forEach((texture) => {
                texture.texture.name = texture.name;
            });
        }
    }

    /**
     * Imports all animation groups from a file and adds them to the scene.
     * @param editor defines the reference to the editor.
     * @param path defines the path where to find the animation groups file. If not provided, the editor will ask for the file.
     */
    public static async ImportAnimationGroupsFromFile(editor: Editor, path?: string): Promise<void> {
        if (!path) {
            path = await AppTools.ShowOpenFileDialog("Please select the file to load");
        }

        if (!path) { return; }

        const extension = extname(path).toLowerCase();

        switch (extension) {
            case ".babylon":
                const task = editor.addTaskFeedback(0, "Importing Animation Groups...");

                try {
                    const sceneContent = await readJSON(path);

                    for (const animationGroup of sceneContent.animationGroups ?? []) {
                        const existingAnimationGroup = editor.scene!.getAnimationGroupByName(animationGroup.name);
                        if (existingAnimationGroup) {
                            editor.console.logWarning(`Animation group named "${existingAnimationGroup.name}" already exists, it has been replaced by the new one.`);
                            existingAnimationGroup.dispose();
                        }

                        AnimationGroup.Parse(animationGroup, editor.scene!);
                        editor.console.logInfo(`Animation group named "${animationGroup.name}" successfully imported.`);
                    }
                } catch (e) {
                    if (e?.message) {
                        editor.console.logError(e.message);
                    }

                    editor.updateTaskFeedback(task, 100, "Failed to import Animation Groups");
                    editor.closeTaskFeedback(task, 1000);
                } finally {
                    editor.updateTaskFeedback(task, 100, "Done");
                    editor.closeTaskFeedback(task, 1000);
                }
                break;

            default:
                editor.notifyMessage(`Can't import animation groups from file of type "${extension}"`, 1000);
                break;
        }
    }

    /**
     * Returns the list of nodes that have the given id as original id from source file.
     * @param scene defines the reference to the scene that contains the nodes.
     * @param id defines the original id of the nodes to find.
     */
    public static GetNodesByIdFromSourceFile(scene: Scene, id: string): Node[] {
        const meshes = scene.meshes.filter((m: Mesh) => Tools.GetMeshMetadata(m).originalSourceFile?.id === id);
        
        return meshes;
    }
}
