import { dirname, join, basename } from "path";
import { readJSON, pathExists } from "fs-extra";

import {
    Texture, SceneLoader, Light, Node, Material, ShadowGenerator, CascadedShadowGenerator,
    Camera, SerializationHelper, Mesh, MultiMaterial, TransformNode, ParticleSystem, Sound, CubeTexture,
    AnimationGroup, Constants, MorphTargetManager,
} from "babylonjs";

import { MeshesAssets } from "../assets/meshes";
import { PrefabAssets } from "../assets/prefabs";
import { GraphAssets } from "../assets/graphs";

import { Editor } from "../editor";

import { Overlay } from "../gui/overlay";

import { Tools } from "../tools/tools";

import { SceneSettings } from "../scene/settings";

import { Project } from "./project";
import { IProject } from "./typings";
import { FilesStore } from "./files";
import { ProjectHelpers } from "./helpers";

import { Assets } from "../components/assets";

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
        // Prepare overlay
        Overlay.Show("Importing Project...", true);

        // Configure Serialization Helper
        const textureParser = SerializationHelper._TextureParser;
        SerializationHelper._TextureParser = (source, scene, rootUrl) => {
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

            const texture = textureParser(source, scene, rootUrl);

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

        // Configure editor project
        Project.Path = path;
        Project.DirPath = `${dirname(path)}/`;

        // Read project file
        const project = await readJSON(path) as IProject;
        const rootUrl = join(Project.DirPath!, "/");

        Overlay.SetSpinnervalue(0);
        const spinnerStep = 1 / (
                                    project.textures.length + project.materials.length + project.meshes.length + project.lights.length +
                                    project.cameras.length + (project.particleSystems?.length ?? 0) + (project.sounds?.length ?? 0) +
                                    (project.transformNodes?.length ?? 0) + (project.scene.morphTargetManagers?.length ?? 0)
                                );
        let spinnerValue = 0;

        let loadPromises: Promise<void>[] = [];

        // Register files
        project.filesList.forEach((f) => {
            const path = join(Project.DirPath!, "files", f);
            FilesStore.List[path] = { path, name: basename(f) };
        });

        // Configure assets
        project.assets.meshes.forEach((m) => MeshesAssets.Meshes.push({ name: m, path: join(Project.DirPath!, "assets", "meshes", m) }));
        if (project.assets.prefabs) {
            project.assets.prefabs.forEach((p) => PrefabAssets.Prefabs.push({ name: p, path: join(Project.DirPath!, "prefabs", p) }));
        }
        if (project.assets.graphs) {
            project.assets.graphs.forEach((g) => GraphAssets.Graphs.push({ name: g, path: join(Project.DirPath!, "graphs", g) }));
        }

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

        // Load all meshes
        Overlay.SetMessage("Creating Meshes...");

        for (const m of project.meshes) {
            loadPromises.push(new Promise<void>(async (resolve) => {
                try {
                    const json = await readJSON(join(Project.DirPath!, "meshes", m));
                    const result = await this.ImportMesh(editor, m, json, Project.DirPath!, join("meshes", m));

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
                } catch (e) {
                    editor.console.logError(`Failed to load mesh "${m}"`);
                }

                Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
                resolve();
            }));
        }

        await Promise.all(loadPromises);
        loadPromises = [];

        // Load all transform nodes
        Overlay.SetMessage("Creating Transform Nodes");

        for (const t of project.transformNodes ?? []) {
            loadPromises.push(new Promise<void>(async (resolve) => {
                try {
                    const json = await readJSON(join(Project.DirPath!, "transform", t));
                    const transform = TransformNode.Parse(json, editor.scene!, rootUrl);

                    transform.metadata = transform.metadata ?? { };
                    transform.metadata._waitingParentId = json.parentId;
                } catch (e) {
                    editor.console.logError(`Failed to load transform node "${t}"`);
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
            try {
                const json = await readJSON(join(Project.DirPath, "materials", m.json));
                const materialRootUrl = json.customType === "BABYLON.NodeMaterial" ? undefined : rootUrl;

                const material = m.isMultiMaterial ? MultiMaterial.ParseMultiMaterial(json, editor.scene!) : Material.Parse(json, editor.scene!, materialRootUrl!);
                if (material && json.metadata) {
                    material.metadata = json.metadata;
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
                editor.console.logError(`Failed to parse material "${m.json}"`);
            }

            Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
        }

        // Load all textures
        Overlay.SetMessage("Creating Textures...");

        for (const t of project.textures) {
            try {
                const json = await readJSON(join(Project.DirPath, "textures", t));

                const existing = editor.scene!.textures.find((t) => {
                    return t.metadata && json.metadata && t.metadata.editorId === json.metadata.editorId;
                }) ?? null;

                if (existing) { continue; }

                if (json.isCube && !json.isRenderTarget && json.files && json.metadata?.isPureCube) {
                    // Replace Urls
                    json.files.forEach((f, index) => {
                        json.files[index] = join(Project.DirPath!, f);
                    });

                    const cube = CubeTexture.Parse(json, editor.scene!, rootUrl);
                    cube.name = cube.url = basename(cube.name);
                } else {
                    Texture.Parse(json, editor.scene!, rootUrl);
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

                    light.metadata = light.metadata ?? { };
                    light.metadata._waitingParentId = json.parentId;

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

                camera.metadata = camera.metadata ?? { };
                camera.metadata._waitingParentId = json.parentId;

                editor.console.logInfo(`Parsed camera "${c}"`);
            } catch (e) {
                editor.console.logError(`Failed to parse camera "${c}"`);
            }

            Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
        }

        // Load all particle systems
        Overlay.SetMessage("Creating Particle Systems...");

        for (const ps of project.particleSystems ?? []) {
            try {
                const json = await readJSON(join(Project.DirPath, "particleSystems", ps));
                ParticleSystem.Parse(json, editor.scene!, rootUrl);
            } catch (e) {
                editor.console.logError(`Failed to parse particle system "${ps}"`);
            }

            Overlay.SetSpinnervalue(spinnerValue += spinnerStep);
        }

        // Load all sounds
        Overlay.SetMessage("Creating Sounds...");

        for (const s of project.sounds ?? []) {
            try {
                const json = await readJSON(join(Project.DirPath, "sounds", s));
                Sound.Parse(json, editor.scene!, join(rootUrl, "files", "/"));
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
            SerializationHelper.Parse(() => SceneSettings.DefaultPipeline, project.postProcesses.default.json, editor.scene!, rootUrl);
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
                AnimationGroup.Parse(g, editor.scene!);
            }
        }

        // Configure and save project
        project.physicsEnabled ??= true;
        Project.Project = project;

        // Update cache
        Overlay.SetMessage("Loading Cache...");
        const assetsCachePath = join(Project.DirPath, "assets", "cache.json");
        if ((await pathExists(assetsCachePath))) {
            Assets.SetCachedData(await readJSON(assetsCachePath));
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
        const result = await SceneLoader.ImportMeshAsync("", rootUrl, filename, editor.scene, null, ".babylon");
        editor.console.logInfo(`Parsed mesh "${name}"`);
        
        const allMeshes: { mesh: Mesh; geometryId: string; parentId?: string; instances?: string[]; }[] = [];

        result.meshes.forEach((mesh, index) => {
            if (!(mesh instanceof Mesh)) { return; }
            if (mesh.delayLoadState && mesh.delayLoadState !== Constants.DELAYLOADSTATE_LOADED) {
                mesh._checkDelayState();
            }

            allMeshes.push({
                mesh,
                geometryId: json.meshes[index].geometryId,
                parentId: json.meshes[index].parentId,
                instances: json.meshes[index].instances?.map((i) => i.parentId) ?? [],
            });
        });

        // Lods
        for (const lod of json.lods) {
            try {
                const blob = new Blob([JSON.stringify(lod.mesh)]);
                const url = URL.createObjectURL(blob);

                const lodResult = await SceneLoader.ImportMeshAsync("", "", url, editor.scene, null, ".babylon");
                const mesh = lodResult.meshes[0];
                if (!mesh || !(mesh instanceof Mesh)) { continue; }

                if (mesh.delayLoadState && mesh.delayLoadState !== Constants.DELAYLOADSTATE_LOADED) {
                    mesh.delayLoadingFile = join(Project.DirPath!, mesh.delayLoadingFile);
                    mesh._checkDelayState();
                }

                allMeshes.push({ mesh, geometryId: lod.mesh.meshes[0].geometryId });

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
            m.mesh.metadata = m.mesh.metadata ?? { };
            m.mesh.metadata._waitingParentId = m.parentId;
            m.mesh.metadata._waitingGeometryId = m.geometryId;
            m.mesh.renderingGroupId = m.mesh.metadata.renderingGroupId ?? m.mesh.renderingGroupId;

            if (m.instances) {
                m.mesh.instances?.forEach((i, instanceIndex) => {
                    i.metadata = i.metadata ?? { };
                    i.metadata._waitingParentId = m.instances![instanceIndex];
                });
            }
        });

        return result as any;
    }

    /**
     * Sets the parent of the given node waiting for it.
     */
    private static _SetWaitingParent(n: Node): void {
        if (!n.metadata?._waitingParentId) { return; }

        n.parent = n.getScene().getNodeByID(n.metadata._waitingParentId) ?? n.getScene().getTransformNodeByID(n.metadata._waitingParentId);

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
}
