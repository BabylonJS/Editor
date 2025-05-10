import { join, basename } from "path/posix";
import { readFile, readJSON, readdir } from "fs-extra";

import {
    AbstractMesh, AnimationGroup, Camera, CascadedShadowGenerator, Color3, Constants, Light, Matrix, Mesh, MorphTargetManager,
    RenderTargetTexture, SceneLoader, SceneLoaderFlags, ShadowGenerator, Skeleton, Texture, TransformNode, MultiMaterial, Animation,
    Sound, Color4, IParticleSystem, ParticleSystem, GPUParticleSystem,
} from "babylonjs";

import { Editor } from "../../editor/main";

import { EditorCamera } from "../../editor/nodes/camera";
import { CollisionMesh } from "../../editor/nodes/collision";
import { SceneLinkNode } from "../../editor/nodes/scene-link";

import { parseVLSPostProcess, vlsPostProcessCameraConfigurations } from "../../editor/rendering/vls";
import { parseSSRRenderingPipeline, ssrRenderingPipelineCameraConfigurations } from "../../editor/rendering/ssr";
import { parseSSAO2RenderingPipeline, ssaoRenderingPipelineCameraConfigurations } from "../../editor/rendering/ssao";
import { parseMotionBlurPostProcess, motionBlurPostProcessCameraConfigurations } from "../../editor/rendering/motion-blur";
import { parseDefaultRenderingPipeline, defaultPipelineCameraConfigurations } from "../../editor/rendering/default-pipeline";
import { iblShadowsRenderingPipelineCameraConfigurations, parseIblShadowsRenderingPipeline } from "../../editor/rendering/ibl-shadows";

import { applyImportedGuiFile } from "../../editor/layout/preview/import/gui";

import { wait } from "../../tools/tools";
import { createDirectoryIfNotExist } from "../../tools/fs";

import { isMultiMaterial } from "../../tools/guards/material";
import { createSceneLink } from "../../tools/scene/scene-link";
import { isCubeTexture, isTexture } from "../../tools/guards/texture";
import { updateIblShadowsRenderPipeline } from "../../tools/light/ibl";
import { checkProjectCachedCompressedTextures } from "../../tools/ktx/check";
import { configureSimultaneousLightsForMaterial } from "../../tools/mesh/material";
import { parsePhysicsAggregate } from "../../tools/physics/serialization/aggregate";
import { isAbstractMesh, isCollisionMesh, isEditorCamera, isMesh } from "../../tools/guards/nodes";
import { updateAllLights, updatePointLightShadowMapRenderListPredicate } from "../../tools/light/shadows";

import { showLoadSceneProgressDialog } from "./progress";

import "./texture";

/**
 * Defines the list of all loaded scenes. This is used to detect cycle references
 * when computing scene links.
 */
const loadedScenes: string[] = [];

export type SceneLoaderOptions = {
    /**
     * Defines wether or not the scene is being loaded as link.
     */
    asLink?: boolean;
};

export type SceneLoadResult = {
    lights: Light[];
    cameras: Camera[];
    meshes: AbstractMesh[];
    sceneLinks: SceneLinkNode[];
    transformNodes: TransformNode[];
    animationGroups: AnimationGroup[];
    particleSystems: IParticleSystem[];
};

