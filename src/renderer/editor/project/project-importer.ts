import { dirname, join, basename } from "path";
import { readJSON, pathExistsSync, pathExists } from "fs-extra";

import { Nullable } from "../../../shared/types";

import {
    Texture, SceneLoader, Light, Node, Material, ShadowGenerator, CascadedShadowGenerator,
    Camera, SerializationHelper, Mesh, MultiMaterial, TransformNode, ParticleSystem, Sound, CubeTexture,
    AnimationGroup, Constants, MorphTargetManager, Matrix, SceneLoaderFlags, BaseTexture, Bone,
} from "babylonjs";

import { AdvancedDynamicTexture } from "babylonjs-gui";

import { Editor } from "../editor";

import { Overlay } from "../gui/overlay";

import { Tools } from "../tools/tools";
import { KTXTools } from "../tools/ktx";

import { overridesConfiguration } from "../tools/gui/augmentations";

import { SceneSettings } from "../scene/settings";

import { Project } from "./project";
import { IProject } from "./typings";
import { WorkSpace } from "./workspace";
import { ProjectHelpers } from "./helpers";
import { SceneExporter } from "./scene-exporter";

import { Cinematic } from "../cinematic/cinematic";

import { Workers } from "../workers/workers";
import AssetsWorker from "../workers/workers/assets";

import { AssetsBrowserItemHandler } from "../components/assets-browser/files/item-handler";

export class ProjectImporter {
    /**
     * Imports the project located at the given path.
     * @param editor the editor reference.
     * @param path the path of the project to import.
     */
    public static async ImportProject(editor: Editor, path: string): Promise<void> {
        try {
            await this._ImportProject(editor, path);
        } catch (e) {
            // TODO.
            this._RefreshEditor(editor);
        }
    }

