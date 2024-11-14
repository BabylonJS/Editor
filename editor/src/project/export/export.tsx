import { join, dirname, basename, extname } from "path/posix";
import { copyFile, pathExists, readJSON, readdir, remove, writeJSON } from "fs-extra";

import { RenderTargetTexture, SceneSerializer } from "babylonjs";

import { toast } from "sonner";

import { isTexture } from "../../tools/guards/texture";
import { executeSimpleWorker } from "../../tools/worker";
import { getCollisionMeshFor } from "../../tools/mesh/collision";
import { createDirectoryIfNotExist, normalizedGlob } from "../../tools/fs";
import { isCollisionMesh, isEditorCamera, isMesh } from "../../tools/guards/nodes";

import { serializeSSRRenderingPipeline } from "../../editor/rendering/ssr";
import { serializeMotionBlurPostProcess } from "../../editor/rendering/motion-blur";
import { serializeSSAO2RenderingPipeline } from "../../editor/rendering/ssao";
import { serializeDefaultRenderingPipeline } from "../../editor/rendering/default-pipeline";

import { Editor } from "../../editor/main";

import { writeBinaryGeometry } from "../geometry";

import { compressFileToKtx } from "./ktx";
import { configureMeshesLODs } from "./lod";
import { handleExportScripts } from "./scripts";
import { handleComputeExportedTexture } from "./texture";
import { EditorExportProjectProgressComponent } from "./progress";

const supportedImagesExtensions: string[] = [
    ".jpg", ".jpeg",
    ".png",
    ".bmp",
];

const supportedCubeTexturesExtensions: string[] = [
    ".env", ".dds",
];

const supportedAudioExtensions: string[] = [
    ".mp3", ".wav", ".ogg",
];

const supportedJsonExtensions: string[] = [
    ".gui",
];

const supportedExtensions: string[] = [
    ...supportedImagesExtensions,
    ...supportedCubeTexturesExtensions,
    ...supportedAudioExtensions,
    ...supportedJsonExtensions,
];

export type IExportProjectOptions = {
    optimize: boolean;
    noProgress?: boolean;
};