export async function loadScene(editor: Editor, projectPath: string, scenePath: string, options?: SceneLoaderOptions): Promise<SceneLoadResult> {
    const scene = editor.layout.preview.scene;
    const relativeScenePath = scenePath.replace(join(projectPath, "/"), "");

    const loadResult = {
        lights: [],
        meshes: [],
        cameras: [],
        sceneLinks: [],
        transformNodes: [],
        animationGroups: [],
        particleSystems: [],
    } as SceneLoadResult;

    options ??= {};

    editor.layout.console.log(`Loading scene "${relativeScenePath}"`);

    // Prepare directories
    await Promise.all([
        createDirectoryIfNotExist(join(scenePath, "nodes")),
        createDirectoryIfNotExist(join(scenePath, "meshes")),
        createDirectoryIfNotExist(join(scenePath, "lods")),
        createDirectoryIfNotExist(join(scenePath, "lights")),
        createDirectoryIfNotExist(join(scenePath, "cameras")),
        createDirectoryIfNotExist(join(scenePath, "geometries")),
        createDirectoryIfNotExist(join(scenePath, "skeletons")),
        createDirectoryIfNotExist(join(scenePath, "shadowGenerators")),
        createDirectoryIfNotExist(join(scenePath, "sceneLinks")),
        createDirectoryIfNotExist(join(scenePath, "gui")),
        createDirectoryIfNotExist(join(scenePath, "sounds")),
        createDirectoryIfNotExist(join(scenePath, "particleSystems")),
        createDirectoryIfNotExist(join(scenePath, "morphTargetManagers")),
        createDirectoryIfNotExist(join(scenePath, "morphTargets")),
        createDirectoryIfNotExist(join(scenePath, "animationGroups")),
    ]);

    const [
        nodesFiles, meshesFiles, lodsFiles, lightsFiles, cameraFiles, skeletonFiles,
        shadowGeneratorFiles, sceneLinkFiles, guiFiles, soundFiles, particleSystemFiles,
        morphTargetManagers, animationGroups,
    ] = await Promise.all([
        readdir(join(scenePath, "nodes")),
        readdir(join(scenePath, "meshes")),
        readdir(join(scenePath, "lods")),
        readdir(join(scenePath, "lights")),
        readdir(join(scenePath, "cameras")),
        readdir(join(scenePath, "skeletons")),
        readdir(join(scenePath, "shadowGenerators")),
        readdir(join(scenePath, "sceneLinks")),
        readdir(join(scenePath, "gui")),
        readdir(join(scenePath, "sounds")),
        readdir(join(scenePath, "particleSystems")),
        readdir(join(scenePath, "morphTargetManagers")),
        readdir(join(scenePath, "animationGroups")),
    ]);

    const progress = await showLoadSceneProgressDialog(basename(scenePath));
    const progressStep = 100 / (
        nodesFiles.length +
        meshesFiles.length +
        lodsFiles.length +
        lightsFiles.length +
        cameraFiles.length +
        skeletonFiles.length +
        shadowGeneratorFiles.length +
        sceneLinkFiles.length +
        guiFiles.length +
        soundFiles.length +
        particleSystemFiles.length +
        morphTargetManagers.length +
        animationGroups.length
    );

    SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;

    const config = await readJSON(join(scenePath, "config.json"), "utf-8");

    if (!options?.asLink) {
        // Metadata
        scene.metadata = config.metadata;

        // Load camera
        const camera = Camera.Parse(config.editorCamera, scene) as EditorCamera | null;

        if (camera) {
            editor.layout.preview.camera.dispose();
            editor.layout.preview.camera = camera;

            camera.attachControl(true);
            camera.configureFromPreferences();
        }

        // Load environment
        scene.environmentIntensity = config.environment.environmentIntensity;

        if (config.environment.environmentTexture) {
            scene.environmentTexture = Texture.Parse(config.environment.environmentTexture, scene, join(projectPath, "/"));

            if (isCubeTexture(scene.environmentTexture)) {
                scene.environmentTexture.url = join(projectPath, scene.environmentTexture.name);
            }
        }

        // Load fog
        scene.fogEnabled = config.fog.fogEnabled;
        scene.fogMode = config.fog.fogMode;
        scene.fogStart = config.fog.fogStart;
        scene.fogEnd = config.fog.fogEnd;
        scene.fogDensity = config.fog.fogDensity;
        scene.fogColor = Color3.FromArray(config.fog.fogColor);

        // Colors
        if (config.clearColor) {
            scene.clearColor = Color4.FromArray(config.clearColor);
        }

        if (config.ambientColor) {
            scene.ambientColor = Color3.FromArray(config.ambientColor);
        }
    }

    // Load transform nodes
    await Promise.all(nodesFiles.map(async (file) => {
        if (file.startsWith(".")) {
            return;
        }

        const data = await readJSON(join(scenePath, "nodes", file), "utf-8");

        if (options?.asLink && data.metadata?.doNotSerialize) {
            return;
        }

        const transformNode = TransformNode.Parse(data, scene, join(projectPath, "/"));
        transformNode.uniqueId = data.uniqueId;
        transformNode.metadata ??= {};
        transformNode.metadata._waitingParentId = data.metadata?.parentId;

        progress.step(progressStep);

        loadResult.transformNodes.push(transformNode);
    }));

    // Load skeletons
    await Promise.all(skeletonFiles.map(async (file) => {
        if (file.startsWith(".")) {
            return;
        }

        const data = await readJSON(join(scenePath, "skeletons", file), "utf-8");
        Skeleton.Parse(data, scene);
    }));

    // Load meshes
    await Promise.all(meshesFiles.map(async (file) => {
        if (file.startsWith(".")) {
            return;
        }

        const initialData = await readJSON(join(scenePath, "meshes", file), "utf-8");

        if (options?.asLink && initialData.metadata?.doNotSerialize) {
            return;
        }

        const filesToLoad = [
            join(relativeScenePath, "meshes", file),
            ...(initialData.lods?.map((file) => join(relativeScenePath, "lods", file)) ?? [])
        ];

        await Promise.all(filesToLoad.map(async (filename, index) => {
            const result = await SceneLoader.ImportMeshAsync("", join(projectPath, "/"), filename, scene, null, ".babylon");
            const meshes = result.meshes.filter((m) => isMesh(m)) as Mesh[];

            const data = index === 0 ? initialData : await readJSON(join(projectPath, filename), "utf-8");

            while (meshes.find((m) => m.delayLoadState && m.delayLoadState !== Constants.DELAYLOADSTATE_LOADED)) {
                await wait(150);
            }

            result.meshes.forEach((m) => {
                if (!isMesh(m)) {
                    return;
                }

                const meshData = data.meshes?.find((d) => d.id === m.id);

                if (data.basePoseMatrix) {
                    m.updatePoseMatrix(Matrix.FromArray(data.basePoseMatrix));
                }

                if ((meshData?.uniqueId ?? null) !== null) {
                    m.uniqueId = meshData.uniqueId;

                    m.metadata ??= {};
                    m.metadata._waitingParentId = meshData.metadata?.parentId;

                    delete m.metadata.parentId;
                }

                // Handle physics
                if (meshData?.metadata?.physicsAggregate) {
                    m.physicsAggregate = parsePhysicsAggregate(m, meshData.metadata.physicsAggregate);
                    m.physicsAggregate.body.disableSync = true;
                }

                m.instances.forEach((instance) => {
                    const instanceData = meshData.instances?.find((d) => d.id === instance.id);
                    if (instanceData) {
                        if ((instanceData?.uniqueId ?? null) !== null) {
                            instance.id = instanceData.id;
                        }

                        if ((instanceData?.uniqueId ?? null) !== null) {
                            instance.uniqueId = instanceData.uniqueId;
                        }

                        instance.metadata ??= {};
                        instance.metadata._waitingParentId = instanceData.metadata?.parentId;

                        delete instance.metadata.parentId;

                        if (instanceData.metadata?.physicsAggregate) {
                            instance.physicsAggregate = parsePhysicsAggregate(instance, instanceData.metadata.physicsAggregate);
                            instance.physicsAggregate.body.disableSync = true;
                        }
                    }

                    loadResult.meshes.push(instance);
                });

                // Handle case the data is a collision mesh
                if (data.isCollisionMesh) {
                    const collisionMesh = CollisionMesh.CreateFromSourceMesh(m, data.collisionMeshType);

                    m.dispose(true, false);
                    m = collisionMesh;

                    if (!isCollisionMesh(m)) {
                        return;
                    }
                }

                loadResult.meshes.push(m);

                if (m.material) {
                    const material = isMultiMaterial(m.material)
                        ? data.multiMaterials?.find((d) => d.id === m.material!.id)
                        : data.materials?.find((d) => d.id === m.material!.id);

                    if (material) {
                        m.material.uniqueId = material.uniqueId;
                    }

                    if (isMultiMaterial(m.material)) {
                        m.material.subMaterials.forEach((subMaterial, index) => {
                            if (!subMaterial) {
                                return;
                            }

                            const material = data.materials?.find((d) => d.id === subMaterial.id);
                            if (material) {
                                subMaterial.uniqueId = material.uniqueId;
                            }

                            configureSimultaneousLightsForMaterial(subMaterial);

                            const existingMaterial = scene.materials.find((material) => {
                                return material !== m.material && material.uniqueId === m.material!.uniqueId;
                            });

                            if (existingMaterial) {
                                subMaterial.dispose(false, true);
                                (m.material as MultiMaterial).subMaterials[index] = existingMaterial;
                            }
                        });
                    } else {
                        configureSimultaneousLightsForMaterial(m.material);

                        const existingMaterial = scene.materials.find((material) => {
                            return material !== m.material && material.uniqueId === m.material!.uniqueId;
                        });

                        if (existingMaterial) {
                            m.material.dispose(false, false);
                            m.material = existingMaterial;
                        }
                    }
                }

                if (m.geometry) {
                    if (meshData?.geometryId) {
                        m.geometry.id = meshData.geometryId;
                    }

                    if (meshData?.geometryUniqueId) {
                        m.geometry.uniqueId = meshData.geometryUniqueId;
                    }
                }
            });

            if (index > 0) {
                // const data = await readJSON(join(projectPath, filename), "utf-8");

                if (data.masterMeshId && data.distanceOrScreenCoverage !== undefined) {
                    meshes[0]._waitingData.lods = {
                        masterMeshId: data.masterMeshId,
                        distanceOrScreenCoverage: data.distanceOrScreenCoverage,
                    };
                }
            }

            progress.step(progressStep);
        }));
    }));

    // Load morph target managers
    await Promise.all(morphTargetManagers.map(async (file) => {
        if (file.startsWith(".")) {
            return;
        }

        const data = await readJSON(join(scenePath, "morphTargetManagers", file), "utf-8");

        await Promise.all(data.targets.map(async (target) => {
            const binaryFileData = join(scenePath, "morphTargets", basename(target.delayLoadingFile));
            const buffer = (await readFile(binaryFileData)).buffer;

            if (target.positionsCount) {
                target.positions = new Float32Array(buffer, target.positionsOffset, target.positionsCount);
            }

            if (target.normalsCount) {
                target.normals = new Float32Array(buffer, target.normalsOffset, target.normalsCount);
            }

            if (target.tangentsCount) {
                target.tangents = new Float32Array(buffer, target.tangentsOffset, target.tangentsCount);
            }

            if (target.uvsCount) {
                target.uvs = new Float32Array(buffer, target.uvsOffset, target.uvsCount);
            }

            if (target.uv2sCount) {
                target.uv2s = new Float32Array(buffer, target.uv2sOffset, target.uv2sCount);
            }
        }));

        const mesh = scene.getMeshById(data.meshId);
        if (mesh) {
            const morphTargetManager = MorphTargetManager.Parse(data, scene);
            morphTargetManager["_uniqueId"] = data.uniqueId;

            for (let i = 0, len = morphTargetManager.numTargets; i < len; i++) {
                const target = morphTargetManager.getTarget(i);
                target["_uniqueId"] = data.targets[i].uniqueId;
            }

            mesh.morphTargetManager = morphTargetManager;
        }

        progress.step(progressStep);
    }));

    // Load lights
    await Promise.all(lightsFiles.map(async (file) => {
        if (file.startsWith(".")) {
            return;
        }

        const data = await readJSON(join(scenePath, "lights", file), "utf-8");

        if (options?.asLink && data.metadata?.doNotSerialize) {
            return;
        }

        const light = Light.Parse(data, scene);
        if (light) {
            light.uniqueId = data.uniqueId;
            light.metadata ??= {};
            light.metadata._waitingParentId = data.metadata?.parentId;

            loadResult.lights.push(light);
        }

        progress.step(progressStep);
    }));

    // Load cameras
    await Promise.all(cameraFiles.map(async (file) => {
        if (file.startsWith(".")) {
            return;
        }

        const data = await readJSON(join(scenePath, "cameras", file), "utf-8");

        if (options?.asLink && data.metadata?.doNotSerialize) {
            return;
        }

        const camera = Camera.Parse(data, scene);
        camera._waitingParentId = data.parentId;
        camera.metadata ??= {};
        camera.metadata._waitingParentId = data.metadata?.parentId;

        progress.step(progressStep);

        loadResult.cameras.push(camera);
    }));

    // Load shadow generators
    if (!options?.asLink) {
        await Promise.all(shadowGeneratorFiles.map(async (file) => {
            if (file.startsWith(".")) {
                return;
            }

            const data = await readJSON(join(scenePath, "shadowGenerators", file), "utf-8");

            const light = scene.lights.find((light) => light.id === data.lightId);
            if (!light) {
                return;
            }

            let shadowGenerator: ShadowGenerator;

            if (data.className === CascadedShadowGenerator.CLASSNAME) {
                shadowGenerator = CascadedShadowGenerator.Parse(data, scene);
            } else {
                shadowGenerator = ShadowGenerator.Parse(data, scene);
            }

            const shadowMap = shadowGenerator.getShadowMap();
            if (shadowMap) {
                shadowMap.refreshRate = data.refreshRate ?? RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
            }

            progress.step(progressStep);
        }));
    }

    // Load GUI files
    await Promise.all(guiFiles.map(async (file) => {
        if (file.startsWith(".")) {
            return;
        }

        const data = await readJSON(join(scenePath, "gui", file), "utf-8");

        try {
            const gui = await applyImportedGuiFile(editor, join(projectPath, "assets", data.relativePath));

            if (gui) {
                gui.name = data.name;
            }
        } catch (e) {
            editor.layout.console.error(`Failed to load GUI file "${file}": ${e.message}`);
        }

        progress.step(progressStep);
    }));

    // Load sound files
    await Promise.all(soundFiles.map(async (file) => {
        if (file.startsWith(".")) {
            return;
        }

        const data = await readJSON(join(scenePath, "sounds", file), "utf-8");

        try {
            const sound = Sound.Parse(data, scene, join(projectPath, "/"));
            sound["_url"] = data.url;
            sound.id = data.id;
            sound.uniqueId = data.uniqueId;
        } catch (e) {
            editor.layout.console.error(`Failed to load sound file "${file}": ${e.message}`);
        }

        progress.step(progressStep);
    }));

    // Load particle systems
    await Promise.all(particleSystemFiles.map(async (file) => {
        if (file.startsWith(".")) {
            return;
        }

        const data = await readJSON(join(scenePath, "particleSystems", file), "utf-8");

        let particleSystem: ParticleSystem | GPUParticleSystem;

        switch (data.className) {
            case "GPUParticleSystem":
                // TODO: Implement GPU particle system
                break;

            default:
                particleSystem = ParticleSystem.Parse(data, scene, join(projectPath, "/"));
                if (!particleSystem.emitter) {
                    editor.layout.console.warn(`No emitter found for particle system "${particleSystem.name}". Skipping.`);
                    particleSystem.dispose(true, true, true);
                    return;
                }
                break;
        }

        particleSystem!.uniqueId = data.uniqueId;

        progress.step(progressStep);

        loadResult.particleSystems.push(particleSystem!);
    }));

    // Load animation groups
    await Promise.all(animationGroups.map(async (file) => {
        if (file.startsWith(".")) {
            return;
        }

        try {
            const data = await readJSON(join(scenePath, "animationGroups", file), "utf-8");

            const animationGroup = AnimationGroup.Parse(data, scene);
            animationGroup.uniqueId = data.uniqueId;

            if (animationGroup.targetedAnimations.length === 0) {
                animationGroup.dispose();
            } else {
                loadResult.animationGroups.push(animationGroup);
            }
        } catch (e) {
            editor.layout.console.error(`Failed to load animation group file "${file}": ${e.message}`);
        }

        progress.step(progressStep);
    }));

    progress.dispose();

    // Configure textures urls
    scene.textures.forEach((texture) => {
        if (isTexture(texture) || isCubeTexture(texture)) {
            texture.url = texture.name;
        }
    });

    // Configure lights
    scene.lights.forEach((light) => {
        updatePointLightShadowMapRenderListPredicate(light);
    });

    // Configure LODs
    scene.meshes.forEach((mesh) => {
        if (!mesh._waitingData.lods || !isMesh(mesh)) {
            return;
        }

        const masterMesh = scene.getMeshById(mesh._waitingData.lods.masterMeshId);
        if (masterMesh && isMesh(masterMesh)) {
            mesh.material = masterMesh.material;
            masterMesh.addLODLevel(mesh._waitingData.lods.distanceOrScreenCoverage, mesh);
        }

        mesh._waitingData.lods = null;
    });

    // Scene animations
    scene.animations ??= [];
    config.animations?.forEach((data) => {
        scene.animations.push(Animation.Parse(data));
    });

    // Scene animation groups
    // TODO: legacy
    config.animationGroups?.forEach((data) => {
        const group = AnimationGroup.Parse(data, scene);
        if (group.targetedAnimations.length === 0) {
            group.dispose();
        } else {
            loadResult.animationGroups.push(group);
        }
    });

    // Load scene links
    loadedScenes.push(relativeScenePath);

    await Promise.all(sceneLinkFiles.map(async (file) => {
        const data = await readJSON(join(scenePath, "sceneLinks", file), "utf-8");

        if (options?.asLink && data.metadata?.doNotSerialize) {
            return;
        }

        if (loadedScenes.includes(data._relativePath)) {
            return editor.layout.console.error(`Can't load scene "${data._relativePath}": cycle references detected.`);
        }

        const sceneLink = await createSceneLink(editor, join(projectPath, data._relativePath));
        if (sceneLink) {
            sceneLink.parse(data);

            sceneLink.uniqueId = data.uniqueId;
            sceneLink.metadata ??= {};
            sceneLink.metadata._waitingParentId = data.parentId;

            loadResult.sceneLinks.push(sceneLink);
        }

        progress.step(progressStep);
    }));

    loadedScenes.pop();

    // Configure waiting parent ids.
    const allNodes = [
        ...scene.transformNodes,
        ...scene.meshes,
        ...scene.lights,
        ...scene.cameras,
    ];

    allNodes.forEach((n) => {
        if ((n.metadata?._waitingParentId ?? null) === null) {
            return;
        }

        const transformNode = scene.getTransformNodeByUniqueId(n.metadata._waitingParentId as any);
        if (transformNode) {
            return (n.parent = transformNode);
        }

        const mesh = scene.getMeshByUniqueId(n.metadata._waitingParentId as any);
        if (mesh) {
            return (n.parent = mesh);
        }

        const light = scene.getLightByUniqueId(n.metadata._waitingParentId as any);
        if (light) {
            return (n.parent = light);
        }

        const camera = scene.getCameraByUniqueId(n.metadata._waitingParentId as any);
        if (camera) {
            return (n.parent = camera);
        }
    });

    if (!options?.asLink) {
        allNodes.forEach((n) => {
            if (n.metadata) {
                delete n.metadata._waitingParentId;
            }

            if (isAbstractMesh(n)) {
                n.refreshBoundingInfo(true, true);
            }
        });

        // For each camera
        const postProcessConfigurations = Array.isArray(config.rendering)
            ? config.rendering
            : [];

        postProcessConfigurations.forEach((configuration) => {
            const camera = scene.getCameraById(configuration.cameraId);
            if (!camera) {
                return;
            }

            ssaoRenderingPipelineCameraConfigurations.set(camera, configuration.ssao2RenderingPipeline);
            vlsPostProcessCameraConfigurations.set(camera, configuration.vlsPostProcess);
            ssrRenderingPipelineCameraConfigurations.set(camera, configuration.ssrRenderingPipeline);
            motionBlurPostProcessCameraConfigurations.set(camera, configuration.motionBlurPostProcess);
            defaultPipelineCameraConfigurations.set(camera, configuration.defaultRenderingPipeline);
            iblShadowsRenderingPipelineCameraConfigurations.set(camera, configuration.iblShadowsRenderPipeline);

            if (isEditorCamera(camera)) {
                if (configuration.iblShadowsRenderPipeline) {
                    parseIblShadowsRenderingPipeline(editor, configuration.iblShadowsRenderPipeline);
                }

                if (configuration.ssao2RenderingPipeline) {
                    parseSSAO2RenderingPipeline(editor, configuration.ssao2RenderingPipeline);
                }

                if (configuration.vlsPostProcess) {
                    parseVLSPostProcess(editor, configuration.vlsPostProcess);
                }

                if (configuration.ssrRenderingPipeline) {
                    parseSSRRenderingPipeline(editor, configuration.ssrRenderingPipeline);
                }

                if (configuration.motionBlurPostProcess) {
                    parseMotionBlurPostProcess(editor, configuration.motionBlurPostProcess);
                }

                if (configuration.defaultRenderingPipeline) {
                    parseDefaultRenderingPipeline(editor, configuration.defaultRenderingPipeline);
                }
            }
        });
    }

    editor.layout.console.log("Scene loaded and editor is ready.");

    setTimeout(() => {
        updateAllLights(scene);
        updateIblShadowsRenderPipeline(scene, true);

        if (!options.asLink) {
            checkProjectCachedCompressedTextures(editor);
        }
    }, 150);

    return loadResult;
}
