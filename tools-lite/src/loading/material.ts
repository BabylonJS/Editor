import { Material, SceneContext, ShadowGenerator } from "@babylonjs/lite";

import { loadJsonFile } from "../tools/request";

import { parsePbrMaterial } from "./materials/pbr";
import { parseNodeMaterial } from "./materials/node";
import { parseSkyMaterial } from "./materials/sky";
import { parseStandardMaterial } from "./materials/standard";

export interface IParseMaterialOptions {
	/**
	 * Defines the ambient color of the scene, multiplied by the ambient color of the standard materials as Babylon.js does.
	 */
	sceneAmbientColor?: number[];
	/**
	 * Defines the list of shadow generators of the scene, required by the node materials to receive the shadows.
	 */
	shadowGenerators?: readonly ShadowGenerator[];
	/**
	 * Defines, for each shadow generator, the index of its light in the lights of the scene.
	 */
	shadowLightIndices?: readonly number[];
}

const skyMaterials = new WeakMap<Material, any>();
const serializedMaterials = new WeakMap<Material, { data: any; rootUrl: string }>();

/**
 * @internal
 * Returns the serialized Babylon.js material the given material has been created from, if any (used to render the
 * materials the way Babylon.js does where Babylon Lite has no equivalent, ie. the glow layer).
 * @param material defines the reference to the material.
 */
export function _getSerializedMaterialData(material: Material | null | undefined): any | null {
	return material ? (serializedMaterials.get(material)?.data ?? null) : null;
}

/**
 * @internal
 * Returns the root url of the scene the given material has been loaded from, if any.
 * @param material defines the reference to the material.
 */
export function _getSerializedMaterialRootUrl(material: Material | null | undefined): string | null {
	return material ? (serializedMaterials.get(material)?.rootUrl ?? null) : null;
}

/**
 * Returns the serialized data of the sky material (`BABYLON.SkyMaterial`) the given material has been created from,
 * if any. Babylon Lite has no sky material: the sky materials are created as shader materials rendering the same
 * sky model (see `parseSkyMaterial`).
 * @param material defines the reference to the material.
 */
export function getSkyMaterialData(material: Material | null | undefined): any | null {
	return material ? (skyMaterials.get(material) ?? null) : null;
}

/**
 * Parses the given serialized Babylon.js material and creates the equivalent Babylon Lite material.
 * Supported materials are PBR materials, standard materials, node materials and sky materials.
 * @param scene defines the reference to the scene where the material is used.
 * @param rootUrl defines the root url of the scene.
 * @param data defines the serialized material.
 * @param options defines the options used to parse the material.
 * @returns the created material, or null if the type of the material is not supported.
 */
export async function parseSerializedMaterial(scene: SceneContext, rootUrl: string, data: any, options?: IParseMaterialOptions): Promise<Material | null> {
	const material = await parseMaterial(scene, rootUrl, data, options);
	if (material) {
		serializedMaterials.set(material, { data, rootUrl });
	}

	return material;
}

async function parseMaterial(scene: SceneContext, rootUrl: string, data: any, options?: IParseMaterialOptions): Promise<Material | null> {
	switch (data.customType) {
		case "BABYLON.PBRMaterial":
		case "BABYLON.PBRMetallicRoughnessMaterial":
		case "BABYLON.PBRSpecularGlossinessMaterial": {
			const result = parsePbrMaterial(scene, rootUrl, data);
			await result.promise;
			return result.material;
		}

		case undefined:
		case null:
		case "BABYLON.StandardMaterial": {
			const result = parseStandardMaterial(scene, rootUrl, data, options?.sceneAmbientColor ?? [0, 0, 0]);
			await result.promise;
			return result.material;
		}

		case "BABYLON.NodeMaterial":
			try {
				return await parseNodeMaterial(scene, rootUrl, data, {
					shadowGenerators: options?.shadowGenerators,
					shadowLightIndices: options?.shadowLightIndices,
				});
			} catch (e) {
				console.error(`Failed to parse node material "${data.name}".`, e);
				return null;
			}

		case "BABYLON.SkyMaterial": {
			const material = parseSkyMaterial(scene, data);
			skyMaterials.set(material, data);
			return material;
		}

		default:
			console.warn(`Babylon.js Editor Tools Lite: material "${data.name}" of type "${data.customType}" is not supported by Babylon Lite.`);
			return null;
	}
}

/**
 * Loads the file located at `rootUrl + relativePath` and creates a new material from it.
 * @param rootUrl defines the absolute root url for the assets. (generally "/scene/")
 * @param relativePath defines the path relative to `rootUrl` for the material file
 * @param scene defines the reference to the scene where to use the loaded material.
 * @returns the reference to the created material.
 * @example await loadMaterialFromFile<PbrMaterialProps>("/scene/", "assets/floor.material", scene);
 */
export async function loadMaterialFromFile<T extends Material>(rootUrl: string, relativePath: string, scene: SceneContext): Promise<T> {
	const data = await loadJsonFile<any>(rootUrl + relativePath);

	const material = await parseSerializedMaterial(scene, rootUrl, data);
	if (!material) {
		throw new Error(`Failed to load material "${relativePath}": material of type "${data.customType}" is not supported.`);
	}

	(material as any).id = data.id;
	(material as any).uniqueId = data.uniqueId;

	return material as T;
}

/**
 * Force compile all materials of the given scene.
 * Babylon Lite builds the pipelines of all the materials of a scene when the scene is registered (`registerScene`),
 * which `loadScene` does: there is nothing left to compile once the scene is loaded. This function is kept for
 * compatibility with the Babylon.js version of the tools and resolves immediately.
 * @param scene The scene to force compile all materials
 */
export function forceCompileAllSceneMaterials(scene: SceneContext): Promise<void[]> {
	void scene;
	return Promise.resolve([]);
}