    /**
     * Imports the project located at the given path.
     */
    private static async _ImportProject(editor: Editor, path: string): Promise<void> {
        // Log
        editor.console.logSection("Loading Project");

        // Prepare overlay
        Overlay.Show("Importing Project...", true);

        // Configure Serialization Helper
        this._OverrideTextureParser(editor);

        // Configure editor project
        Project.Path = path;
        Project.DirPath = `${dirname(path)}/`;

        // Read project file
        const project = await readJSON(path, { encoding: "utf-8" }) as IProject;
        const rootUrl = join(editor.assetsBrowser.assetsDirectory, "/");

        // Read moved assets links to restore links
        try {
            editor.assetsBrowser.movedAssetsDictionary = await readJSON(join(Project.DirPath!, "../links.json"), { encoding: "utf-8" });
        } catch (e) {
            /* Catch siently */
        }

        // Set workspace path
        await Workers.ExecuteFunction<AssetsWorker, "setWorkspacePath">(AssetsBrowserItemHandler.AssetWorker, "setWorkspacePath", WorkSpace.DirPath!);

        Overlay.SetSpinnervalue(0);
        const spinnerStep = 1 / (
            project.textures.length + project.materials.length + project.meshes.length + project.lights.length +
            project.cameras.length + (project.particleSystems?.length ?? 0) + (project.sounds?.length ?? 0) +
            (project.transformNodes?.length ?? 0) + (project.scene.morphTargetManagers?.length ?? 0) +
            (project.animationGroups?.length ?? 0) + (project.cinematics?.length ?? 0)
        );
        let spinnerValue = 0;

        let loadPromises: Promise<void>[] = [];

        // Configure scene
        ProjectHelpers.ImportSceneSettings(editor.scene!, project.scene, rootUrl);

        const physicsEngine = editor.scene!.getPhysicsEngine();
        if (physicsEngine) {
            // Remove physics engine steps
            physicsEngine._step = () => { };
        }

        // Configure camera
        SceneSettings.ConfigureFromJson(project.project.camera, editor);

        // Morph targets
        Overlay.SetMessage("Creating Morph Target Managers");

        if (project.morphTargetManagers) {
            for (const mtm of project.morphTargetManagers) {
                loadPromises.push(new Promise<void>(async (resolve) => {
                    try {
                        const json = await readJSON(join(Project.DirPath!, "morphTargets", mtm));
                        MorphTargetManager.Parse(json, editor.scene!);
                    } catch (e) {
                        editor.console.logError(`Failed to load morph target manager "${mtm}"`);
                    }

                    Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
                    resolve();
                }));
            }

            await Promise.all(loadPromises);
            loadPromises = [];
        }

        // Load all transform nodes
        Overlay.SetMessage("Creating Transform Nodes");

        for (const t of project.transformNodes ?? []) {
            loadPromises.push(new Promise<void>(async (resolve) => {
                try {
                    const json = await readJSON(join(Project.DirPath!, "transform", t));
                    const transform = TransformNode.Parse(json, editor.scene!, rootUrl);

                    transform.metadata = transform.metadata ?? {};
                    transform.metadata._waitingParentId = json.parentId;
                    transform.uniqueId = json.uniqueId ?? transform.uniqueId;
                } catch (e) {
                    editor.console.logError(`Failed to load transform node "${t}"`);
                }

                Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
                resolve();
            }));
        }

        await Promise.all(loadPromises);
        loadPromises = [];

        // Load all meshes
        Overlay.SetMessage("Creating Meshes...");

        for (const m of project.meshes) {
            loadPromises.push(new Promise<void>(async (resolve) => {
                try {
                    const json = await readJSON(join(Project.DirPath!, "meshes", m));
                    const result = await this.ImportMesh(editor, m, json, Project.DirPath!, join("meshes", m));

                    // Physics
                    if (physicsEngine) {
                        result.meshes.forEach((m) => {
                            try {
                                m.physicsImpostor = physicsEngine.getImpostorForPhysicsObject(m);
                                m.physicsImpostor?.sleep();
                                editor.console.logInfo(`Parsed physics impostor for mesh "${m.name}"`);

                                // Retrieve physics impostors for instances as well
                                if (m instanceof Mesh) {
                                    m.instances.forEach((i) => {
                                        i.physicsImpostor = physicsEngine.getImpostorForPhysicsObject(i);
                                        i.physicsImpostor?.sleep();
                                        editor.console.logInfo(`Parsed physics impostor for instance "${i.name}" of mesh "${m.name}"`);
                                    });
                                }
                            } catch (e) {
                                editor.console.logError(`Failed to set physics impostor for mesh "${m.name}"`);
                            }
                        });
                    }

                    // GUI
                    for (const m of result.meshes) {
                        if (!m.metadata?.guiPath) {
                            continue;
                        }

                        const guiPath = join(WorkSpace.DirPath!, "assets", m.metadata?.guiPath);
                        
                        try {
                            const data = await readJSON(guiPath, { encoding: "utf-8" });
                            if (data) {
                                overridesConfiguration.absolutePath = guiPath;
                                
                                const ui = AdvancedDynamicTexture.CreateForMesh(m, 3, 3);
                                ui.parseContent(data, true);
                            }
                        } catch (e) {
                            editor.console.logError(`Failed to load GUI for mesh "${m.name}"`);
                        }
                    }
                } catch (e) {
                    editor.console.logError(`Failed to load mesh "${m}"`);
                }

                Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
                resolve();
            }));
        }

        await Promise.all(loadPromises);
        loadPromises = [];

        // Load all materials
        Overlay.SetMessage("Creating Materials...");

        for (const m of project.materials) {
            m.json = editor.assetsBrowser.movedAssetsDictionary[m.json] ?? m.json;

            try {
                const materialJsonPath = m.isMultiMaterial ?
                    join(Project.DirPath, "materials", m.json) :
                    join(editor.assetsBrowser.assetsDirectory, m.json);

                const json = await readJSON(materialJsonPath);

                let materialRootUrl = join(editor.assetsBrowser.assetsDirectory, "/");
                if (json.customType === "BABYLON.NodeMaterial") {
                    materialRootUrl = undefined!;
                }

                if (json.metadata?.sourcePath) {
                    const jsPath = Tools.GetSourcePath(WorkSpace.DirPath!, json.metadata.sourcePath);
                    if (!await pathExists(jsPath)) {
                        Overlay.SetSpinnervalue(undefined);
                        Overlay.SetMessage("Installing dependencies...");

                        await WorkSpace.InstallDependencies(editor);

                        Overlay.SetMessage("Compiling TypeScript...");
                        const tsProcess = await WorkSpace.CompileTypeScript(editor);
                        if (tsProcess) {
                            await tsProcess.wait();
                            await SceneExporter.CopyShaderFiles(editor);
                        }

                        Overlay.SetSpinnervalue(spinnerValue);
                    }

                    delete require.cache[jsPath];
                    require(jsPath);
                }

                const material = m.isMultiMaterial ?
                    MultiMaterial.ParseMultiMaterial(json, editor.scene!) :
                    Material.Parse(json, editor.scene!, materialRootUrl!);

                if (material) {
                    if (json.metadata) {
                        material.metadata = json.metadata;
                    }

                    material.uniqueId = json.uniqueId ?? material.uniqueId;
                }

                editor.console.logInfo(`Parsed material "${m.json}"`);

                m.bindedMeshes.forEach((bm) => {
                    const mesh = editor.scene!.getMeshByID(bm);
                    if (mesh) {
                        mesh.material = material;
                    } else {
                        editor.console.logWarning(`Failed to attach material ${m.json} on mesh with id "${bm}"`);
                    }
                });
            } catch (e) {
                editor.console.logError(`Failed to parse material "${m.json}: ${e.message}`);
            }

            Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
        }

        // Load all textures
        Overlay.SetMessage("Creating Textures...");

        for (const t of project.textures) {
            try {
                const json = await readJSON(join(Project.DirPath, "textures", t));
                json.name = editor.assetsBrowser.movedAssetsDictionary[json.name] ?? json.name;

                const existing = editor.scene!.textures.find((t) => {
                    return t.metadata && json.metadata && t.metadata.editorId === json.metadata.editorId;
                }) ?? null;

                if (existing) { continue; }

                if (json.isCube && !json.isRenderTarget && json.files && json.metadata?.isPureCube) {
                    // Replace Urls
                    json.files.forEach((f, index) => {
                        json.files[index] = join(rootUrl, f);
                    });

                    const cube = CubeTexture.Parse(json, editor.scene!, rootUrl);
                    cube.name = cube.url = basename(cube.name);
                } else {
                    if (await pathExists(join(editor.assetsBrowser.assetsDirectory, json.name))) {
                        Texture.Parse(json, editor.scene!, rootUrl) as Texture;
                    } else {
                        editor.console.logError(`Failed to parse texture "${t}": path to the texture file doesn't exists: "${json.name}"`);
                    }
                }
                editor.console.logInfo(`Parsed texture "${t}"`);
            } catch (e) {
                editor.console.logError(`Failed to parse texture "${t}"`);
            }

            Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
        }

        // Load all lights
        Overlay.SetMessage("Creating Lights...");

        for (const l of project.lights) {
            loadPromises.push(new Promise<void>(async (resolve) => {
                try {
                    const json = await readJSON(join(Project.DirPath!, "lights", l.json));
                    const light = Light.Parse(json, editor.scene!)!;

                    light.metadata = light.metadata ?? {};
                    light.metadata._waitingParentId = json.parentId;
                    light.uniqueId = json.uniqueId ?? light.uniqueId;

                    editor.console.logInfo(`Parsed light "${l.json}"`);

                    if (l.shadowGenerator) {
                        const json = await readJSON(join(Project.DirPath!, "shadows", l.shadowGenerator));
                        if (json.className === CascadedShadowGenerator.CLASSNAME) {
                            CascadedShadowGenerator.Parse(json, editor.scene!);
                        } else {
                            ShadowGenerator.Parse(json, editor.scene!);
                        }

                        editor.console.logInfo(`Parsed shadows for light "${l.json}"`);
                    }

                    // Handled excluded meshes
                    if (light._excludedMeshesIds?.length) {
                        light._excludedMeshesIds.forEach((emid) => {
                            const excludedMesh = editor.scene!.getMeshByID(emid);
                            if (excludedMesh) { light.excludedMeshes.push(excludedMesh); }
                        });
                        light._excludedMeshesIds = [];
                    }

                    // Handle included only meshes
                    if (light._includedOnlyMeshesIds) {
                        light._includedOnlyMeshesIds.forEach((imid) => {
                            const excludedMesh = editor.scene!.getMeshByID(imid);
                            if (excludedMesh) { light.includedOnlyMeshes.push(excludedMesh); }
                        });
                        light._includedOnlyMeshesIds = [];
                    }
                } catch (e) {
                    editor.console.logError(`Failed to parse light "${l}"`);
                }

                Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
                resolve();
            }));
        }

        await Promise.all(loadPromises);
        loadPromises = [];

        // Load all cameras
        Overlay.SetMessage("Creating Cameras...");

        for (const c of project.cameras) {
            try {
                const json = await readJSON(join(Project.DirPath, "cameras", c));
                const camera = Camera.Parse(json, editor.scene!);

                camera.metadata = camera.metadata ?? {};
                camera.metadata._waitingParentId = json.parentId;
                camera.uniqueId = json.uniqueId ?? camera.uniqueId;

                editor.console.logInfo(`Parsed camera "${c}"`);
            } catch (e) {
                editor.console.logError(`Failed to parse camera "${c}"`);
            }

            Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
        }

        // Load all cinematics
        Overlay.SetMessage("Creating Cinematics...");

        for (const c of project.cinematics ?? []) {
            try {
                const json = await readJSON(join(Project.DirPath, "cinematics", c));
                Project.Cinematics.push(Cinematic.Parse(json));

                editor.console.logInfo(`Parsed cinematic "${c}"`);
            } catch (e) {
                editor.console.logError(`Failed to parse cinematic "${c}"`);
            }
        }

        // Load all particle systems
        Overlay.SetMessage("Creating Particle Systems...");

        for (const ps of project.particleSystems ?? []) {
            try {
                ps.json = editor.assetsBrowser.movedAssetsDictionary[ps.json] ?? ps.json;
                const json = await readJSON(join(editor.assetsBrowser.assetsDirectory, ps.json));

                if (json.texture) {
                    json.texture.name = editor.assetsBrowser.movedAssetsDictionary[json.texture.name] ?? json.texture.name;
                }

                const system = ParticleSystem.Parse(json, editor.scene!, rootUrl);
                system["metadata"] = json.metadata;

                system.id = ps.id;
                system.name = ps.name;
                if (ps.emitterId) {
                    system.emitter = editor.scene!.getMeshByID(ps.emitterId);
                }
            } catch (e) {
                editor.console.logError(`Failed to parse particle system "${ps.name}" from path "${ps.json}"`);
            }

            Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
        }

        // Load all sounds
        Overlay.SetMessage("Creating Sounds...");

        for (const s of project.sounds ?? []) {
            try {
                const json = await readJSON(join(Project.DirPath, "sounds", s));
                json.name = json.url = editor.assetsBrowser.movedAssetsDictionary[json.name] ?? json.name;

                Sound.Parse(json, editor.scene!, rootUrl);
            } catch (e) {
                editor.console.logError(`Failed to parse sound "${s}"`);
            }

            Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
        }

        // Post-Processes
        Overlay.SetMessage("Configuring Rendering...");

        if (project.postProcesses.ssao?.json) {
            SerializationHelper.Parse(() => SceneSettings.SSAOPipeline, project.postProcesses.ssao.json, editor.scene!, rootUrl);
            SceneSettings.SetSSAOEnabled(editor, project.postProcesses.ssao.enabled);
        }

        if (project.postProcesses.screenSpaceReflections?.json) {
            SceneSettings.SetScreenSpaceReflectionsEnabled(editor, project.postProcesses.screenSpaceReflections.enabled);
            if (SceneSettings.ScreenSpaceReflectionsPostProcess) {
                SerializationHelper.Parse(() => SceneSettings.ScreenSpaceReflectionsPostProcess, project.postProcesses.screenSpaceReflections?.json, editor.scene!, "");
            }
        }

        if (project.postProcesses.default?.json) {
            if (project.postProcesses.default.json.serializedFromEditor) {
                SceneSettings.ParseDefaultPipeline(project.postProcesses.default.json);
            } else {
                SerializationHelper.Parse(() => SceneSettings.DefaultPipeline, project.postProcesses.default.json, editor.scene!, rootUrl);
            }

            SceneSettings.SetDefaultPipelineEnabled(editor, project.postProcesses.default.enabled);
        }

        if (project.postProcesses.motionBlur?.json) {
            SceneSettings.SetMotionBlurEnabled(editor, project.postProcesses.motionBlur.enabled);
            if (SceneSettings.MotionBlurPostProcess) {
                SerializationHelper.Parse(() => SceneSettings.MotionBlurPostProcess, project.postProcesses.motionBlur?.json, editor.scene!, "");
            }
        }

        // Animation groups
        if (project.scene.animationGroups) {
            for (const g of project.scene.animationGroups) {
                const animationGroup = AnimationGroup.Parse(g, editor.scene!);
                animationGroup.play();
                animationGroup.goToFrame(animationGroup.from);
                animationGroup.stop();
            }
        }

        Overlay.SetMessage("Creating Animation Groups...");

        for (const ag of project.animationGroups ?? []) {
            try {
                const json = await readJSON(join(Project.DirPath!, "animationGroups", ag));

                const animationGroup = AnimationGroup.Parse(json, editor.scene!);
                animationGroup.play();
                animationGroup.goToFrame(animationGroup.from);
                animationGroup.stop();
            } catch (e) {
                editor.console.logError(`Failed to parse animation group "${ag}"`);
            }

            Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
        }

        // Configure and save project
        project.physicsEnabled ??= true;
        Project.Project = project;

        // Update cache
        Overlay.SetMessage("Loading Cache...");
        try {
            const assetsCache = await readJSON(join(Project.DirPath!, "../cache.json"), { encoding: "utf-8" });
            await Workers.ExecuteFunction<AssetsWorker, "setCache">(AssetsBrowserItemHandler.AssetWorker, "setCache", assetsCache);
        } catch (e) {
            // Catch silently.
        }

        // Parent Ids
        const scene = editor.scene!;
        scene.meshes.forEach((m) => this._SetWaitingParent(m));
        scene.lights.forEach((l) => this._SetWaitingParent(l));
        scene.cameras.forEach((c) => this._SetWaitingParent(c));
        scene.transformNodes.forEach((tn) => this._SetWaitingParent(tn));

        // Geometry Ids
        scene.meshes.forEach((m) => {
            if (m instanceof Mesh) {
                if (m.metadata?._waitingGeometryId && m.geometry) {
                    m.geometry.id = m.metadata._waitingGeometryId;
                    delete m.metadata._waitingGeometryId;
                }
            }
        });

        // Notify
        editor.console.logInfo(`Imported project located at ${path}`);

        // Refresh
        this._RefreshEditor(editor);
    }

