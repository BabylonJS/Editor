import { join, extname } from "path";
import { readFile, mkdtemp, remove, rmdir } from "fs-extra";
import { tmpdir } from "os";

import Zip from "adm-zip";

import { Undefinable } from "../../../shared/types";

import { Mesh, Light, SceneLoader } from "babylonjs";

import { Editor } from "../editor";

import { Dialog } from "../gui/dialog";

import { Tools } from "../tools/tools";
import { AppTools } from "../tools/app";

import { MeshExporter } from "../export/mesh";

import { ProjectImporter } from "../project/project-importer";
import { IBabylonFileNode, IBabylonFile } from "../project/typings";

import { MaterialAssets } from "../assets/materials";

export class Prefab {
    /**
     * Creates a new prefab from the given node as root.
     * @param editor the editor reference.
     * @param mesh the source node to create prefab.
     * @param as defines wether or not the prefab should be saved as.
     */
    public static async CreateMeshPrefab(editor: Editor, mesh: Mesh, as: boolean): Promise<void> {
        const task = editor.addTaskFeedback(0, "Saving Prefab...");
        await Tools.Wait(500);

        const zip = new Zip();
        const prefabId = Tools.RandomId();

        // Create JSON
        const json = MeshExporter.ExportMesh(mesh, false, true) as IBabylonFile;
        json.lights = [];
        json.particleSystems = [];
        json.meshes.forEach((m) => {
            if (m.instances) {
                m.instances = [];
            }
        });
        json.meshes[0].parentId = undefined;

        // Descendants
        const descendants = mesh.getDescendants();
        descendants.forEach((d) => {
            if (d instanceof Light) { return json.lights.push(d.serialize()); }
        });

        const all = (json.meshes.concat(json.lights as any)) as IBabylonFileNode[];
        for (const node of all) {
            node.metadata = node.metadata ?? { };
            node.metadata.prefab = {
                prefabId,
                nodeId: Tools.RandomId(),
            };
        }

        const jsonStr = JSON.stringify(json, null, "\t");
        const prefabConfig = JSON.stringify({
            id: prefabId,
            sourceMeshId: mesh.id,
        }, null, "\t");

        editor.updateTaskFeedback(task, 50, "Writing Prefab...");
        await Tools.Wait(500);

        zip.addFile("prefab.json", Buffer.alloc(jsonStr.length, jsonStr), "Prefab Content");
        zip.addFile("config.json", Buffer.alloc(prefabConfig.length, prefabConfig), "Prefab Configuration");

        editor.updateTaskFeedback(task, 50, "Writing Material...");
        await Tools.Wait(500);

        // Add materials
        const materialsAssets = editor.assets.getComponent(MaterialAssets);
        if (materialsAssets) {
            for (const m of json.meshes) {
                if (!m.materialId) { continue; }
                const material = editor.scene!.getMaterialByID(m.materialId);
                if (!material) { continue; }

                const materialZip = materialsAssets.getZippedMaterial(m.materialId);
                if (materialZip) {
                    zip.addFile(join("materials", `${material.name}.zip`), materialZip.toBuffer());
                }
            }
        }

        // Add preview
        try {
            const previewFile = await AppTools.ShowOpenFileDialog("Choose optional preview image for prefab");
            const buffer = await readFile(previewFile);

            zip.addFile("preview.png", buffer);
        } catch (e) {
            editor.console.logWarning("You decided to not save any preview for your prefab.");
        }

        // Write prefab
        try {
            let destination: string;
            let tempDir: Undefinable<string> = undefined;

            if (as) {
                destination = await AppTools.ShowSaveFileDialog("Save Mesh Prefab");
            } else {
                destination = await Dialog.Show("Prefab name?", "Please provide a name for the prefab.");

                tempDir = await mkdtemp(join(tmpdir(), "babylonjs-editor"));
                destination = join(tempDir, destination);
            }

            const extension = extname(destination);
            if (extension !== ".meshprefab") { destination += ".meshprefab"; }

            zip.writeZip(destination);

            // Add prefab to collection
            editor.updateTaskFeedback(task, 100, "Adding to assets...");

            // const assets = editor.assets.getComponent(PrefabAssets);
            // await assets?.onDropFiles([{ path: destination, name: basename(destination) }]);
            // await assets?.refresh();

            // Remove temp file?
            if (tempDir) {
                try {
                    await remove(destination);
                    await rmdir(tempDir);
                } catch (e) {
                    // Catch silently.
                }
            }

            // Done
            editor.updateTaskFeedback(task, 100, "Done");
        } catch (e) {
            editor.console.logError(e.toString());
        } finally {
            editor.closeTaskFeedback(task, 500);
        }
    }

    /**
     * 
     * @param editor the editor reference.
     * @param json the prefab json.
     * @param rootUrl the root Url where to load the prefab.
     * @param id the id of the prefab file.
     */
    public static async LoadMeshPrefab(editor: Editor, json: IBabylonFile, rootUrl: string, id: string): Promise<ReturnType<typeof SceneLoader.ImportMeshAsync>> {
        const lights: Light[] = [];
        const result = await ProjectImporter.ImportMesh(editor, id, json, rootUrl, join("prefabs", `${id}_json_temp.json`));

        // Load lights
        json.lights.forEach((l) => {
            const light = Light.Parse(l, editor.scene!);
            if (!light) { return; }

            lights.push(light);
            light._waitingParentId = l.parentId ?? null;
        });

        // Waiting parentIds
        lights.forEach((l) => {
            if (l._waitingParentId) {
                l.parent = editor.scene!.getNodeByID(l._waitingParentId);
                l._waitingParentId = null;
            }
        });

        // Manage ids
        result.meshes.forEach((m) => {
            if (m instanceof Mesh) {
                m.getLODLevels().forEach((lod) => lod.mesh && (lod.mesh.id = Tools.RandomId()));
            }
        });
        result.particleSystems.forEach((ps) => ps.id = Tools.RandomId());
        result.skeletons.forEach((s) => s.id = Tools.RandomId());

        return result as any;
    }

    /**
     * Handles the new Ids for the prefab being created.
     * @param def the file definition to be loaded.
     */
    public static HandleIds(def: IBabylonFile): void {
        def.meshes.forEach((mesh) => {
            const id = mesh.id;
            mesh.id = Tools.RandomId();

            // Change parentId for all children
            def.meshes.forEach((m) => {
                if (m.parentId === id) { m.parentId = mesh.id; }
                m.instances.forEach((i) => {
                    if (i.parentId === id) { i.parentId = mesh.id; }
                });
            });
            def.lights.forEach((l) => {
                if (l.parentId === id) { l.parentId = mesh.id; }
            });

            // Instances of mesh
            mesh.instances.forEach((instance) => {
                const id = instance.id;
                instance.id = Tools.RandomId();

                // Change parentId for all children
                def.meshes.forEach((m) => {
                    if (m.parentId === id) { m.parentId = instance.id; }
                    m.instances.forEach((i) => {
                        if (i.parentId === id) { i.parentId = instance.id; }
                    });
                });
                def.lights.forEach((l) => {
                    if (l.parentId === id) { l.parentId = instance.id; }
                });
            });
        });

        def.lights.forEach((light) => {
            const id = light.id;
            light.id = Tools.RandomId();

            def.meshes.forEach((m) => {
                if (m.parentId === id) { m.parentId = light.id; }
                m.instances.forEach((i) => {
                    if (i.parentId === id) { i.parentId = light.id; }
                })
            });

            def.lights.forEach((l) => {
                if (l.parentId === id) { l.parentId = light.parentId; }
            });
        });
    }
}
