import { join, dirname, extname } from "path/posix";
import { ensureDir, readJSON, stat, writeJSON } from "fs-extra";

import { Engine } from "babylonjs";

import { Editor } from "../../editor/main";

import { isTexture } from "../guards/texture";

import { projectConfiguration } from "../../project/configuration";
import { compressFileToKtxFormat, getCompressedTexturesCliPath, ktxSupportedextensions, KTXToolsType } from "../../project/export/ktx";

import { temporaryDirectoryName } from "../project";

let processingCompressedTextures = false;

export async function checkProjectCachedCompressedTextures(editor: Editor) {
    if (
        processingCompressedTextures ||
        !projectConfiguration.path ||
        !editor.state.compressedTexturesEnabled ||
        !getCompressedTexturesCliPath()
    ) {
        return;
    }

    processingCompressedTextures = true;

    const projectDirectory = dirname(projectConfiguration.path);
    const texturesDirectory = join(projectDirectory, temporaryDirectoryName, "textures");

    const cacheAbsolutePath = join(projectDirectory, temporaryDirectoryName, ".textures-cache.json");

    let cache: Record<string, string> = {};
    try {
        cache = await readJSON(cacheAbsolutePath);
    } catch (e) {
        // Catch silently.
    }

    await ensureDir(texturesDirectory);

    const scene = editor.layout.preview.scene;
    const engine = editor.layout.preview.engine;

    if (!(engine instanceof Engine)) {
        return;
    }

    const computedTextures: string[] = [];
    const supportedType = engine.texturesSupported[0] as KTXToolsType;

    for (const texture of scene.textures) {
        if (!isTexture(texture) || computedTextures.includes(texture.name)) {
            continue;
        }

        const name = texture.name;
        const extension = extname(name).toLowerCase();

        if (!ktxSupportedextensions.includes(extension)) {
            continue;
        }

        const fileStat = await stat(join(projectDirectory, name));
        const hash = fileStat.mtimeMs.toString();

        const isNewFile = !cache[name] || cache[name] !== hash;

        cache[name] = hash;

        const destinationFolder = join(texturesDirectory, dirname(name));
        await ensureDir(destinationFolder);

        const result = await compressFileToKtxFormat(editor, join(projectDirectory, name), supportedType, isNewFile, destinationFolder);

        if (result) {
            const previousUrl = texture.url;
            texture.updateURL(result);
            texture.url = previousUrl;

            computedTextures.push(name);
        }
    }

    await writeJSON(cacheAbsolutePath, cache, {
        encoding: "utf-8",
        spaces: "\t",
    });

    processingCompressedTextures = false;
}
