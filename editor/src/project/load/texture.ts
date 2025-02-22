import { pathExistsSync } from "fs-extra";
import { join, dirname, extname } from "path/posix";

import { Engine, SerializationHelper } from "babylonjs";

import { isTexture } from "../../tools/guards/texture";
import { temporaryDirectoryName } from "../../tools/project";

import { getCompressedTextureFilename, ktxSupportedextensions, KTXToolsType } from "../export/ktx";

import { projectConfiguration } from "../configuration";

const textureParser = SerializationHelper._TextureParser;

SerializationHelper._TextureParser = (source, scene, rootUrl) => {
    const engine = scene.getEngine();

    const name = source.name;
    const extension = extname(name).toLowerCase();

    if (
        !source.name ||
        !projectConfiguration.path ||
        !ktxSupportedextensions.includes(extension) ||
        !(engine instanceof Engine)
    ) {
        return textureParser(source, scene, rootUrl);
    }

    const supportedType = engine.texturesSupported[0] as KTXToolsType;

    const compressedTextureFilename = getCompressedTextureFilename(source.name, supportedType);

    const projectDirectory = dirname(projectConfiguration.path);
    const compressedTextureAbsolutePath = join(projectDirectory, temporaryDirectoryName, "textures", compressedTextureFilename);

    if (pathExistsSync(compressedTextureAbsolutePath)) {
        source.name = join(temporaryDirectoryName, "textures", compressedTextureFilename);

        const texture = textureParser(source, scene, rootUrl);
        if (texture && isTexture(texture)) {
            texture.name = name;
            texture.url = source.url;

            return texture;
        }
    }

    return textureParser(source, scene, rootUrl);
};
