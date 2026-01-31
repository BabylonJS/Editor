import { pathExistsSync } from "fs-extra";
import { join, dirname, extname, resolve } from "path/posix";

import { Engine, Scene, SerializationHelper, BaseTexture } from "babylonjs";

import { isTexture } from "../../tools/guards/texture";
import { temporaryDirectoryName } from "../../tools/project";
import { loadSavedAssetsCache } from "../../tools/assets/cache";

import { Editor } from "../../editor/main";

import { getCompressedTextureFilename, ktxSupportedextensions, KTXToolsType } from "../export/ktx";

import { projectConfiguration } from "../configuration";

const originalTextureParser = SerializationHelper._TextureParser;

function textureParser(editor: Editor, source: any, scene: Scene, rootUrl: string): BaseTexture | null {
	const engine = scene.getEngine();

	const name = source.name;
	const extension = extname(name).toLowerCase();

	const play = editor.layout.preview.play;
	if (play.state.loading) {
		// Re-write rootUrl to exclude public/scene in order to
		// reuse already loaded textures and save video memory.
		if (!source.url?.includes("assets/editor-generated_extracted-textures")) {
			rootUrl = join(resolve(rootUrl, "../../"), "/");
		}
	}

	const assetsCache = loadSavedAssetsCache();
	if (source.name && assetsCache[source.name]) {
		source.name = assetsCache[source.name].newRelativePath;
	}

	if (source.url && assetsCache[source.url]) {
		source.url = assetsCache[source.url].newRelativePath;
	}

	if (
		!source.name ||
		!projectConfiguration.path ||
		!projectConfiguration.compressedTexturesEnabled ||
		!ktxSupportedextensions.includes(extension) ||
		!(engine instanceof Engine)
	) {
		return originalTextureParser(source, scene, rootUrl);
	}

	const supportedType = engine.texturesSupported[0] as KTXToolsType;

	const compressedTextureFilename = getCompressedTextureFilename(source.name, supportedType);

	const projectDirectory = dirname(projectConfiguration.path);
	const compressedTextureAbsolutePath = join(projectDirectory, temporaryDirectoryName, "textures", compressedTextureFilename);

	if (pathExistsSync(compressedTextureAbsolutePath)) {
		source.name = join(temporaryDirectoryName, "textures", compressedTextureFilename);

		const texture = originalTextureParser(source, scene, rootUrl);
		if (texture && isTexture(texture)) {
			texture.name = name;
			texture.url = source.url;

			return texture;
		}
	}

	return originalTextureParser(source, scene, rootUrl);
}

let registered = false;

export function registerTextureParser(editor: Editor) {
	if (registered) {
		return;
	}

	registered = true;

	SerializationHelper._TextureParser = (source: any, scene: Scene, rootUrl: string) => {
		return textureParser(editor, source, scene, rootUrl);
	};
}