    /**
     * Imports the given mesh according to its rooturl, name and json configuration.
     * @param editor the editor reference.
     * @param name the name of the mesh (used by logs).
     * @param json the json representation of the mesh.
     * @param rootUrl the root url of the mesh loader.
     * @param filename the name of the mesh file to load.
     */
    public static async ImportMesh(editor: Editor, name: string, json: any, rootUrl: string, filename: string): Promise<ReturnType<typeof SceneLoader.ImportMeshAsync>> {
        SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;

        const result = await SceneLoader.ImportMeshAsync("", rootUrl, filename, editor.scene, null, ".babylon");
        editor.console.logInfo(`Parsed mesh "${name}"`);

        const allMeshes: { mesh: Mesh; geometryId: string; parentId?: string; instances?: string[]; uniqueId: number; instancesUniqueIds?: number[] }[] = [];

        result.meshes.forEach((mesh, index) => {
            if (!(mesh instanceof Mesh)) { return; }

            if (mesh.skeleton && mesh.metadata?.basePoseMatrix) {
                mesh.updatePoseMatrix(Matrix.FromArray(mesh.metadata.basePoseMatrix));
            }

            allMeshes.push({
                mesh,
                parentId: json.meshes[index].parentId,
                geometryId: json.meshes[index].geometryId,
                uniqueId: json.meshes[index].uniqueId ?? mesh.uniqueId,
                instances: json.meshes[index].instances?.map((i) => i.parentId) ?? [],
                instancesUniqueIds: json.meshes[index].instances?.map((i) => i.uniqueId),
            });
        });

        // Lods
        for (const lod of json.lods) {
            try {
                lod.mesh.meshes[0].delayLoadingFile = join(Project.DirPath!, lod.mesh.meshes[0].delayLoadingFile);

                const blob = new Blob([JSON.stringify(lod.mesh)]);
                const url = URL.createObjectURL(blob);

                const lodResult = await SceneLoader.ImportMeshAsync("", "", url, editor.scene, null, ".babylon");
                const mesh = lodResult.meshes[0];
                if (!mesh || !(mesh instanceof Mesh)) { continue; }

                allMeshes.push({ mesh, geometryId: lod.mesh.meshes[0].geometryId, uniqueId: lod.mesh.meshes[0].uniqueId ?? mesh.uniqueId });

                (result.meshes[0] as Mesh).addLODLevel(lod.distance, mesh);
                URL.revokeObjectURL(url);

                editor.console.logInfo(`Parsed LOD level "${lod.mesh.meshes[0].name}" for mesh "${name}"`);
            } catch (e) {
                editor.console.logError(`Failed to load LOD for "${result.meshes[0].name}"`);
            }
        }

        while (allMeshes.find((m) => m.mesh.delayLoadState && m.mesh.delayLoadState !== Constants.DELAYLOADSTATE_LOADED)) {
            await Tools.Wait(150);
        }

        await Tools.Wait(0);

        // Parent
        allMeshes.forEach((m) => {
            m.mesh.uniqueId = m.uniqueId;
            m.mesh.metadata = m.mesh.metadata ?? {};
            m.mesh.metadata._waitingParentId = m.parentId;
            m.mesh.metadata._waitingGeometryId = m.geometryId;
            m.mesh.renderingGroupId = m.mesh.metadata.renderingGroupId ?? m.mesh.renderingGroupId;

            if (m.instances) {
                m.mesh.instances?.forEach((i, instanceIndex) => {
                    i.metadata = i.metadata ?? {};
                    i.metadata._waitingParentId = m.instances?.[instanceIndex];

                    i.uniqueId = m.instancesUniqueIds?.[instanceIndex] ?? i.uniqueId;
                });
            }

            if (m.mesh.hasThinInstances) {
                m.mesh.thinInstanceRefreshBoundingInfo(true);
            }
        });

        return result as any;
    }

