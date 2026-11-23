import { join, dirname, extname } from "path/posix";
import { ensureDir, readJSON, stat, writeJSON } from "fs-extra";

import { Engine, KhronosTextureContainer2, Scene, Texture } from "babylonjs";

import { Editor } from "../../editor/main";

import { isTexture } from "../guards/texture";

import { compressFileToKtx2 } from "../../project/export/ktx2";
import { projectConfiguration } from "../../project/configuration";
import { compressFileToKtxFormat, getCompressedTexturesCliPath, ktxSupportedextensions, KTXToolsType } from "../../project/export/ktx";

import { temporaryDirectoryName } from "../project";

export function initializeKtx2Decoder(appPath: string) {
	const nodeModules = process.env.DEBUG ? "../node_modules" : "node_modules";
	KhronosTextureContainer2.URLConfig.jsDecoderModule = join(appPath, nodeModules, "babylonjs-ktx2decoder/babylon.ktx2Decoder.js");
	KhronosTextureContainer2.URLConfig.wasmUASTCToASTC = join(appPath, nodeModules, "@babylonjs/ktx2decoder/wasm/uastc_astc.wasm");
	KhronosTextureContainer2.URLConfig.wasmUASTCToBC7 = join(appPath, nodeModules, "@babylonjs/ktx2decoder/wasm/uastc_bc7.wasm");
	KhronosTextureContainer2.URLConfig.wasmUASTCToR8_UNORM = join(appPath, nodeModules, "@babylonjs/ktx2decoder/wasm/uastc_r8_unorm.wasm");
	KhronosTextureContainer2.URLConfig.wasmUASTCToRG8_UNORM = join(appPath, nodeModules, "@babylonjs/ktx2decoder/wasm/uastc_rg8_unorm.wasm");
	KhronosTextureContainer2.URLConfig.wasmUASTCToRGBA_SRGB = join(appPath, nodeModules, "@babylonjs/ktx2decoder/wasm/uastc_rgba8_srgb_v2.wasm");
	KhronosTextureContainer2.URLConfig.wasmUASTCToRGBA_UNORM = join(appPath, nodeModules, "@babylonjs/ktx2decoder/wasm/uastc_rgba8_unorm_v2.wasm");
	KhronosTextureContainer2.URLConfig.wasmZSTDDecoder = join(appPath, nodeModules, "@babylonjs/ktx2decoder/wasm/zstddec.wasm");
}

export let processingCompressedTextures = false;

export async function checkProjectCachedCompressedTextures(editor: Editor) {
	if (processingCompressedTextures || !projectConfiguration.path) {
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

	const supportedType = engine.texturesSupported[0] as KTXToolsType;

	for (const [name, textures] of getCompressibleTexturesByName(scene)) {
		if (editor.state.compressedTexturesEnabledInPreview) {
			try {
				const fileStat = await stat(join(projectDirectory, name));
				const hash = fileStat.mtimeMs.toString();

				// Textures already using the compressed image are checked too: when the project is loaded, the cached compressed
				// image is used directly (see project/load/texture.ts), even if the image changed since it was compressed.
				const isNewFile = !cache[name] || cache[name] !== hash;

				const destinationFolder = join(texturesDirectory, dirname(name));
				await ensureDir(destinationFolder);

				if (editor.state.compressedTextureSoftware === "PVRTexTool" && getCompressedTexturesCliPath()) {
					if (isNewFile || textures.some((texture) => getInternalTextureExtension(texture) !== ".ktx")) {
						const result = await compressFileToKtxFormat(editor, join(projectDirectory, name), {
							force: isNewFile,
							destinationFolder,
							format: supportedType,
						});

						if (result) {
							cache[name] = hash;
							useCompressedTexture(engine, textures, result, isNewFile);
						}
					}

					continue;
				} else if (editor.state.compressedTextureSoftware === "Khronos KTX-Software") {
					if (isNewFile || textures.some((texture) => getInternalTextureExtension(texture) !== ".ktx2")) {
						const result = await compressFileToKtx2(editor, join(projectDirectory, name), {
							force: isNewFile,
							destinationFolder,
						});

						if (result) {
							cache[name] = hash;
							useCompressedTexture(engine, textures, result, isNewFile);
						}
					}

					continue;
				}
			} catch (e) {
				if (e instanceof Error) {
					editor.layout.console.warn(`Failed to compress texture "${name}":`);
					editor.layout.console.error(e.message);
				}
			}
		}

		if (!editor.state.compressedTexturesEnabledInPreview) {
			textures.forEach((texture) => {
				const internalTextureExtension = getInternalTextureExtension(texture);
				if (internalTextureExtension === ".ktx" || internalTextureExtension === ".ktx2") {
					const previousUrl = texture.url;
					texture.updateURL(join(projectDirectory, name));
					texture.url = previousUrl;
				}
			});
		}
	}

	await writeJSON(cacheAbsolutePath, cache, {
		encoding: "utf-8",
		spaces: "\t",
	});

	processingCompressedTextures = false;
}

/**
 * Returns the textures of the given scene created from an image that can be compressed, by name. The textures created from the
 * same image (for example by several materials) have the same name: the path of the image relative to the project.
 */
function getCompressibleTexturesByName(scene: Scene): Map<string, Texture[]> {
	const textures = new Map<string, Texture[]>();

	scene.textures.forEach((texture) => {
		if (isTexture(texture) && texture.getInternalTexture() && ktxSupportedextensions.includes(extname(texture.name).toLowerCase())) {
			textures.set(texture.name, [...(textures.get(texture.name) ?? []), texture]);
		}
	});

	return textures;
}

function getInternalTextureExtension(texture: Texture): string {
	return extname(texture.getInternalTexture()?.url ?? "").toLowerCase();
}

/**
 * Makes the given textures, created from the same image, use the given compressed version of the image. When the compressed image
 * was created again (the image changed), the textures already using it load it again.
 */
function useCompressedTexture(engine: Engine, textures: Texture[], absolutePath: string, reload: boolean): void {
	const extension = extname(absolutePath).toLowerCase();
	const updatedTextures = textures.filter((texture) => texture.getInternalTexture() && (reload || getInternalTextureExtension(texture) !== extension));

	// Textures loaded from the same file share their internal texture through the cache of the engine. Without removing it, the
	// textures already using the compressed image would get its previous version back from the cache.
	const cache = engine.getLoadedTexturesCache();
	updatedTextures.forEach((texture) => {
		const index = cache.indexOf(texture.getInternalTexture()!);
		if (index !== -1) {
			cache.splice(index, 1);
		}
	});

	updatedTextures.forEach((texture) => {
		const previousUrl = texture.url;
		texture.updateURL(absolutePath);
		texture.url = previousUrl;
	});
}