export async function exportProject(editor: Editor, options: IExportProjectOptions): Promise<void> {
    if (!editor.state.projectPath || !editor.state.lastOpenedScenePath) {
        return;
    }

    let progress: EditorExportProjectProgressComponent | null = null;
    const toastId = toast(<EditorExportProjectProgressComponent ref={(r) => progress = r} />, {
        dismissible: false,
        duration: options.noProgress ? -1 : Infinity,
    });

    const scene = editor.layout.preview.scene;
    const editorCamera = scene.cameras.find((camera) => isEditorCamera(camera));

    const savedGeometries: string[] = [];

    // Configure textures to store base size. This will be useful for the scene loader located
    // in the `babylonjs-editor-tools` package.
    scene.textures.forEach((texture) => {
        if (isTexture(texture)) {
            texture.metadata ??= {};
            texture.metadata.baseSize = {
                width: texture.getBaseSize().width,
                height: texture.getBaseSize().height,
            };
        }
    });

    scene.meshes.forEach((mesh) => mesh.doNotSerialize = mesh.metadata?.doNotSerialize ?? false);
    scene.lights.forEach((light) => light.doNotSerialize = light.metadata?.doNotSerialize ?? false);
    scene.cameras.forEach((camera) => camera.doNotSerialize = camera.metadata?.doNotSerialize ?? false);
    scene.transformNodes.forEach((transformNode) => transformNode.doNotSerialize = transformNode.metadata?.doNotSerialize ?? false);

    const data = await SceneSerializer.SerializeAsync(scene);

    scene.meshes.forEach((mesh) => mesh.doNotSerialize = false);
    scene.lights.forEach((light) => light.doNotSerialize = false);
    scene.cameras.forEach((camera) => camera.doNotSerialize = false);
    scene.transformNodes.forEach((transformNode) => transformNode.doNotSerialize = false);

    const editorCameraIndex = data.cameras?.findIndex((camera) => camera.id === editorCamera?.id);
    if (editorCameraIndex !== -1) {
        data.cameras?.splice(editorCameraIndex, 1);
    }

    data.metadata ??= {};
    data.metadata.rendering = {
        ssrRenderingPipeline: serializeSSRRenderingPipeline(),
        motionBlurPostProcess: serializeMotionBlurPostProcess(),
        ssao2RenderingPipeline: serializeSSAO2RenderingPipeline(),
        defaultRenderingPipeline: serializeDefaultRenderingPipeline(),
    };

    delete data.postProcesses;

    configureMeshesLODs(data, scene);

    const projectDir = dirname(editor.state.projectPath);
    const publicPath = join(projectDir, "public");

    const sceneName = basename(editor.state.lastOpenedScenePath).split(".").shift()!;

    await createDirectoryIfNotExist(join(publicPath, "scene"));
    await createDirectoryIfNotExist(join(publicPath, "scene", sceneName));

    const scenePath = join(publicPath, "scene");

    // Write all geometries as incremental. This makes the scene way less heavy as binary saved geometry
    // is not stored in the JSON scene file. Moreover, this may allow to load geometries on the fly compared
    // to single JSON file.
    await Promise.all(data.meshes?.map(async (mesh: any) => {
        const instantiatedMesh = scene.getMeshById(mesh.id);

        if (instantiatedMesh) {
            if (isMesh(instantiatedMesh)) {
                const collisionMesh = getCollisionMeshFor(instantiatedMesh);
                if (collisionMesh) {
                    mesh.isPickable = false;
                    mesh.checkCollisions = false;

                    mesh.instances?.forEach((instance) => {
                        instance.isPickable = false;
                        instance.checkCollisions = false;
                    });
                }
            }

            if (isCollisionMesh(instantiatedMesh)) {
                if (mesh.materialId) {
                    const materialIndex = data.materials.findIndex((material: any) => {
                        return material.id === mesh.materialId;
                    });

                    if (materialIndex !== -1) {
                        data.materials.splice(materialIndex);
                    }
                }

                mesh.checkCollisions = true;
                mesh.instances?.forEach((instance) => {
                    instance.checkCollisions = true;
                });
            }
        }

        const geometry = data.geometries?.vertexData?.find((v) => v.id === mesh.geometryId);

        if (geometry) {
            const geometryFileName = `${geometry.id}.babylonbinarymeshdata`;

            mesh.delayLoadingFile = `${sceneName}/${geometryFileName}`;
            mesh.boundingBoxMaximum = instantiatedMesh?.getBoundingInfo()?.maximum?.asArray() ?? [0, 0, 0];
            mesh.boundingBoxMinimum = instantiatedMesh?.getBoundingInfo()?.minimum?.asArray() ?? [0, 0, 0];
            mesh._binaryInfo = {};

            const geometryPath = join(scenePath, sceneName, geometryFileName);

            try {
                await writeBinaryGeometry(geometryPath, geometry, mesh);

                let geometryIndex = -1;
                do {
                    geometryIndex = data.geometries!.vertexData!.findIndex((g) => g.id === mesh.geometryId);
                    if (geometryIndex !== -1) {
                        data.geometries!.vertexData!.splice(geometryIndex, 1);
                    }
                } while (geometryIndex !== -1);

                savedGeometries.push(geometryFileName);
            } catch (e) {
                editor.layout.console.error(`Export: Failed to write geometry for mesh ${mesh.name}`);
            }
        }
    }));

    // Configure lights
    data.shadowGenerators?.forEach((shadowGenerator) => {
        const instantiatedLight = scene.getLightById(shadowGenerator.lightId);
        const instantiatedShadowGenerator = instantiatedLight?.getShadowGenerator();

        const light = data.lights?.find((light) => light.id === shadowGenerator.lightId);
        if (light && instantiatedShadowGenerator) {
            light.metadata ??= {};
            light.metadata.refreshRate = instantiatedShadowGenerator?.getShadowMap()?.refreshRate ?? RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
        }
    });

    // Write final scene file.
    await writeJSON(join(scenePath, `${sceneName}.babylon`), data);

    // Clear old geometries
    const geometriesDir = join(scenePath, sceneName);
    const geometriesFiles = await readdir(geometriesDir);

    await Promise.all(geometriesFiles.map(async (file) => {
        if (!savedGeometries.includes(file)) {
            await remove(join(geometriesDir, file));
        }
    }));

    // Copy files
    const files = await normalizedGlob(join(projectDir, "/assets/**/*"), {
        nodir: true,
        ignore: {
            childrenIgnored: (p) => extname(p.name) === ".scene",
        }
    });

    // Export scripts
    await handleExportScripts(editor);

    // Export assets
    const promises: Promise<void>[] = [];
    const progressStep = 100 / files.length;

    let cache: Record<string, string> = {};
    try {
        cache = await readJSON(join(projectDir, "assets/.export-cache.json"));
    } catch (e) {
        // Catch silently.
    }

    for (const file of files) {
        if (promises.length >= 5) {
            await Promise.all(promises);
            promises.length = 0;
        }

        promises.push(new Promise<void>(async (resolve) => {
            await processFile(editor, file as string, options.optimize, scenePath, projectDir, cache);
            progress?.step(progressStep);
            resolve();
        }));
    }

    await Promise.all(promises);

    await writeJSON(join(projectDir, "assets/.export-cache.json"), cache, {
        encoding: "utf-8",
        spaces: "\t",
    });

    toast.dismiss(toastId);

    if (options.optimize) {
        toast.success("Project exported");
    }
}

async function processFile(editor: Editor, file: string, optimize: boolean, scenePath: string, projectDir: string, cache: Record<string, string>): Promise<void> {
    const extension = extname(file).toLocaleLowerCase();
    if (!supportedExtensions.includes(extension)) {
        return;
    }

    const relativePath = file.replace(join(projectDir, "/"), "");
    const split = relativePath.split("/");

    let path = "";
    for (let i = 0; i < split.length - 1; ++i) {
        try {
            await createDirectoryIfNotExist(join(scenePath, path, split[i]));
        } catch (e) {
            // Catch silently.
        }

        path = join(path, split[i]);
    }

    let isNewFile = false;

    if (optimize) {
        const hash = await executeSimpleWorker<string>(join(__dirname, "./workers/md5.js"), file);
        isNewFile = !cache[relativePath] || cache[relativePath] !== hash;

        cache[relativePath] = hash;
    }

    const finalPath = join(scenePath, relativePath);
    const finalPathExists = await pathExists(finalPath);

    defer: {
        if (
            supportedImagesExtensions.includes(extension) ||
            supportedCubeTexturesExtensions.includes(extension)
        ) {
            if (!isNewFile && finalPathExists) {
                break defer;
            }
        }

        await copyFile(file, finalPath);
    }

    if (optimize) {
        await compressFileToKtx(editor, finalPath, undefined, isNewFile);
    }

    if (optimize && supportedImagesExtensions.includes(extension)) {
        await handleComputeExportedTexture(editor, finalPath, isNewFile);
    }
}
