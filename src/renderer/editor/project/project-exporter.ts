import { mkdir, pathExists, copy, writeFile, writeJSON, readFile, readJSON, readdir, remove, createWriteStream } from "fs-extra";
import { join, normalize, basename, dirname, extname } from "path";

import { SceneSerializer, ShaderMaterial, Mesh, Tools as BabylonTools, RenderTargetTexture, DynamicTexture, MultiMaterial } from "babylonjs";
import { LGraph } from "litegraph.js";

import filenamify from "filenamify";

import { MeshesAssets } from "../assets/meshes";
import { PrefabAssets } from "../assets/prefabs";
import { GraphAssets } from "../assets/graphs";

import { Editor } from "../editor";
import { Tools } from "../tools/tools";

import { Assets } from "../components/assets";
import { ScriptAssets } from "../assets/scripts";

import { SceneSettings } from "../scene/settings";
import { SceneExportOptimzer } from "../scene/export-optimizer";

import { GraphCode } from "../graph/graph";
import { GraphCodeGenerator } from "../graph/generate";

import { WorkSpace } from "./workspace";
import { Project } from "./project";
import { FilesStore } from "./files";
import { IProject } from "./typings";
import { ProjectHelpers } from "./helpers";

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
                meshes: MeshesAssets.Meshes.map((m) => m.name),
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
            }
        };

        const exportedMeshes: string[] = [];
        const exportedLights: string[] = [];
        const exportedShadows: string[] = [];
        const exportedCameras: string[] = [];
        const exportedMaterials: string[] = [];
        const exportedTextures: string[] = [];
        const exportedGeometries: string[] = [];
        const exportedSounds: string[] = [];
        const exportedTransformNodes: string[] = [];
        const exportedParticleSystems: string[] = [];
        const exportedMorphTargets: string[] = [];

        let savePromises: Promise<void>[] = [];

        // Write all files
        const filesDir = join(Project.DirPath!, "files");
        if (!(await pathExists(filesDir))) { await mkdir(filesDir); }

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

            if (!(await pathExists(morphTargetsDir))) { await mkdir(morphTargetsDir); }

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
        if (!(await pathExists(camerasDir))) { await mkdir(camerasDir); }

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
        if (!(await pathExists(texturesDir))) { await mkdir(texturesDir); }

        for (const texture of editor.scene!.textures) {
            if (texture instanceof RenderTargetTexture || texture instanceof DynamicTexture) { continue; }
            if (texture.name.indexOf("data:") === 0) { continue; }

            savePromises.push(new Promise<void>(async (resolve) => {
                const json = texture.serialize();
                if (!json) { return resolve(); }

                if (json.isCube && !json.isRenderTarget && json.files && json.metadata?.isPureCube) {
                    // Replace Urls
                    json.files = json.files.map((f) => join("files", basename(f)));
                }
                
                json.name = join("./", "files", basename(texture.name));
                json.url = join("./", "files", basename(texture.name));

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
        if (!(await pathExists(materialsDir))) { await mkdir(materialsDir); }

        const materials = editor.scene!.materials.concat(editor.scene!.multiMaterials);

        for (const material of materials) {
            if (material instanceof ShaderMaterial || material === editor.scene!.defaultMaterial || material.doNotSerialize) { continue; }

            savePromises.push(new Promise<void>(async (resolve) => {
                const json = material.serialize();
                if (material.metadata) {
                    try {
                        json.metadata = Tools.CloneObject(material.metadata);
                    } catch (e) {
                        // Catch silently.
                    }
                }

                const dest = `${normalize(`${basename(filenamify(material.name))}-${material.id}`)}.json`;
                await writeFile(join(materialsDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

                project.materials.push({
                    bindedMeshes: material.getBindedMeshes().map((m) => m.id),
                    json: dest,
                    isMultiMaterial: material instanceof MultiMaterial,
                });
                exportedMaterials.push(dest);

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
        if (!(await pathExists(meshesDir))) { await mkdir(meshesDir); }

        const geometriesDir = join(Project.DirPath!, "geometries");
        if (!(await pathExists(geometriesDir))) { await mkdir(geometriesDir); }

        for (const mesh of editor.scene!.meshes) {
            if (!(mesh instanceof Mesh) || mesh._masterMesh || mesh.doNotSerialize) { continue; }
            
            savePromises.push(new Promise<void>(async (resolve) => {
                const json = this.ExportMesh(mesh);

                exportedGeometries.push.apply(exportedGeometries, this._WriteIncrementalGeometryFiles(editor, geometriesDir, json, false));

                json.lods.forEach((lod) => {
                    if (lod.mesh) {
                        exportedGeometries.push.apply(exportedGeometries, this._WriteIncrementalGeometryFiles(editor, geometriesDir, lod.mesh, false));
                    }
                });

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
        if (!(await pathExists(lightsDir))) { await mkdir(lightsDir); }

        const shadowsDir = join(Project.DirPath!, "shadows");
        if (!(await pathExists(shadowsDir))) { await mkdir(shadowsDir); }

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
        if (!(await pathExists(transformNodesDir))) { await mkdir(transformNodesDir); }

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
        if (!(await pathExists(particleSystemsDir))) { await mkdir(particleSystemsDir); }

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
        if (!(await pathExists(soundsDir))) { await mkdir(soundsDir); }

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
        if (!(await pathExists(assetsPath))) { await mkdir(assetsPath); }
        await writeFile(join(Project.DirPath!, "assets", "cache.json"), JSON.stringify(Assets.GetCachedData(), null, "\t"), { encoding: "utf-8" });

        // Write project!
        await writeFile(join(Project.DirPath!, "scene.editorproject"), JSON.stringify(project, null, "\t"), { encoding: "utf-8" });

        // Update worksapce
        if (WorkSpace.HasWorkspace()) {
            await WorkSpace.WriteWorkspaceFile(Project.Path);

            if (!skipGenerateScene && WorkSpace.Workspace!.generateSceneOnSave) {
                await this.ExportFinalScene(editor, task);
            }
        }

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
        this._CleanOutputDir(materialsDir, exportedMaterials);
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
     * Exports the given mesh.
     * @param mesh the mesh reference to export.
     * @param withParents defines if parents must be serialized as well
     * @param withChildren defines if children must be serialized as well
     */
    public static ExportMesh(mesh: Mesh, withParents: boolean = false, withChildren: boolean = false): any {
        if (mesh.metadata?.isPickable) {
            mesh.isPickable = mesh.metadata.isPickable;
        }
        
        const meshMetadata = Tools.GetMeshMetadata(mesh);
        const waitingUpdatedReferences = meshMetadata._waitingUpdatedReferences;

        if (waitingUpdatedReferences) {
            delete meshMetadata._waitingUpdatedReferences;
        }

        const json = SceneSerializer.SerializeMesh(mesh, withParents, withChildren);
        json.materials = [];
        json.multiMaterials = [];
        json.meshes?.forEach((m) => {
            if (m.metadata) {
                m.metadata = Tools.CloneObject(m.metadata);
            }

            // TODO: fix in babylonjs where restitution is equal to mass when serializing mesh.
            if (mesh.physicsImpostor) {
                m.physicsRestitution = mesh.physicsImpostor.getParam("restitution");
            }

            delete m.renderOverlay;
        });

        if (mesh.metadata?.isPickable) {
            mesh.isPickable = true;
        }

        json.lods = [];
        for (const lod of mesh.getLODLevels()) {
            const lodJson = { distance: lod.distance, mesh: null as any };
            if (lod.mesh) {
                lodJson.mesh = SceneSerializer.SerializeMesh(lod.mesh, false, false);
                lodJson.mesh!.materials = [];
            }

            json.lods.push(lodJson);
        }

        meshMetadata._waitingUpdatedReferences = waitingUpdatedReferences;

        return json;
    }

    /**
     * Returns the final scene in its JSON representation.
     * @param editor defines the reference to the editor.
     */
    public static GetFinalSceneJson(editor: Editor): any {
        // Sounds
        if (editor.scene!.soundTracks?.indexOf(editor.scene!.mainSoundTrack) === -1) {
            editor.scene!.soundTracks.push(editor.scene!.mainSoundTrack);
        }

        // Optimize
        const optimizer = new SceneExportOptimzer(editor.scene!);
        optimizer.optimize();

        // Configure nodes that are not serializable.
        Tools.getAllSceneNodes(editor.scene!).forEach((n) => {
            if (n.metadata?.doNotExport === true) {
                n.doNotSerialize = true;
            }
        });

        const scene = SceneSerializer.Serialize(editor.scene!);
        scene.metadata = scene.metadata ?? { };
        scene.metadata.postProcesses = {
            ssao: { enabled: SceneSettings.IsSSAOEnabled(), json: SceneSettings.SSAOPipeline?.serialize() },
            screenSpaceReflections: { enabled: SceneSettings.IsScreenSpaceReflectionsEnabled(), json: SceneSettings.ScreenSpaceReflectionsPostProcess?.serialize() },
            default: { enabled: SceneSettings.IsDefaultPipelineEnabled(), json: SceneSettings.DefaultPipeline?.serialize() },
            motionBlur: { enabled: SceneSettings.IsMotionBlurEnabled(), json: SceneSettings.MotionBlurPostProcess?.serialize() },
        };

        // Set producer
        scene.producer = {
            file: "scene.babylon",
            name: "Babylon.JS Editor",
            version: `v${editor._packageJson.version}`,
            exporter_version: `v${editor._packageJson.dependencies.babylonjs}`,
        };

        // Active camera
        scene.activeCameraID = scene.cameras[0]?.id;
        
        // LODs
        scene.meshes?.forEach((m) => {
            if (!m) { return; }

            delete m.renderOverlay;

            const exportedMeshMetadata = m.metadata;
            const waitingUpdatedReferences = exportedMeshMetadata?._waitingUpdatedReferences;
            if (waitingUpdatedReferences) {
                delete m.metadata._waitingUpdatedReferences;
                m.metadata = Tools.CloneObject(m.metadata);
                exportedMeshMetadata._waitingUpdatedReferences = waitingUpdatedReferences;
            }

            const mesh = editor.scene!.getMeshByID(m.id);
            if (!mesh || !(mesh instanceof Mesh)) { return; }

            const lods = mesh.getLODLevels();
            if (!lods.length) { return; }

            m.lodMeshIds = lods.map((lod) => lod.mesh?.id);
            m.lodDistances = lods.map((lod) => lod.distance);
            m.lodCoverages = lods.map((lod) => lod.distance);
        });

        // Physics
        if (scene.physicsEnabled && scene.physicsEngine && WorkSpace.Workspace?.physicsEngine) {
            scene.physicsEngine = WorkSpace.Workspace?.physicsEngine;
        }

        scene.meshes?.forEach((m) => {
            const existingMesh = editor.scene!.getMeshByID(m.id);
            if (!existingMesh?.physicsImpostor) { return; }

            m.physicsRestitution = existingMesh.physicsImpostor.getParam("restitution");
        });

        // Clean
        optimizer.clean();

        // Restore nodes that are not serialized.
        Tools.getAllSceneNodes(editor.scene!).forEach((n) => {
            if (n.metadata?.doNotExport === true) {
                n.doNotSerialize = false;
            }
        });

        return scene;
    }

    /**
     * Returns the location of the exported scene on the file system.
     */
    public static GetExportedSceneLocation(): string {
        const projectName = basename(dirname(WorkSpace.Workspace!.lastOpenedScene));
        return join(WorkSpace.DirPath!, "scenes", projectName);
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
     * Exports the current scene into .babylon format including only geometries.
     * @param editor defines the editor reference.
     */
    public static async ExportFinalSceneOnlyGeometries(editor: Editor): Promise<void> {
        // Generate scene
        const scene = this.GetFinalSceneJson(editor);
        if (!scene) { return; }

        scene.materials = [];
        scene.lights = [];
        scene.cameras = [];
        scene.shadowGenerators = [];
        scene.particleSystems = [];
        scene.meshes?.forEach((m) => m.materialId = null);

        // Save
        let destPath = await Tools.ShowSaveFileDialog("Save Scene (Only Geometries)");
        if (!destPath) { return; }

        if (extname(destPath).toLowerCase() !== ".babylon") {
            destPath += ".babylon";
        }

        await writeFile(destPath, JSON.stringify(scene), { encoding: "utf-8" });
    }

    /**
     * Exports the final scene and asks for the destination folder.
     * @param editor defines the reference to the editor.
     */
    public static async ExportFinalSceneAs(editor: Editor): Promise<void> {
        const destPath = await Tools.ShowSaveDialog();
        if (!destPath) { return; }

        return this.ExportFinalScene(editor, undefined, destPath);
    }

    /**
     * Eports the final scene.
     * @param editor the editor reference.
     * @param task defines the already existing task feedback to reuse.
     * @param destPath defines the optional path where to save to final scene.
     */
    public static async ExportFinalScene(editor: Editor, task?: string, destPath?: string): Promise<void> {
        if (!WorkSpace.HasWorkspace()) { return; }

        // Check is isolated mode
        if (editor.preview.state.isIsolatedMode) {
            return editor.notifyMessage("Can't export when Isolated Mode is enabled.", 2000, "error");
        }

        task = task ?? editor.addTaskFeedback(0, "Generating Final Scene");
        editor.updateTaskFeedback(task, 0, "Generating Final Scene");

        editor.console.logInfo("Serializing scene...");
        const scene = this.GetFinalSceneJson(editor);

        const scenePath = destPath ?? this.GetExportedSceneLocation();
        if (!(await pathExists(scenePath))) { await mkdir(scenePath); }
        const destFilesDir = join(scenePath, "files");

        editor.updateTaskFeedback(task, 50);
        editor.beforeGenerateSceneObservable.notifyObservers(scenePath);

        // Handle incremental loading
        const geometriesPath = join(scenePath, "geometries");
        const incrementalFolderExists = await pathExists(geometriesPath);

        if (incrementalFolderExists) {
            const incrementalFiles = await readdir(geometriesPath);

            try {
                await Promise.all(incrementalFiles.map((f) => remove(join(geometriesPath, f))));
            } catch (e) {
                editor.console.logError("Failed to remove incremental geometry file");
            }
        }

        if (!WorkSpace.Workspace?.useIncrementalLoading) {
            try {
                await remove(geometriesPath);
            } catch (e) {
                editor.console.logError("Failed to remove geometries output folder.");
            }
        } else {
            if (!incrementalFolderExists) {
                await mkdir(geometriesPath);
            }

            this._WriteIncrementalGeometryFiles(editor, geometriesPath, scene, true, task);
        }

        // Handle node material textures
        for (const m of scene.materials ?? []) {
            if (m?.customType !== "BABYLON.NodeMaterial") { continue; }
            for (const b of m.blocks ?? []) {
                if ((b?.customType !== "BABYLON.TextureBlock" && b?.customType !== "BABYLON.ReflectionTextureBlock") || !b.texture?.name) { continue; }
                if (b.texture.name.indexOf("data:") !== 0) { continue; }

                if (b.customType === "BABYLON.TextureBlock") {
                    b.texture.url = b.texture.name;
                    b.texture.name = b.texture.metadata?.editorName ?? Tools.RandomId();
                } else {
                    b.texture.url = `data:${Tools.RandomId()}`;
                }
            }
        }

        editor.updateTaskFeedback(task, 50, "Writing scene...");
        await writeJSON(join(scenePath, "scene.babylon"), scene);

        // Copy files
        const step = FilesStore.GetFilesCount() / 50;
        let progress = 50;

        if (!(await pathExists(destFilesDir))) { await mkdir(destFilesDir); }

        for (const f in FilesStore.List) {
            const file = FilesStore.List[f];
            const dest = join(destFilesDir, file.name);

            if ((await pathExists(dest))) {
                continue;
            }

            try {
                await copy(file.path, dest);
                editor.console.logInfo(`Copied resource file to: ${dest}`);
            } catch (e) {
                editor.console.logError(`Failed to copy resource file "${file.path}" to "${dest}"`);
            }
            editor.updateTaskFeedback(task, progress += step);
        }

        // Clean unused files
        try {
            const existingFiles = await readdir(destFilesDir);
            for (const existingFile of existingFiles) {
                if (FilesStore.GetFileFromBaseName(existingFile)) {
                    continue;
                }

                const removePath = join(destFilesDir, existingFile);

                try {
                    await remove(removePath);
                    editor.console.logInfo(`Removed unused resource file ${removePath}`);
                } catch (e) {
                    // Catch silently.
                    editor.console.logError(`Failed to remove unused resource file ${removePath}`);
                }
            }
        } catch (e) {
            // Catch silently.
        }

        // Tools
        await this.GenerateScripts(editor);

        editor.updateTaskFeedback(task, 100);
        editor.closeTaskFeedback(task, 1000);

        editor.afterGenerateSceneObservable.notifyObservers(scenePath);
        editor.console.logInfo(`Successfully generated scene at ${scenePath}`);
    }

    /**
     * Generates the scripts for the project. Will wirte the "tools.ts" file and all index.ts files.
     * @param editor defines the reference to the editor.
     */
    public static async GenerateScripts(editor: Editor): Promise<void> {
        editor.console.logInfo("Copyging tools...");
        const decorators = await readFile(join(Tools.GetAppPath(), "assets", "scripts", "decorators.ts"), { encoding: "utf-8" });
        const tools = await readFile(join(Tools.GetAppPath(), "assets", "scripts", "tools.ts"), { encoding: "utf-8" });

        const finalTools = tools.replace("// ${decorators}", decorators)
                                .replace("${editor-version}", editor._packageJson.version);

        await writeFile(join(WorkSpace.DirPath!, "src", "scenes", "tools.ts"), finalTools, { encoding: "utf-8" });

        // Export scripts
        editor.console.logInfo("Configuring scripts...");
        const scriptsContent = await readFile(join(Tools.GetAppPath(), "assets", "scripts", "scene", "index.ts"), { encoding: "utf-8" });
        const newScriptContent = await this._UpdateScriptContent(editor, scriptsContent);

        const indexPath = join(WorkSpace.DirPath!, "src", "scenes", WorkSpace.GetProjectName());
        if (!(await pathExists(indexPath))) { await mkdir(indexPath); }

        await writeFile(join(indexPath, "index.ts"), newScriptContent, { encoding: "utf-8" });
    }

    /**
     * Exports all available graphs in the scene.
     * @param editor defines the reference to the editor.
     */
    public static async ExportGraphs(editor: Editor): Promise<void> {
        // Write all graphs
        const destGraphs = join(WorkSpace.DirPath!, "src", "scenes", WorkSpace.GetProjectName(), "graphs");
        if (!(await pathExists(destGraphs))) {
            await mkdir(destGraphs);
        }

        const graphs = editor.assets.getAssetsOf(GraphAssets);
        if (graphs?.length) {
            GraphCode.Init();
            await GraphCodeGenerator.Init();
        }

        for (const g of graphs ?? []) {
            const extension = extname(g.id);
            const name = g.id.replace(extension, "");
            const json = await readJSON(g.key);

            try {
                const code = GraphCodeGenerator.GenerateCode(new LGraph(json))?.replace("${editor-version}", editor._packageJson.version);
                await writeFile(join(destGraphs, `${name}.ts`), code);
            } catch (e) {
                console.error(e);
            }
        }
    }

    /**
     * When using incremental export, write all the .babylonbinarymesh files into the "geometries" output folder.
     */
    private static _WriteIncrementalGeometryFiles(editor: Editor, path: string, scene: any, finalExport: boolean, task?: string): string[] {
        if (task) {
            editor.updateTaskFeedback(task, 0, "Exporting incremental files...");
        }

        const result: string[] = [];

        scene.meshes?.forEach((m, index) => {
            if (!m.geometryId || (finalExport && m.metadata?.keepGeometryInline)) { return; }

            const geometry = scene.geometries?.vertexData?.find((v) => v.id === m.geometryId);
            if (!geometry) { return; }

            const geometryFileName = `${geometry.id}.babylonbinarymeshdata`;
            const originMesh = editor.scene!.getMeshByID(m.id);

            m.delayLoadingFile = `geometries/${geometryFileName}`;
            m.boundingBoxMaximum = originMesh?.getBoundingInfo()?.maximum?.asArray() ?? [0, 0, 0];
            m.boundingBoxMinimum = originMesh?.getBoundingInfo()?.minimum?.asArray() ?? [0, 0, 0];
            m._binaryInfo = { };

            const geometryPath = join(path, geometryFileName);
            const stream = createWriteStream(geometryPath);

            let offset = 0;

            if (geometry.positions) {
                m._binaryInfo.positionsAttrDesc = { count: geometry.positions.length, stride: 3, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.positions).buffer));

                m.positions = null;
                offset += geometry.positions.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.normals) {
                m._binaryInfo.normalsAttrDesc = { count: geometry.normals.length, stride: 3, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.normals).buffer));

                m.normals = null;
                offset += geometry.normals.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.uvs) {
                m._binaryInfo.uvsAttrDesc = { count: geometry.uvs.length, stride: 2, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.uvs).buffer));

                m.uvs = null;
                m.hasUVs = true;
                offset += geometry.uvs.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.uv2s) {
                m._binaryInfo.uvs2AttrDesc = { count: geometry.uv2s.length, stride: 2, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.uv2s).buffer));

                m.uv2s = null;
                m.hasUVs2 = true;
                offset += geometry.uv2s.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.tangents) {
                m._binaryInfo.tangetsAttrDesc = { count: geometry.tangents.length, stride: 3, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.tangents).buffer));

                m.tangents = null;
                offset += geometry.tangents.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.colors) {
                m._binaryInfo.colorsAttrDesc = { count: geometry.colors.length, stride: 4, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.colors).buffer));

                m.colors = null;
                offset += geometry.colors.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.matricesIndices) {
                const matricesIndices: number[] = [];

                for (let i = 0; i < geometry.matricesIndices.length; i += 4) {
                    matricesIndices.push(geometry.matricesIndices[i]);
                }

                m._binaryInfo.matricesIndicesAttrDesc = { count: matricesIndices.length, stride: 1, offset, dataType: 0 };
                stream.write(Buffer.from(new Int32Array(matricesIndices).buffer));

                m.matricesIndices = null;
                m.hasMatricesIndices = true;
                offset += matricesIndices.length * Int32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.matricesWeights) {
                m._binaryInfo.matricesWeightsAttrDesc = { count: geometry.matricesWeights.length, stride: 2, offset, dataType: 1 };
                stream.write(Buffer.from(new Float32Array(geometry.matricesWeights).buffer));

                m.matricesWeights = null;
                m.hasMatricesWeights = true;
                offset += geometry.matricesWeights.length * Float32Array.BYTES_PER_ELEMENT;
            }

            if (geometry.indices) {
                m._binaryInfo.indicesAttrDesc = { count: geometry.indices.length, stride: 1, offset, dataType: 0 };
                stream.write(Buffer.from(new Int32Array(geometry.indices).buffer));

                m.indices = null;
                offset += geometry.indices.length * Int32Array.BYTES_PER_ELEMENT;
            }

            if (m.subMeshes?.length > 0) {
                const subMeshesData: number[] = [];
                m.subMeshes.forEach((sm) => {
                    subMeshesData.push( sm.materialIndex, sm.verticesStart, sm.verticesCount, sm.indexStart, sm.indexCount);
                });

                m._binaryInfo.subMeshesAttrDesc = { count: m.subMeshes.length, stride: 5, offset, dataType: 0 };
                m.subMeshes = null;

                stream.write(Buffer.from(new Int32Array(subMeshesData).buffer));
                offset += subMeshesData.length * Int32Array.BYTES_PER_ELEMENT;
            }

            stream.end();
            stream.close();

            if (task) {
                editor.updateTaskFeedback(task, 100 * (index / scene.meshes.length));
            }

            result.push(geometryPath);

            const geometryIndex = scene.geometries.vertexData.findIndex((g) => g.id === m.geometryId);
            if (geometryIndex !== -1) {
                scene.geometries.vertexData.splice(geometryIndex, 1);
            }
        });

        if (scene.geometries?.vertexData?.length === 0) {
            delete scene.geometries;
        }

        return result;
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
     * Updates the script content to be written.
     */
    private static async _UpdateScriptContent(editor: Editor, scriptsContent: string): Promise<string> {
        // Write all graphs.
        await this.ExportGraphs(editor);

        // Export scripts.
        const all = await ScriptAssets.GetAllScripts();
        return scriptsContent.replace("${editor-version}", editor._packageJson.version).replace("// ${scripts}", all.map((s) => {
            const toReplace = `src/scenes/${WorkSpace.GetProjectName()}/`;
            const extension = extname(s);
            return `\t"${s}": require("./${s.replace(toReplace, "").replace(extension, "")}"),`;
        }).join("\n")).replace("// ${scriptsInterface}", all.map((s) => {
            return `\t"${s}": any;`;
        }).join("\n"));
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
