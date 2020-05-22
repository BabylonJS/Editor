import { mkdir, pathExists, copy, writeFile, writeJSON, readFile } from "fs-extra";
import { join, normalize, basename, dirname } from "path";

import { SceneSerializer, ShaderMaterial, Mesh, Tools as BabylonTools, RenderTargetTexture, DynamicTexture, MultiMaterial } from "babylonjs";

import { MeshesAssets } from "../assets/meshes";
import { PrefabAssets } from "../assets/prefabs";
import { GraphAssets } from "../assets/graphs";

import { Editor } from "../editor";
import { Tools } from "../tools/tools";

import { Assets } from "../components/assets";
import { ScriptAssets } from "../assets/scripts";

import { SceneSettings } from "../scene/settings";

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
                standard: { enabled: SceneSettings.IsStandardPipelineEnabled(), json: SceneSettings.StandardPipeline?.serialize() },
                default: { enabled: SceneSettings.IsDefaultPipelineEnabled(), json: SceneSettings.DefaultPipeline?.serialize() },
            }
        };

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

            await copy(file.path, dest);
            editor.updateTaskFeedback(task, progressValue += progressCount);
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
            const dest = `${normalize(`${basename(camera.name)}-${camera.id}`)}.json`;
            await writeFile(join(camerasDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

            project.cameras.push(dest);
            editor.updateTaskFeedback(task, progressValue += progressCount);
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

            const json = texture.serialize();
            if (!json) { continue; }
            
            json.name = join("./", "files", basename(texture.name));
            json.url = join("./", "files", basename(texture.name));

            const dest = `${normalize(`${basename(texture.name)}-${texture.uniqueId.toString()}`)}.json`;
            await writeFile(join(texturesDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

            project.textures.push(dest);
            editor.updateTaskFeedback(task, progressValue += progressCount);
        }

        // Write all materials
        editor.updateTaskFeedback(task, 0, "Saving Materials");

        progressValue = 0;
        progressCount = 100 / (editor.scene!.materials.length + editor.scene!.multiMaterials.length);

        const materialsDir = join(Project.DirPath!, "materials");
        if (!(await pathExists(materialsDir))) { await mkdir(materialsDir); }

        const materials = editor.scene!.materials.concat(editor.scene!.multiMaterials);

        for (const material of materials) {
            if (material instanceof ShaderMaterial || material === editor.scene!.defaultMaterial) { continue; }

            const json = material.serialize();

            const dest = `${normalize(`${basename(material.name)}-${material.id}`)}.json`;
            await writeFile(join(materialsDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });

            project.materials.push({
                bindedMeshes: material.getBindedMeshes().map((m) => m.id),
                json: dest,
                isMultiMaterial: material instanceof MultiMaterial,
            });
            editor.updateTaskFeedback(task, progressValue += progressCount);
        }

        // Write all meshes
        editor.updateTaskFeedback(task, 0, "Saving Meshes");

        progressValue = 0;
        progressCount = 100 / editor.scene!.meshes.length;

        const meshesDir = join(Project.DirPath!, "meshes");
        if (!(await pathExists(meshesDir))) { await mkdir(meshesDir); }

        for (const mesh of editor.scene!.meshes) {
            if (!(mesh instanceof Mesh) || mesh._masterMesh) { continue; }
            
            const json = this.ExportMesh(mesh);
            const dest = `${normalize(`${basename(mesh.name)}-${mesh.id}`)}.json`;

            await writeFile(join(meshesDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });
            project.meshes.push(dest);
            editor.updateTaskFeedback(task, progressValue += progressCount);
        }

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
            const lightDest = `${normalize(`${basename(light.name)}-${light.id}`)}.json`;

            await writeFile(join(lightsDir, lightDest), JSON.stringify(lightJson, null, "\t"), { encoding: "utf-8" });

            const shadowJson = light.getShadowGenerator()?.serialize();
            if (shadowJson) {
                const shadowDest = `${normalize(`${basename(light.name)}-${light.id}`)}.json`;
                
                await writeFile(join(shadowsDir, shadowDest), JSON.stringify(shadowJson, null, "\t"), { encoding: "utf-8" });
                project.lights.push({ json: lightDest, shadowGenerator: shadowDest });
            } else {
                project.lights.push({ json: lightDest, shadowGenerator: undefined });
            }

            editor.updateTaskFeedback(task, progressValue += progressCount);
        }

        // Write all transform nodes
        editor.updateTaskFeedback(task, 0, "Saving Transform Nodes");

        progressValue = 0;
        progressCount = 100 / editor.scene!.transformNodes.length;

        const transformNodesDir = join(Project.DirPath!, "transform");
        if (!(await pathExists(transformNodesDir))) { await mkdir(transformNodesDir); }

        for (const transform of editor.scene!.transformNodes) {
            const json = transform.serialize();
            const dest = `${normalize(`${basename(transform.name)}-${transform.id}`)}.json`;

            await writeFile(join(transformNodesDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });
            project.transformNodes.push(dest);

            editor.updateTaskFeedback(task, progressValue += progressCount);
        }

        // Write all particle systems
        editor.updateTaskFeedback(task, 0, "Saving Particle Systems");

        progressValue = 0;
        progressCount = 100 / editor.scene!.particleSystems.length;

        const particleSystemsDir = join(Project.DirPath!, "particleSystems");
        if (!(await pathExists(particleSystemsDir))) { await mkdir(particleSystemsDir); }

        for (const ps of editor.scene!.particleSystems) {
            const json = ps.serialize(true);
            const dest = `${normalize(`${basename(ps.name)}-${ps.id}`)}.json`;

            await writeFile(join(particleSystemsDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });
            project.particleSystems!.push(dest);

            editor.updateTaskFeedback(task, progressValue += progressCount);
        }

        // Write all sounds
        editor.updateTaskFeedback(task, 0, "Saving Sounds");

        progressValue = 0;
        progressCount = 100 / editor.scene!.mainSoundTrack.soundCollection.length;

        const soundsDir = join(Project.DirPath!, "sounds");
        if (!(await pathExists(soundsDir))) { await mkdir(soundsDir); }

        for (const s of editor.scene!.mainSoundTrack.soundCollection) {
            const json = s.serialize();
            const dest = `${normalize(`${basename(s.name)}`)}.json`;

            await writeFile(join(soundsDir, dest), JSON.stringify(json, null, "\t"), { encoding: "utf-8" });
            project.sounds!.push(dest);

            editor.updateTaskFeedback(task, progressValue += progressCount);
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
        mesh.isPickable = mesh.metadata.isPickable;

        const json = SceneSerializer.SerializeMesh(mesh, withParents, withChildren);
        json.materials = [];
        json.multiMaterials = [];
        json.meshes?.forEach((m) => {
            delete m.renderOverlay;
        });

        mesh.isPickable = true;

        json.lods = [];
        for (const lod of mesh.getLODLevels()) {
            const lodJson = { distance: lod.distance, mesh: null as any };
            if (lod.mesh) {
                lodJson.mesh = SceneSerializer.SerializeMesh(lod.mesh, false, false);
                lodJson.mesh!.materials = [];
            }

            json.lods.push(lodJson);
        }

        return json;
    }

    /**
     * Eports the final scene.
     * @param editor the editor reference.
     */
    public static async ExportFinalScene(editor: Editor, task?: string): Promise<void> {
        if (!WorkSpace.HasWorkspace()) { return; }

        task = task ?? editor.addTaskFeedback(0, "Saving Final Scene");
        editor.updateTaskFeedback(task, 0, "Saving Final Scene");

        const scene = SceneSerializer.Serialize(editor.scene!);
        scene.metadata = scene.metadata ?? { };
        scene.metadata.postProcesses = {
            ssao: { enabled: SceneSettings.IsSSAOEnabled(), json: SceneSettings.SSAOPipeline?.serialize() },
            standard: { enabled: SceneSettings.IsStandardPipelineEnabled(), json: SceneSettings.StandardPipeline?.serialize() },
            default: { enabled: SceneSettings.IsDefaultPipelineEnabled(), json: SceneSettings.DefaultPipeline?.serialize() },
        };

        // Active camera
        scene.activeCameraID = scene.cameras[0]?.id;
        // LODs
        scene.meshes?.forEach((m) => {
            if (!m) { return; }

            delete m.renderOverlay;

            const mesh = editor.scene!.getMeshByID(m.id);
            if (!mesh || !(mesh instanceof Mesh)) { return; }

            const lods = mesh.getLODLevels();
            if (!lods.length) { return; }

            m.lodMeshIds = lods.map((lod) => lod.mesh?.id);
            m.lodDistances = lods.map((lod) => lod.distance);
            m.lodCoverages = lods.map((lod) => lod.distance);
        });

        const projectName = basename(dirname(WorkSpace.Workspace!.lastOpenedScene));

        const scenePath = join(WorkSpace.DirPath!, "scenes", projectName);
        if (!(await pathExists(scenePath))) { await mkdir(scenePath); }
        const destFilesDir = join(scenePath, "files");

        editor.updateTaskFeedback(task, 50);
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

            await copy(file.path, dest);
            editor.updateTaskFeedback(task, progress += step);
        }

        // Tools
        const decorators = await readFile(join(Tools.GetAppPath(), "assets", "scripts", "decorators.ts"), { encoding: "utf-8" });
        const tools = await readFile(join(Tools.GetAppPath(), "assets", "scripts", "tools.ts"), { encoding: "utf-8" });

        const finalTools = tools.replace("// ${decorators}", decorators)
                                .replace("${editor-version}", editor._packageJson.version);

        await writeFile(join(WorkSpace.DirPath!, "src", "scenes", "tools.ts"), finalTools, { encoding: "utf-8" });

        // Export scripts
        const scriptsContent = await readFile(join(Tools.GetAppPath(), "assets", "scripts", "scene", "index.ts"), { encoding: "utf-8" });
        const newScriptContent = await this._UpdateScriptContent(editor, scriptsContent);

        const indexPath = join(WorkSpace.DirPath!, "src", "scenes", WorkSpace.GetProjectName());
        if (!(await pathExists(indexPath))) { await mkdir(indexPath); }

        await writeFile(join(indexPath, "index.ts"), newScriptContent, { encoding: "utf-8" });

        editor.updateTaskFeedback(task, 100);
        editor.closeTaskFeedback(task, 1000);
    }

    /**
     * Updates the script content to be written.
     */
    private static async _UpdateScriptContent(editor: Editor, scriptsContent: string): Promise<string> {
        const all = await ScriptAssets.GetAllScripts();

        return scriptsContent.replace("${editor-version}", editor._packageJson.version).replace("// ${scripts}", all.map((s) => {
            const toReplace = `src/scenes/${WorkSpace.GetProjectName()}/`;
            return `\t"${s}": require("./${s.replace(toReplace, "")}"),`;
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
