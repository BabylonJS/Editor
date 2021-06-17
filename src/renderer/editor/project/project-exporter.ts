import { join, normalize, basename, dirname } from "path";
import { pathExists, copy, writeFile, writeJSON, readdir, remove } from "fs-extra";

import {
    ShaderMaterial, Mesh, Tools as BabylonTools, RenderTargetTexture, DynamicTexture, MultiMaterial,
} from "babylonjs";

import filenamify from "filenamify";

import { GraphAssets } from "../assets/graphs";
import { PrefabAssets } from "../assets/prefabs";

import { Editor } from "../editor";
import { FSTools } from "../tools/fs";
import { Tools } from "../tools/tools";

import { Assets } from "../components/assets";

import { SceneExporter } from "./scene-exporter";
import { SceneSettings } from "../scene/settings";

import { Project } from "./project";
import { FilesStore } from "./files";
import { IProject } from "./typings";
import { WorkSpace } from "./workspace";
import { ProjectHelpers } from "./helpers";

import { MeshExporter } from "../export/mesh";
import { GeometryExporter } from "../export/geometry";

export class ProjectExporter {
    private static _IsSaving: boolean = false;

    /**
     * Asks the user where to export the project and exports the project in the selected folder.
     * @param editor the editor reference.
     */
    public static async SaveAs(editor: Editor): Promise<void> {
        const path = await Tools.ShowSaveDialog(Project.Path);
        Project.Path = join(path, "scene.editorproject");
        Project.DirPath = path;

        await Project.SetOpeningProject(Project.Path!);

        await this.Save(editor);
    }

    /**
     * Saves the project in the current location. If no path provided, a dialog will prompt to select
     * the folder where to export the project.
     * @param editor the editor reference.
     * @param skipGenerateScene defines wether or not the generation of the scene should be skipped.
     */
    public static async Save(editor: Editor, skipGenerateScene: boolean = false): Promise<void> {
        if (this._IsSaving) { return; }

        this._IsSaving = true;
        try {
            await this._Save(editor, skipGenerateScene);
        } catch (e) {
            console.error(e);
            editor.console.logError(e.message);
        }

        this._IsSaving = false;
    }

