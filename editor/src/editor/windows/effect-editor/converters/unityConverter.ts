/**
 * Unity Prefab → Babylon.js Effect Converter
 *
 * Converts Unity particle system prefabs directly to our Babylon.js effect format,
 * bypassing the Quarks JSON intermediate step.
 *
 * Based on extracted Unity → Quarks converter logic, but outputs IData format.
 */

import { Scene } from "@babylonjs/core/scene";
import type { IData, IEmitter, IGroup, IMaterial, ITexture, IImage, IGeometry } from "babylonjs-editor-tools/src/effect/types";
import { findRootGameObject } from "./unity/utils";
import { convertGameObject, convertToIDataFormat } from "./unity/gameObjectConverter";
import { convertUnityModel, convertUnityMaterial } from "./unity/resourceConverter";

/**
 * Convert Unity prefab components to IData
 *
 * @param components - Already parsed Unity components Map (parsed in modal)
 * @param dependencies - Optional dependencies (textures, materials, models, sounds)
 * @param scene - Babylon.js Scene for loading models (required for model parsing)
 * @returns IData structure ready for our Effect system
 */
export async function convertUnityPrefabToData(
	components: Map<string, any>,
	dependencies?: {
		textures?: Map<string, Buffer>;
		materials?: Map<string, string>;
		models?: Map<string, Buffer>;
		sounds?: Map<string, Buffer>;
		meta?: Map<string, any>;
	},
	scene?: Scene
): Promise<IData> {
	// Validate components is a Map
	if (!(components instanceof Map)) {
		console.error("convertUnityPrefabToData: components must be a Map, got:", typeof components, components);
		throw new Error("components must be a Map<string, any>");
	}

	let root: IGroup | IEmitter | null = null;

	// Find root GameObject
	const rootGameObjectId = findRootGameObject(components);
	if (!rootGameObjectId) {
		console.warn("No root GameObject found in Unity prefab");
		return {
			root: null,
			materials: [],
			textures: [],
			images: [],
			geometries: [],
		};
	}

	const rootComponent = components.get(rootGameObjectId);
	if (!rootComponent) {
		return {
			root: null,
			materials: [],
			textures: [],
			images: [],
			geometries: [],
		};
	}

	// Get GameObject from component (could be rootComponent.GameObject or rootComponent itself)
	const gameObject = rootComponent.GameObject || rootComponent;
	if (!gameObject || (typeof gameObject === "object" && !gameObject.m_Name && !gameObject.m_Component)) {
		// Try to find GameObject component directly
		for (const [_id, comp] of components) {
			if (comp.GameObject && comp.GameObject.m_Name) {
				const foundGameObject = comp.GameObject;
				if (foundGameObject.m_Component) {
					const converted = convertGameObject(foundGameObject, components);
					root = convertToIDataFormat(converted);
					break;
				}
			}
		}

		if (!root) {
			return {
				root: null,
				materials: [],
				textures: [],
				images: [],
				geometries: [],
			};
		}
	} else {
		// Convert root GameObject and its hierarchy recursively
		const converted = convertGameObject(gameObject, components);
		root = convertToIDataFormat(converted);
	}

	// Process dependencies if provided
	const materials: IMaterial[] = [];
	const textures: ITexture[] = [];
	const images: IImage[] = [];
	const geometries: IGeometry[] = [];

	if (dependencies) {
		// Convert materials from YAML to IData format
		if (dependencies.materials) {
			for (const [guid, yamlContent] of dependencies.materials) {
				try {
					const material = convertUnityMaterial(guid, yamlContent, dependencies);
					if (material) {
						materials.push(material);
					}
				} catch (error) {
					console.warn(`Failed to convert material ${guid}:`, error);
				}
			}
		}

		// Convert textures to IData format
		if (dependencies.textures) {
			for (const [guid, buffer] of dependencies.textures) {
				// Create image entry for texture
				const imageId = `image-${guid}`;
				images.push({
					uuid: imageId,
					url: `data:image/png;base64,${buffer.toString("base64")}`, // Convert buffer to data URL
				});

				// Create texture entry
				textures.push({
					uuid: guid,
					image: imageId,
					wrapU: 0, // Repeat
					wrapV: 0, // Repeat
					generateMipmaps: true,
					flipY: false,
				});
			}
		}

		// Convert models to IData format (for mesh particles)
		// Parse models using Babylon.js loaders if Scene is provided
		if (dependencies.models && scene) {
			for (const [guid, buffer] of dependencies.models) {
				// Determine file extension from meta
				const meta = dependencies.meta?.get(guid);
				const path = meta?.path || "";
				const ext = path.split(".").pop()?.toLowerCase() || "fbx";

				try {
					const geometry = await convertUnityModel(guid, buffer, ext, scene);
					if (geometry) {
						geometries.push(geometry);
					} else {
						// Fallback: store placeholder if parsing failed
						geometries.push({
							uuid: guid,
							type: "BufferGeometry",
						});
					}
				} catch (error) {
					console.warn(`Failed to parse model ${guid}:`, error);
					// Fallback: store placeholder
					geometries.push({
						uuid: guid,
						type: "BufferGeometry",
					});
				}
			}
		} else if (dependencies.models) {
			// If no Scene provided, store placeholders (models will be loaded later)
			for (const [guid] of dependencies.models) {
				geometries.push({
					uuid: guid,
					type: "BufferGeometry",
				});
			}
		}
	}

	return {
		root,
		materials,
		textures,
		images,
		geometries,
	};
}
