import { join, dirname, basename, extname } from "path/posix";
import { copyFile, pathExists, readJSON, readdir, writeFile, writeJSON } from "fs-extra";

import sharp from "sharp";
import { SceneSerializer } from "babylonjs";

import { toast } from "sonner";

import { isTexture } from "../../tools/guards/texture";
import { executeSimpleWorker } from "../../tools/worker";
import { isEditorCamera } from "../../tools/guards/nodes";
import { getPowerOfTwoUntil } from "../../tools/maths/scalar";
import { createDirectoryIfNotExist, normalizedGlob } from "../../tools/fs";

import { serializeSSRRenderingPipeline } from "../../editor/rendering/ssr";
import { serializeMotionBlurPostProcess } from "../../editor/rendering/motion-blur";
import { serializeSSAO2RenderingPipeline } from "../../editor/rendering/ssao";
import { serializeDefaultRenderingPipeline } from "../../editor/rendering/default-pipeline";

import { Editor } from "../../editor/main";

import { writeBinaryGeometry } from "../geometry";

import { compressFileToKtx } from "./ktx";
import { configureMeshesLODs } from "./lod";
import { EditorExportProjectProgressComponent } from "./progress";

const supportedImagesExtensions: string[] = [
    ".jpg", ".jpeg",
    ".png",
    ".bmp",
];

const supportedCubeTexturesExtensions: string[] = [
    ".env", ".dds",
];

const supportedExtensions: string[] = [
    ...supportedImagesExtensions,
    ...supportedCubeTexturesExtensions,
];

export async function exportProject(editor: Editor, optimize: boolean): Promise<void> {
    if (!editor.state.projectPath || !editor.state.lastOpenedScenePath) {
        return;
    }

    let progress: EditorExportProjectProgressComponent | null = null;
    const toastId = toast(<EditorExportProjectProgressComponent ref={(r) => progress = r} />, {
        dismissible: false,
        duration: optimize ? Infinity : -1,
    });

    const scene = editor.layout.preview.scene;
    const editorCamera = scene.cameras.find((camera) => isEditorCamera(camera));

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

    const data = await SceneSerializer.SerializeAsync(scene);

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
    await Promise.all(data.meshes?.map(async (mesh) => {
        const instantiatedMesh = scene.getMeshById(mesh.id);
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
            } catch (e) {
                editor.layout.console.error(`Export: Failed to write geometry for mesh ${mesh.name}`);
            }
        }
    }));

    // Write final scene file.
    await writeJSON(join(scenePath, `${sceneName}.babylon`), data);

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
            await processFile(editor, file as string, optimize, scenePath, projectDir, cache);
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

    if (optimize) {
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

    let isNewTexture = false;

    if (optimize) {
        const hash = await executeSimpleWorker<string>(join(__dirname, "./workers/md5.js"), file);
        isNewTexture = !cache[relativePath] || cache[relativePath] !== hash;

        cache[relativePath] = hash;
    }

    const finalPath = join(scenePath, relativePath);

    if (isNewTexture) {
        await copyFile(file, finalPath);
    }

    if (optimize) {
        await compressFileToKtx(editor, finalPath, undefined, isNewTexture);
    }

    if (optimize && supportedImagesExtensions.includes(extension)) {
        await handleComputeExportedTexture(editor, finalPath, isNewTexture);
    }
}

const scriptsTemplate = `
/**
 * Generated by Babylon.js Editor
 */
export const scriptsMap = {
    {{exports}}
};
`;

export async function handleExportScripts(editor: Editor): Promise<void> {
    if (!editor.state.projectPath) {
        return;
    }

    const projectPath = dirname(editor.state.projectPath);

    const sceneFolders = await normalizedGlob(join(projectPath, "assets/**/*.scene"), {
        nodir: false,
    });

    const scriptsMap: Record<string, string> = {};

    await Promise.all(sceneFolders.map(async (file) => {
        const availableMetadata: any[] = [];

        try {
            const config = await readJSON(join(file, "config.json"));
            if (config.metadata) {
                availableMetadata.push(config.metadata);
            }
        } catch (e) {
            // Catch silently.
        }

        const [nodesFiles, meshesFiles, lightsFiles, cameraFiles] = await Promise.all([
            readdir(join(file, "nodes")),
            readdir(join(file, "meshes")),
            readdir(join(file, "lights")),
            readdir(join(file, "cameras")),
        ]);

        await Promise.all([
            ...nodesFiles.map((file) => join("nodes", file)),
            ...meshesFiles.map((file) => join("meshes", file)),
            ...lightsFiles.map((file) => join("lights", file)),
            ...cameraFiles.map((file) => join("cameras", file)),
        ].map(async (f) => {
            const data = await readJSON(join(file, f), "utf-8");
            if (data.metadata) {
                availableMetadata.push(data.metadata);
            }
        }));

        const promises: Promise<void>[] = [];
        for (const metadata of availableMetadata) {
            if (!metadata.scripts) {
                continue;
            }

            for (const script of metadata.scripts) {
                promises.push(new Promise<void>(async (resolve) => {
                    const path = join(projectPath, "src", script.key);
                    if (!await pathExists(path)) {
                        return resolve();
                    }

                    const extension = extname(script.key).toLowerCase();
                    scriptsMap[script.key] = `@/${script.key.replace(extension, "")}`;

                    resolve();
                }));
            }
        }

        await Promise.all(promises);
    }));

    await writeFile(
        join(projectPath, "src/scripts.ts"),
        scriptsTemplate.replace("{{exports}}", Object.keys(scriptsMap).map((key) => `"${key}": require("${scriptsMap[key]}")`).join(",\n\t")),
        {
            encoding: "utf-8",
        });
}

export async function handleComputeExportedTexture(editor: Editor, absolutePath: string, force: boolean): Promise<void> {
    const extension = extname(absolutePath).toLocaleLowerCase();

    const metadata = await sharp(absolutePath).metadata();
    if (!metadata.width || !metadata.height) {
        return editor.layout.console.error(`Failed to compute exported image "${absolutePath}". Image metadata is invalid.`);
    }

    const width = metadata.width;
    const height = metadata.height;

    type _DownscaledTextureSize = {
        width: number;
        height: number;
    };

    const availableSizes: _DownscaledTextureSize[] = [];

    const midWidth = width * 0.66;
    const midHeight = height * 0.66;

    availableSizes.push({
        width: getPowerOfTwoUntil(midWidth),
        height: getPowerOfTwoUntil(midHeight),
    });

    const lowWidth = width * 0.33;
    const lowHeight = height * 0.33;

    availableSizes.push({
        width: getPowerOfTwoUntil(lowWidth),
        height: getPowerOfTwoUntil(lowHeight),
    });

    for (const size of availableSizes) {
        const nameWithoutExtension = basename(absolutePath).replace(extension, "");
        const finalName = `${nameWithoutExtension}_${size.width}_${size.height}${extension}`;
        const finalPath = join(dirname(absolutePath), finalName);

        if (force || !await pathExists(finalPath)) {
            const log = await editor.layout.console.progress(`Exporting scaled image "${finalName}"`);

            try {
                const buffer = await sharp(absolutePath).resize(size.width, size.height).toBuffer();

                await writeFile(finalPath, buffer);

                log.setState({
                    done: true,
                    message: `Exported image scaled image "${finalName}"`,
                });
            } catch (e) {
                log.setState({
                    done: true,
                    error: true,
                    message: `Failed to export image scaled image "${finalName}"`,
                });
            }
        }

        await compressFileToKtx(editor, finalPath, undefined, force);
    }
}