    /**
     * Saves the project
     */
    private static async _Save(editor: Editor, skipGenerateScene: boolean): Promise<void> {
        if (!Project.Path) { return this.SaveAs(editor); }

        // Check is isolated mode
        if (editor.preview.state.isIsolatedMode) {
            return editor.notifyMessage("Can't save when Isolated Mode is enabled.", 2000, "error");
        }

        editor.console.logSection("Exporting Project");
        editor.console.logInfo(`Exporting project to: ${Project.DirPath}`);
        editor.beforeSaveProjectObservable.notifyObservers(Project.DirPath!);

        const task = editor.addTaskFeedback(0, "Saving Files...");
        await Tools.Wait(500);

        // Create project
        const project: IProject = {
            filesList: [],
            cameras: [],
            materials: [],
            textures: [],
            meshes: [],
            transformNodes: [],
            particleSystems: [],
            lights: [],
            sounds: [],
            morphTargetManagers: [],
            scene: ProjectHelpers.ExportSceneSettings(editor.scene!),
            assets: {
                meshes: [],
                prefabs: PrefabAssets.Prefabs.map((p) => p.name),
                graphs: GraphAssets.Graphs.map((g) => g.name),
            },
            project: {
                camera: SceneSettings.Camera!.serialize(),
            },
            postProcesses: {
                ssao: { enabled: SceneSettings.IsSSAOEnabled(), json: SceneSettings.SSAOPipeline?.serialize() },
                screenSpaceReflections: { enabled: SceneSettings.IsScreenSpaceReflectionsEnabled(), json: SceneSettings.ScreenSpaceReflectionsPostProcess?.serialize() },
                default: { enabled: SceneSettings.IsDefaultPipelineEnabled(), json: SceneSettings.DefaultPipeline?.serialize() },
                motionBlur: { enabled: SceneSettings.IsMotionBlurEnabled(), json: SceneSettings.MotionBlurPostProcess?.serialize() },
            },
            physicsEnabled: Project.Project?.physicsEnabled ?? true,
        };

        const exportedMeshes: string[] = [];
        const exportedLights: string[] = [];
        const exportedShadows: string[] = [];
        const exportedCameras: string[] = [];
        const exportedTextures: string[] = [];
        const exportedGeometries: string[] = [];
        const exportedSounds: string[] = [];
        const exportedTransformNodes: string[] = [];
        const exportedParticleSystems: string[] = [];
        const exportedMorphTargets: string[] = [];

        let savePromises: Promise<void>[] = [];

        // Write all files
        const filesDir = join(Project.DirPath!, "files");
        await FSTools.CreateDirectory(filesDir);

        let progressValue = 0;
        let progressCount = 100 / FilesStore.GetFilesCount();

        for (const f in FilesStore.List) {
            const file = FilesStore.List[f];

            // Check if file still exists.
            if (!await pathExists(file.path)) {
                FilesStore.RemoveFileFromPath(file.path);
                continue;
            }

            const dest = join(filesDir, file.name);

            project.filesList.push(file.name);
            if ((await pathExists(dest))) {
                continue;
            }

            try {
                await copy(file.path, dest);
                editor.console.logInfo(`Copied resource file "${dest}"`);
            } catch (e) {
                editor.console.logError(`Failed to copy resource file "${file.path}" to "${dest}"`)
                throw e;
            }
            editor.updateTaskFeedback(task, progressValue += progressCount);
        }

        // Write all morph target managers
        const morphTargets: any[] = [];
        const morphTargetsDir = join(Project.DirPath!, "morphTargets");

        for (const mesh of editor.scene!.meshes) {
            if (!(mesh instanceof Mesh)) { continue; }

            const manager = mesh.morphTargetManager;
            if (manager) {
                morphTargets.push(manager.serialize());
            }
        }

        if (morphTargets.length) {
            editor.updateTaskFeedback(task, 0, "Saving Morph Target Managers");

            progressValue = 0;
            progressCount = 100 / morphTargets.length ?? 1;

            await FSTools.CreateDirectory(morphTargetsDir);

            for (const mtm of morphTargets) {
                const morphTargetManagerDest = `${mtm.id}.json`;

                savePromises.push(new Promise<void>(async (resolve) => {
                    await writeJSON(join(morphTargetsDir, morphTargetManagerDest), mtm, { encoding: "utf-8" });

                    project.morphTargetManagers!.push(morphTargetManagerDest);
                    exportedMorphTargets.push(morphTargetManagerDest);

                    editor.updateTaskFeedback(task, progressValue += progressCount);
                    editor.console.logInfo(`Saved morph target manager configuration "${mtm.id}"`);

                    resolve();
                }));
            }

            await Promise.all(savePromises);
            savePromises = [];
        }

        // Write all cameras
        editor.updateTaskFeedback(task, 0, "Saving Cameras");

        progressValue = 0;
        progressCount = 100 / editor.scene!.cameras.length;

        const camerasDir = join(Project.DirPath!, "cameras");
        await FSTools.CreateDirectory(camerasDir);

        for (const camera of editor.scene!.cameras) {
            if (camera.doNotSerialize) { continue; }

            const json = camera.serialize();
            const dest = `${normalize(`${basename(filenamify(camera.name))}-${camera.id}`)}.json`;
            await writeFile(join(camerasDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

            project.cameras.push(dest);
            exportedCameras.push(dest);

            editor.updateTaskFeedback(task, progressValue += progressCount);
            editor.console.logInfo(`Saved camera configuration "${camera.name}"`);
        }

        // Write all textures
        editor.updateTaskFeedback(task, 0, "Saving Textures");

        progressValue = 0;
        progressCount = 100 / editor.scene!.textures.length;

        const texturesDir = join(Project.DirPath!, "textures");
        await FSTools.CreateDirectory(texturesDir);

        for (const texture of editor.scene!.textures) {
            if (texture instanceof RenderTargetTexture || texture instanceof DynamicTexture) { continue; }
            if (texture.name.indexOf("data:") === 0 || texture === editor.scene!.environmentBRDFTexture) { continue; }
            
            savePromises.push(new Promise<void>(async (resolve) => {
                const json = texture.serialize();
                if (!json) { return resolve(); }

                if (json.isCube && !json.isRenderTarget && json.files && json.metadata?.isPureCube) {
                    // Replace Urls
                    json.files = json.files.map((f) => join("files", basename(f)));
                }

                const dest = `${normalize(`${filenamify(basename(texture.name))}-${texture.uniqueId.toString()}`)}.json`;
                await writeFile(join(texturesDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

                project.textures.push(dest);
                exportedTextures.push(dest);

                editor.updateTaskFeedback(task, progressValue += progressCount);
                editor.console.logInfo(`Saved texture configuration "${texture.name}"`);

                resolve();
            }));
        }

        await Promise.all(savePromises);
        savePromises = [];

        // Write all materials
        editor.updateTaskFeedback(task, 0, "Saving Materials");

        progressValue = 0;
        progressCount = 100 / (editor.scene!.materials.length + editor.scene!.multiMaterials.length);

        const materialsDir = join(Project.DirPath!, "materials");
        await FSTools.CreateDirectory(materialsDir);

        const materials = editor.scene!.materials.concat(editor.scene!.multiMaterials);

        for (const material of materials) {
            if (material instanceof ShaderMaterial || material === editor.scene!.defaultMaterial || material.doNotSerialize) {
                continue;
            }

            if (!material.metadata?.editorPath) {
                continue;
            }

            savePromises.push(new Promise<void>(async (resolve) => {
                const json = material.serialize();

                if (json.customType === "BABYLON.PBRMaterial" && json.environmentBRDFTexture) {
                    delete json.environmentBRDFTexture;
                }
                
                try {
                    json.metadata = Tools.CloneObject(material.metadata);
                } catch (e) {
                    // Catch silently.
                }

                const dest = join(editor.assetsBrowser.assetsDirectory, material.metadata.editorPath);
                await writeFile(dest, JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

                project.materials.push({
                    bindedMeshes: material.getBindedMeshes().map((m) => m.id),
                    json: material.metadata.editorPath,
                    isMultiMaterial: material instanceof MultiMaterial,
                });

                editor.updateTaskFeedback(task, progressValue += progressCount);
                editor.console.logInfo(`Saved material configuration "${material.name}"`);

                resolve();
            }));
        }

        await Promise.all(savePromises);
        savePromises = [];

        // Reorder material to have multi materials at the end.
        project.materials = project.materials.filter((m) => !m.isMultiMaterial).concat(project.materials.filter((m) => m.isMultiMaterial));

        // Write all meshes
        editor.updateTaskFeedback(task, 0, "Saving Meshes");

        progressValue = 0;
        progressCount = 100 / editor.scene!.meshes.length;

        const meshesDir = join(Project.DirPath!, "meshes");
        await FSTools.CreateDirectory(meshesDir);

        const geometriesDir = join(Project.DirPath!, "geometries");
        await FSTools.CreateDirectory(geometriesDir);

        for (const mesh of editor.scene!.meshes) {
            if (!(mesh instanceof Mesh) || mesh._masterMesh || mesh.doNotSerialize) { continue; }

            savePromises.push(new Promise<void>(async (resolve) => {
                const json = MeshExporter.ExportMesh(mesh);

                exportedGeometries.push.apply(exportedGeometries, await GeometryExporter.ExportIncrementalGeometries(editor, geometriesDir, json, false));

                for (const lod of json.lods) {
                    if (lod.mesh) {
                        exportedGeometries.push.apply(exportedGeometries, await GeometryExporter.ExportIncrementalGeometries(editor, geometriesDir, lod.mesh, false));
                    }
                };

                const dest = `${normalize(`${basename(filenamify(mesh.name))}-${mesh.id}`)}.json`;

                await writeFile(join(meshesDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

                project.meshes.push(dest);
                exportedMeshes.push(dest);

                editor.updateTaskFeedback(task, progressValue += progressCount);
                editor.console.logInfo(`Saved mesh configuration "${mesh.name}"`);

                resolve();
            }));
        }

        await Promise.all(savePromises);
        savePromises = [];

        // Write all lights
        editor.updateTaskFeedback(task, 0, "Saving Lights");

        progressValue = 0;
        progressCount = 100 / editor.scene!.lights.length;

        const lightsDir = join(Project.DirPath!, "lights");
        await FSTools.CreateDirectory(lightsDir);

        const shadowsDir = join(Project.DirPath!, "shadows");
        await FSTools.CreateDirectory(shadowsDir);

        for (const light of editor.scene!.lights) {
            const lightJson = light.serialize();
            const lightDest = `${normalize(`${basename(filenamify(light.name))}-${light.id}`)}.json`;

            await writeFile(join(lightsDir, lightDest), JSON.stringify(lightJson, null, "\t"), { encoding: "utf-8" });

            const shadowJson = light.getShadowGenerator()?.serialize();
            if (shadowJson) {
                const shadowDest = `${normalize(`${basename(filenamify(light.name))}-${light.id}`)}.json`;

                await writeFile(join(shadowsDir, shadowDest), JSON.stringify(shadowJson, null, "\t"), { encoding: "utf-8" });

                project.lights.push({ json: lightDest, shadowGenerator: shadowDest });
                exportedShadows.push(shadowDest);
            } else {
                project.lights.push({ json: lightDest, shadowGenerator: undefined });
            }

            exportedLights.push(lightDest);

            editor.updateTaskFeedback(task, progressValue += progressCount);
            editor.console.logInfo(`Saved light configuration "${light.name}"`);
        }

        // Write all transform nodes
        editor.updateTaskFeedback(task, 0, "Saving Transform Nodes");

        progressValue = 0;
        progressCount = 100 / editor.scene!.transformNodes.length;

        const transformNodesDir = join(Project.DirPath!, "transform");
        await FSTools.CreateDirectory(transformNodesDir);

        for (const transform of editor.scene!.transformNodes) {
            savePromises.push(new Promise<void>(async (resolve) => {
                const json = transform.serialize();
                const dest = `${normalize(`${filenamify(basename(transform.name))}-${transform.id}`)}.json`;

                await writeFile(join(transformNodesDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

                project.transformNodes.push(dest);
                exportedTransformNodes.push(dest);

                editor.updateTaskFeedback(task, progressValue += progressCount);
                editor.console.logInfo(`Saved transform node configuration "${transform.name}"`);

                resolve();
            }));
        }

        await Promise.all(savePromises);
        savePromises = [];

        // Write all particle systems
        editor.updateTaskFeedback(task, 0, "Saving Particle Systems");

        progressValue = 0;
        progressCount = 100 / editor.scene!.particleSystems.length;

        const particleSystemsDir = join(Project.DirPath!, "particleSystems");
        await FSTools.CreateDirectory(particleSystemsDir);

        for (const ps of editor.scene!.particleSystems) {
            const json = ps.serialize(true);
            const dest = `${normalize(`${basename(filenamify(ps.name))}-${ps.id}`)}.json`;

            await writeFile(join(particleSystemsDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

            project.particleSystems!.push(dest);
            exportedParticleSystems.push(dest);

            editor.updateTaskFeedback(task, progressValue += progressCount);
            editor.console.logInfo(`Saved particle system configuration "${ps.name}"`);
        }

        // Write all sounds
        editor.updateTaskFeedback(task, 0, "Saving Sounds");

        progressValue = 0;
        progressCount = 100 / editor.scene!.mainSoundTrack.soundCollection.length;

        const soundsDir = join(Project.DirPath!, "sounds");
        await FSTools.CreateDirectory(soundsDir);

        for (const s of editor.scene!.mainSoundTrack.soundCollection) {
            const json = s.serialize();
            json.url = basename(json.name);

            const dest = `${normalize(`${basename(filenamify(s.name))}`)}.json`;

            await writeFile(join(soundsDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

            project.sounds!.push(dest);
            exportedSounds.push(dest);

            editor.updateTaskFeedback(task, progressValue += progressCount);
            editor.console.logInfo(`Saved sound configuration "${s.name}"`);
        }

        // Write assets cache
        const assetsPath = join(Project.DirPath!, "assets");
        await FSTools.CreateDirectory(assetsPath);
        await writeFile(join(Project.DirPath!, "assets", "cache.json"), JSON.stringify(Assets.GetCachedData(), null, "\t"), { encoding: "utf-8" });

        // Write project!
        await writeFile(join(Project.DirPath!, "scene.editorproject"), JSON.stringify(project, null, "\t"), { encoding: "utf-8" });

        // Update worksapce
        if (WorkSpace.HasWorkspace()) {
            await WorkSpace.WriteWorkspaceFile(Project.Path);

            if (!skipGenerateScene && WorkSpace.Workspace!.generateSceneOnSave) {
                await SceneExporter.ExportFinalScene(editor, task);
            }
        }

        // Save project configuration
        Project.Project = project;

        // Done!
        editor.updateTaskFeedback(task, 100, "Done!");
        editor.closeTaskFeedback(task, 500);

        editor.console.logInfo(`Successfully saved project to: ${Project.DirPath!}`);
        editor.afterSaveProjectObservable.notifyObservers(Project.DirPath!);

        // Save editor config
        editor._saveEditorConfig();

        // Run clean in background
        this._CleanOutputDir(camerasDir, exportedCameras);
        this._CleanOutputDir(geometriesDir, exportedGeometries);
        this._CleanOutputDir(lightsDir, exportedLights);
        this._CleanOutputDir(meshesDir, exportedMeshes);
        this._CleanOutputDir(shadowsDir, exportedShadows);
        this._CleanOutputDir(texturesDir, exportedTextures);
        this._CleanOutputDir(soundsDir, exportedSounds);
        this._CleanOutputDir(particleSystemsDir, exportedParticleSystems);
        this._CleanOutputDir(transformNodesDir, exportedTransformNodes);
        this._CleanOutputDir(morphTargetsDir, exportedMorphTargets);

        // Update recent projects to be shown in welcome wizard
        this._UpdateWelcomeRecentProjects(editor);
    }

    /**
     * Returns the list of ALL exported files located in the scene's output folder.
     * @scenePath defines the absolute path to the .babylon file.
     * @filesPaths defines the list of all resource files of the scene.
     */
    public static async ListExportedFiles(): Promise<{ scenePath: string; filesPaths: string[]; incrementalFiles: string[]; }> {
        const projectName = basename(dirname(WorkSpace.Workspace!.lastOpenedScene));
        const projectDir = join(WorkSpace.DirPath!, "scenes", projectName);

        const scenePath = join(projectDir, "scene.babylon");
        const filesPaths = (await readdir(join(projectDir, "files"))).map((f) => join(projectDir, "files", f));

        let incrementalFiles: string[] = [];
        if (WorkSpace.Workspace!.useIncrementalLoading) {
            incrementalFiles = (await readdir(join(projectDir, "geometries"))).map((f) => join(projectDir, "geometries", f));
        }

        return { scenePath, filesPaths, incrementalFiles };
    }

    /**
     * Cleans the given output dir.
     */
    public static async _CleanOutputDir(directory: string, exportedFiles: string[]): Promise<void> {
        try {
            const outputFiles = await readdir(directory);

            for (const outputFile of outputFiles) {
                if (!exportedFiles.find((ef) => basename(ef) === outputFile)) {
                    remove(join(directory, outputFile));
                }
            }
        } catch (e) {
            // Catch silently.
        }
    }

    /**
     * Updates the list of recent projects.
     */
    private static async _UpdateWelcomeRecentProjects(editor: Editor): Promise<void> {
        editor.scene!.render();
        const preview = await BabylonTools.CreateScreenshotAsync(editor.engine!, editor.scene!.activeCamera!, {
            width: 3840,
            height: 2160
        });

        const data = localStorage.getItem("babylonjs-editor-welcome");
        const welcome = data ? JSON.parse(data) : [];
        const path = WorkSpace.Path ?? Project.Path;

        const item = welcome.find((w) => w.path === path);
        if (item) {
            item.preview = preview;
        } else {
            welcome.splice(0, 0, { path, preview });
        }

        if (welcome.length > 3) { welcome.pop(); }

        localStorage.setItem("babylonjs-editor-welcome", JSON.stringify(welcome));
    }
}