    /**
     * Sets the parent of the given node waiting for it.
     */
    private static _SetWaitingParent(n: Node): void {
        const parentId = n.metadata?._waitingParentId ?? null;
        if (parentId === null) {
            return;
        }

        const scene = n.getScene();
        n.parent = scene.getNodeById(parentId) ?? scene.getTransformNodeById(parentId);

        if (n.parent instanceof Bone && n instanceof TransformNode) {
            const skeleton = n.parent.getSkeleton();
            const mesh = scene.meshes.find((m) => m.skeleton === skeleton);

            if (mesh) {
                n.attachToBone(n.parent, mesh);
            }
        }

        delete n.metadata._waitingParentId;
        n._waitingParentId = null;
    }

    /**
     * Refreshes the editor.
     */
    private static _RefreshEditor(editor: Editor): void {
        editor.assets.refresh();
        editor.graph.refresh();

        Overlay.Hide();
    }

    /**
     * Overrides the current texture parser available in Babylon.JS Scene Loader.
     */
    private static _OverrideTextureParser(editor: Editor): void {
        const textureParser = SerializationHelper._TextureParser;

        SerializationHelper._TextureParser = (source, scene, rootUrl) => {
            // Change name if available in moved files links
            source.name = editor.assetsBrowser.movedAssetsDictionary[source.name] ?? source.name;

            // Existing texture?
            if (source.metadata?.editorName) {
                const texture = scene.textures.find((t) => t.metadata && t.metadata.editorName === source.metadata.editorName);
                if (texture) { return texture; }

                // Cube texture?
                if (source.isCube && !source.isRenderTarget && source.files && source.metadata?.isPureCube) {
                    // Replace Urls for files in case of pure cube texture
                    source.files.forEach((f, index) => {
                        if (f.indexOf("files") !== 0) { return; }
                        source.files[index] = join(Project.DirPath!, f);
                    });
                }
            }

            let texture: Nullable<BaseTexture> = null;

            // Existing ktx texture?
            const supportedFormat = KTXTools.GetSupportedKtxFormat(scene.getEngine());
            const ktx2CompressedTextures = WorkSpace.Workspace?.ktx2CompressedTextures;

            if (supportedFormat && ktx2CompressedTextures?.enabled && ktx2CompressedTextures?.enabledInPreview) {
                const ktxTextureName = basename(KTXTools.GetKtxFileName(source.name, supportedFormat));
                const ktxFileExists = pathExistsSync(join(editor.assetsBrowser.assetsDirectory, dirname(source.name), ktxTextureName));

                if (ktxFileExists) {
                    const oldName = source.name;

                    source.name = join(dirname(source.name), ktxTextureName);
                    texture = textureParser(source, scene, rootUrl);

                    if (texture) {
                        texture.name = oldName;

                        texture.metadata ??= {};
                        texture.metadata.ktx2CompressedTextures ??= {};
                        texture.metadata.ktx2CompressedTextures.isUsingCompressedTexture = true;
                    }
                }
            }

            // Create texture
            if (!texture) {
                texture = textureParser(source, scene, rootUrl);

                if (texture) {
                    texture.metadata ??= {};
                    texture.metadata.ktx2CompressedTextures ??= {};
                    texture.metadata.ktx2CompressedTextures.isUsingCompressedTexture = false;
                }
            }

            // Configure cube
            if (source.metadata?.editorName && source.metadata?.isPureCube) {
                // Cube texture?
                if (source.isCube && !source.isRenderTarget && source.files && source.metadata?.isPureCube) {
                    // Restore Urls for files in case of pure cube texture
                    source.files.forEach((f, index) => {
                        if (f.indexOf("files") === 0) { return; }
                        source.files[index] = join("files", basename(f));
                    });
                }
            }

            return texture;
        };
    }
}
