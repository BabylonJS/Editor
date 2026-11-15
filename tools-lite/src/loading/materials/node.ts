import { createTexture2DFromPixels, EngineContext, Material, NodeMaterial, parseNodeMaterialFromSnippet, SceneContext, ShadowGenerator, Texture2D } from "@babylonjs/lite";

import { warnOnce } from "../../tools/warn";
import { isCascadedShadowGenerator } from "../../tools/guards";

import { loadSerializedTexture } from "../texture";

import { colorTextureRepackReason, getColorTextureRepack, loadRepackedSerializedTexture } from "./repack";

export interface IParseNodeMaterialOptions {
	/**
	 * Defines the list of shadow generators of the scene the node material receives the shadows of.
	 */
	shadowGenerators?: readonly ShadowGenerator[];
	/**
	 * Defines, for each shadow generator, the index of its light in the lights of the scene.
	 */
	shadowLightIndices?: readonly number[];
}

/**
 * Same as the node material parser of Babylon Lite: the names of the blocks are converted to WGSL identifiers.
 */
function sanitizeBlockName(name: string): string {
	return name.replace(/[^A-Za-z0-9_]/g, "_");
}

/**
 * Returns a copy of the given serialized node material where the names of the blocks that can't be converted to valid
 * WGSL identifiers by Babylon Lite (the names starting with a digit, ie. "2π" or "0.5") are prefixed by "_".
 */
function getCompatibleNodeMaterialData(data: any): any {
	const needsRename = (name: unknown) => typeof name === "string" && /^[0-9]/.test(sanitizeBlockName(name));
	if (!(data.blocks ?? []).some((block: any) => needsRename(block.name))) {
		return data;
	}

	return {
		...data,
		blocks: data.blocks.map((block: any) => (needsRename(block.name) ? { ...block, name: `_${block.name}` } : block)),
	};
}

/**
 * Defines the maximum length of the WGSL code generated for a node material. The node material compiler of Babylon
 * Lite can generate gigantic shaders for some graphs (the shared expressions are written again for each use instead
 * of being stored in temporary variables), that the browser fails to compile and that freeze the page.
 */
export const maxNodeMaterialShaderLength = 2_000_000;

const guardedDevices = new WeakSet<object>();

/**
 * Makes the creation of the shader modules of the given engine fail for the shaders longer than
 * `maxNodeMaterialShaderLength`, so the node material is rejected instead of freezing the page.
 */
function guardShaderModulesCreation(engine: EngineContext): void {
	const device = (engine as { _device?: GPUDevice })._device;
	if (!device || guardedDevices.has(device) || typeof device.createShaderModule !== "function") {
		return;
	}

	guardedDevices.add(device);

	const createShaderModule = device.createShaderModule;
	device.createShaderModule = function (descriptor: GPUShaderModuleDescriptor): GPUShaderModule {
		if (descriptor.code.length > maxNodeMaterialShaderLength) {
			throw new Error(`The generated shader "${descriptor.label ?? ""}" is too large to be compiled (${descriptor.code.length} characters).`);
		}

		return createShaderModule.call(this, descriptor);
	};
}

const defaultNodeTextures = new WeakMap<EngineContext, Texture2D>();

function getDefaultNodeTexture(engine: EngineContext): Texture2D {
	let texture = defaultNodeTextures.get(engine);
	if (!texture) {
		texture = createTexture2DFromPixels(engine, new Uint8Array([255, 255, 255, 255]), 1, 1);
		defaultNodeTextures.set(engine, texture);
	}

	return texture;
}

/**
 * Parses the given serialized Babylon.js node material (`BABYLON.NodeMaterial`) using the node material parser
 * of Babylon Lite. The textures of the texture blocks are loaded by the tools (so the quality and the compressed
 * textures configurations apply) and given to the parser as overrides.
 * @param scene defines the reference to the scene being loaded.
 * @param rootUrl defines the root url of the scene.
 * @param data defines the serialized material.
 * @param options defines the options of the node material (shadows, etc.).
 */
export async function parseNodeMaterial(scene: SceneContext, rootUrl: string, data: any, options?: IParseNodeMaterialOptions): Promise<NodeMaterial> {
	const textures: Record<string, Texture2D> = {};

	data = getCompatibleNodeMaterialData(data);

	await Promise.all(
		(data.blocks ?? []).map(async (block: any) => {
			const textureData = block.texture;
			if (!textureData || textureData.isCube || !block.name) {
				return;
			}

			const effectiveData = {
				...textureData,
				name: textureData.name || textureData.url,
			};

			// Babylon.js converts the colors of the textures to linear (`convertToLinearSpace`) only when they are in gamma
			// space, while the texture blocks of Babylon Lite always convert them: the textures are repacked so Babylon Lite
			// decodes them to the same values.
			const { repack, srgb } = block.convertToLinearSpace ? getColorTextureRepack(effectiveData, true) : { repack: null, srgb: false };
			const texture = repack
				? await loadRepackedSerializedTexture(scene, rootUrl, effectiveData, { repack, reason: colorTextureRepackReason, srgb })
				: await loadSerializedTexture(scene, rootUrl, effectiveData, { srgb });

			// The textures are bound by Babylon Lite using the names of the blocks converted to WGSL identifiers.
			if (texture) {
				textures[sanitizeBlockName(block.name)] = texture;
			}
		})
	);

	// The node materials of Babylon Lite receive only the exponential and PCF shadows (not the cascaded shadows).
	const shadowGenerators: ShadowGenerator[] = [];
	const shadowLightIndices: number[] = [];

	options?.shadowGenerators?.forEach((shadowGenerator, index) => {
		if (isCascadedShadowGenerator(shadowGenerator)) {
			return warnOnce("node-material-csm", "the node materials don't receive the cascaded shadows in Babylon Lite.");
		}

		shadowGenerators.push(shadowGenerator);
		shadowLightIndices.push(options.shadowLightIndices?.[index] ?? index);
	});

	guardShaderModulesCreation(scene.surface.engine);

	const material = await parseNodeMaterialFromSnippet(scene.surface.engine, "", {
		json: data,
		textures,
		shadowGenerators: shadowGenerators.length ? shadowGenerators : undefined,
		shadowLightIndices: shadowLightIndices.length ? shadowLightIndices : undefined,
	});

	// A texture that can't be loaded must not prevent the scene from being built: Babylon Lite requires a texture for each texture block.
	Object.entries(material.inputs).forEach(([name, input]) => {
		if (input.type === "texture2d" && !input.texture) {
			console.warn(`Babylon.js Editor Tools Lite: the texture "${name}" of the node material "${data.name}" is not available, a white texture is used instead.`);
			input.texture = getDefaultNodeTexture(scene.surface.engine);
		}
	});

	(material as Material).name = data.name;
	(material as Material).metadata = data.metadata;

	return material;
}
