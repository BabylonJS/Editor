import { BaseTexture, Material, Mesh, Scene } from "babylonjs";

import { isTexture } from "../../../../../tools/guards/texture";
import { isMultiMaterial } from "../../../../../tools/guards/material";
import { configureSimultaneousLightsForMaterial } from "../../../../../tools/material/material";

import { configureEmbeddedTexture, configureImportedMaterial, configureImportedTexture } from "../../../preview/import/import";

import { UpdateResourcesContext } from "./context";

/**
 * Replaces the material of the given mesh of the scene by the material of the given mesh of the asset. The material of the
 * asset is moved to the scene and configured as when importing the asset (see adoptMaterial), once for all the meshes using it.
 * The previous material is disposed at the end of the update if no mesh uses it anymore (see disposeReplacedMaterials).
 * @param context defines the context of the update.
 * @param sceneMesh defines the reference to the mesh of the scene to update.
 * @param assetMesh defines the reference to the mesh of the asset to take the material from.
 */
export function updateMeshMaterial(context: UpdateResourcesContext, sceneMesh: Mesh, assetMesh: Mesh): void {
	if (!assetMesh.material) {
		return;
	}

	const material = adoptMaterial(context, assetMesh.material);
	if (sceneMesh.material === material) {
		return;
	}

	if (sceneMesh.material) {
		context.replacedMaterials.add(sceneMesh.material);
	}

	sceneMesh.material = material;
	++context.report.materials;
}

/**
 * Disposes the materials replaced by materials of the asset that are not used by any mesh of the scene anymore, with their
 * textures that are not used anymore either.
 * @param context defines the context of the update.
 */
export function disposeReplacedMaterials(context: UpdateResourcesContext): void {
	const scene = context.scene;

	context.replacedMaterials.forEach((material) => {
		if (context.adoptedMaterials.has(material) || isMaterialUsed(scene, material)) {
			return;
		}

		// The sub-materials of a multi-material are disposed with it, unless used elsewhere.
		const disposedMaterials = isMultiMaterial(material) ? [material, ...material.subMaterials.filter((subMaterial) => subMaterial !== null)] : [material];
		const textures = disposedMaterials.map((disposedMaterial) => disposedMaterial.getActiveTextures()).flat();

		disposedMaterials.forEach((disposedMaterial) => {
			if (disposedMaterial === material || !isMaterialUsed(scene, disposedMaterial)) {
				disposedMaterial.dispose(false, false);
			}
		});

		textures.forEach((texture) => {
			if (!isTextureUsed(scene, texture)) {
				texture.dispose();
			}
		});
	});
}

/**
 * Moves the given material of the asset (and its sub-materials and textures) to the scene, as when importing the asset: new
 * identifiers, number of simultaneous lights of the editor, texture paths relative to the project and embedded textures saved
 * as files next to the asset. Returns the material, now part of the scene.
 */
function adoptMaterial(context: UpdateResourcesContext, material: Material): Material {
	if (context.adoptedMaterials.has(material)) {
		return material;
	}

	context.adoptedMaterials.add(material);

	const container = context.analysis.container;

	if (isMultiMaterial(material)) {
		material.subMaterials.forEach((subMaterial) => {
			if (subMaterial) {
				adoptMaterial(context, subMaterial);
			}
		});

		removeFromArray(container.multiMaterials, material);
		context.scene.addMultiMaterial(material);
	} else {
		removeFromArray(container.materials, material);
		context.scene.addMaterial(material);

		configureSimultaneousLightsForMaterial(material);
	}

	material._parentContainer = null;
	configureImportedMaterial(material);

	material.getActiveTextures().forEach((texture) => adoptTexture(context, texture));

	return material;
}

/**
 * Moves the given texture of the asset to the scene, as when importing the asset.
 */
function adoptTexture(context: UpdateResourcesContext, texture: BaseTexture): void {
	if (context.adoptedTextures.has(texture)) {
		return;
	}

	context.adoptedTextures.add(texture);

	removeFromArray(context.analysis.container.textures, texture);
	context.scene.addTexture(texture);
	texture._parentContainer = null;

	if (isTexture(texture)) {
		configureImportedTexture(texture);
		configureEmbeddedTexture(texture, context.analysis.filename).catch((e) => console.error(`Failed to save the embedded texture "${texture.name}"`, e));
	}
}

/**
 * Returns whether or not the given material is used by a mesh of the scene, directly or through a multi-material.
 */
function isMaterialUsed(scene: Scene, material: Material): boolean {
	return (
		scene.meshes.some((mesh) => mesh.material === material) ||
		scene.multiMaterials.some((multiMaterial) => multiMaterial !== material && multiMaterial.subMaterials.includes(material) && isMaterialUsed(scene, multiMaterial))
	);
}

/**
 * Returns whether or not the given texture is used by a material, a particle system or the environment of the scene.
 */
function isTextureUsed(scene: Scene, texture: BaseTexture): boolean {
	return (
		scene.environmentTexture === texture ||
		scene.materials.some((material) => material.hasTexture(texture)) ||
		scene.particleSystems.some((particleSystem) => (particleSystem as { particleTexture?: BaseTexture }).particleTexture === texture)
	);
}

/**
 * Removes the given value from the given array, if present.
 */
function removeFromArray<T>(array: T[], value: T): void {
	const index = array.indexOf(value);
	if (index !== -1) {
		array.splice(index, 1);
	}
}
