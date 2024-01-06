import { join } from "path/posix";
import { readJSON, readdir } from "fs-extra";

import { Camera, CascadedShadowGenerator, Constants, Light, Mesh, SceneLoader, SceneLoaderFlags, ShadowGenerator, Texture, TransformNode } from "babylonjs";

import { Editor } from "../../editor/main";
import { EditorCamera } from "../../editor/nodes/camera";

import { wait } from "../../tools/tools";
import { createDirectoryIfNotExist } from "../../tools/fs";

import { isMesh } from "../../tools/guards/nodes";
import { isCubeTexture } from "../../tools/guards/texture";

export async function loadScene(editor: Editor, projectPath: string, scenePath: string): Promise<void> {
    const scene = editor.layout.preview.scene;
    const relativeScenePath = scenePath.replace(join(projectPath, "/"), "");

    // Prepare directories
    await Promise.all([
        createDirectoryIfNotExist(join(scenePath, "nodes")),
        createDirectoryIfNotExist(join(scenePath, "meshes")),
        createDirectoryIfNotExist(join(scenePath, "lights")),
        createDirectoryIfNotExist(join(scenePath, "shadowGenerators")),
    ]);

    const [nodesFiles, meshesFiles, lightsFiles, shadowGeneratorFiles] = await Promise.all([
        readdir(join(scenePath, "nodes")),
        readdir(join(scenePath, "meshes")),
        readdir(join(scenePath, "lights")),
        readdir(join(scenePath, "shadowGenerators")),
    ]);

    SceneLoaderFlags.ForceFullSceneLoadingForIncremental = true;

    const config = await readJSON(join(scenePath, "config.json"), "utf-8");

    // Load camera
    const camera = Camera.Parse(config.editorCamera, scene) as EditorCamera | null;

    if (camera) {
        editor.layout.preview.camera.dispose();
        editor.layout.preview.camera = camera;

        camera.attachControl(true);
    }

    // Load environment
    scene.environmentIntensity = config.environment.environmentIntensity;

    if (config.environment.environmentTexture) {
        scene.environmentTexture = Texture.Parse(config.environment.environmentTexture, scene, join(projectPath, "/"));

        if (isCubeTexture(scene.environmentTexture)) {
            scene.environmentTexture.url = join(projectPath, scene.environmentTexture.name);
        }
    }

    // Load meshes
    await Promise.all(meshesFiles.map(async (file) => {
        const data = await readJSON(join(scenePath, "meshes", file), "utf-8");

        const result = await SceneLoader.ImportMeshAsync("", join(projectPath, "/"), join(relativeScenePath, "meshes", file), scene, null, ".babylon");
        const meshes = result.meshes.filter((m) => isMesh(m)) as Mesh[];

        while (meshes.find((m) => m.delayLoadState && m.delayLoadState !== Constants.DELAYLOADSTATE_LOADED)) {
            await wait(150);
        }

        result.meshes.forEach((m) => {
            if (!isMesh(m) || !m.geometry) {
                return;
            }

            const meshData = data.meshes?.find((d) => d.id === m.id);

            if ((meshData?.uniqueId ?? null) !== null) {
                m.uniqueId = meshData.uniqueId;
                m._waitingParentId = meshData.parentId;
            }

            if (m.material) {
                const material = data.materials?.find((d) => d.id === m.material!.id);
                if (material) {
                    m.material.uniqueId = material.uniqueId;
                }
            }

            if (meshData?.geometryId) {
                const geometryData = data.geometries?.vertexData?.find((v) => v.id === meshData.geometryId);
                if (geometryData) {
                    m.geometry.id = geometryData.id;
                    m.geometry.uniqueId = geometryData.uniqueId;
                }
            }
        });
    }));

    // Load transform nodes
    await Promise.all(nodesFiles.map(async (file) => {
        const data = await readJSON(join(scenePath, "nodes", file), "utf-8");

        const transformNode = TransformNode.Parse(data, scene, join(projectPath, "/"));
        transformNode.uniqueId = data.uniqueId;
    }));

    // Load lights
    await Promise.all(lightsFiles.map(async (file) => {
        const data = await readJSON(join(scenePath, "lights", file), "utf-8");

        const light = Light.Parse(data, scene);
        if (light) {
            light.uniqueId = data.uniqueId;
        }
    }));

    // Load shadow generators
    await Promise.all(shadowGeneratorFiles.map(async (file) => {
        const data = await readJSON(join(scenePath, "shadowGenerators", file), "utf-8");

        if (data.className === CascadedShadowGenerator.CLASSNAME) {
            CascadedShadowGenerator.Parse(data, scene);
        } else {
            ShadowGenerator.Parse(data, scene);
        }
    }));

    // Configure waiting parent ids.
    [
        ...scene.transformNodes,
        ...scene.meshes,
        ...scene.lights,
        ...scene.cameras,
    ].forEach((n) => {
        if ((n._waitingParentId ?? null) === null) {
            return;
        }

        const transformNode = scene.getTransformNodeByUniqueId(n._waitingParentId as any);
        if (transformNode) {
            return (n.parent = transformNode);
        }

        const mesh = scene.getMeshByUniqueId(n._waitingParentId as any);
        if (mesh) {
            return (n.parent = mesh);
        }

        const light = scene.getLightByUniqueId(n._waitingParentId as any);
        if (light) {
            return (n.parent = light);
        }

        const camera = scene.getCameraByUniqueId(n._waitingParentId as any);
        if (camera) {
            return (n.parent = camera);
        }
    });
}
