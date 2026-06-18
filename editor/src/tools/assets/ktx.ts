import { join, dirname, extname } from "path/posix";
import { ensureDir, readJSON, stat, writeJSON } from "fs-extra";

import { Engine, KhronosTextureContainer2 } from "babylonjs";

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

		const internalTexture = texture.getInternalTexture();
		if (!internalTexture) {
			continue;
		}

		const internalTextureExtension = extname(internalTexture.url).toLowerCase();

		if (editor.state.compressedTexturesEnabledInPreview) {
			const fileStat = await stat(join(projectDirectory, name));
			const hash = fileStat.mtimeMs.toString();

			const isNewFile = !cache[name] || cache[name] !== hash;

			const destinationFolder = join(texturesDirectory, dirname(name));
			await ensureDir(destinationFolder);

			if (editor.state.compressedTextureSoftware === "PVRTexTool" && getCompressedTexturesCliPath() && internalTextureExtension !== ".ktx") {
				cache[name] = hash;

				const result = await compressFileToKtxFormat(editor, join(projectDirectory, name), {
					force: isNewFile,
					destinationFolder,
					format: supportedType,
				});

				if (result) {
					const previousUrl = texture.url;
					texture.updateURL(result);
					texture.url = previousUrl;

					computedTextures.push(name);
				}

				continue;
			} else if (editor.state.compressedTextureSoftware === "Khronos KTX-Software" && internalTextureExtension !== ".ktx2") {
				cache[name] = hash;

				const result = await compressFileToKtx2(editor, join(projectDirectory, name), {
					force: isNewFile,
					destinationFolder,
				});

				if (result) {
					const previousUrl = texture.url;
					texture.updateURL(result);
					texture.url = previousUrl;

					computedTextures.push(name);
				}

				continue;
			}
		}

		if (!editor.state.compressedTexturesEnabledInPreview && (internalTextureExtension === ".ktx" || internalTextureExtension === ".ktx2")) {
			const previousUrl = texture.url;
			texture.updateURL(join(projectDirectory, name));
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
