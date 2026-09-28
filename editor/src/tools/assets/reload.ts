import { dirname, extname, join } from "path/posix";
import { readFile, readJSON } from "fs-extra";

import { AbstractMesh, BaseTexture, InstancedMesh, Material, Mesh, Node, Scene, Skeleton, Texture, TransformNode } from "babylonjs";

import { Editor } from "../../editor/main";
import { loadImportedSceneFile } from "../../editor/layout/preview/import/import";
import { reloadGuiTexture } from "../../editor/layout/assets-browser/events/gui";
import { reloadSceneLinks } from "../../editor/layout/assets-browser/events/scene";
import { reloadNodeMaterial } from "../../editor/layout/assets-browser/events/material";
import { reloadNodeParticleSystemSets } from "../../editor/layout/assets-browser/events/particles";

import { getProjectAssetsRootUrl, projectConfiguration } from "../../project/configuration";

import { isTexture } from "../guards/texture";
import { isBone, isMesh } from "../guards/nodes";
import { isMultiMaterial, isNodeMaterial } from "../guards/material";

/**
 * Defines the key, in the metadata of the root node of an imported mesh asset, that holds the project-relative path
 * of the asset it was imported from. Only the meshes imported by the MCP tools are linked to their asset: they are
 * imported again when the asset changes.
 */
export const sourceAssetMetadataKey = "editorSourceAsset";

export type ReloadableAssetType = "texture" | "particle-system" | "material" | "gui" | "scene" | "mesh";

export interface IReloadAssetResult {
	/**
	 * Defines the path of the asset, relative to the project.
	 */
	path: string;
	/**
	 * Defines the type of the asset, or null for assets that are never reloaded in the scene.
	 */
	type: ReloadableAssetType | null;
	/**
	 * Defines the number of elements of the scene that were reloaded from the asset.
	 */
	reloaded: number;
}

/**
 * Returns the type of the elements of the scene that can be reloaded from the given asset, or null when the scene
 * never uses the content of such an asset directly.
 * @param path defines the path of the asset.
 */
export function getReloadableAssetType(path: string): ReloadableAssetType | null {
	switch (extname(path).toLowerCase()) {
		case ".png":
		case ".jpg":
		case ".jpeg":
		case ".bmp":
		case ".webp":
		case ".tga":
			return "texture";
		case ".npss":
			return "particle-system";
		case ".material":
			return "material";
		case ".gui":
			return "gui";
		case ".scene":
			return "scene";
		case ".glb":
		case ".gltf":
		case ".babylon":
		case ".obj":
		case ".stl":
		case ".fbx":
			return "mesh";
		default:
			return null;
	}
}

/**
 * Returns the path of the given asset relative to the project, with forward slashes.
 * @param absolutePath defines the absolute path of the asset.
 */
export function getProjectRelativePath(absolutePath: string): string {
	const normalizedPath = absolutePath.replace(/\\/g, "/");
	if (!projectConfiguration.path) {
		return normalizedPath;
	}

	const projectDirectory = join(dirname(projectConfiguration.path.replace(/\\/g, "/")), "/");

	return normalizedPath.startsWith(projectDirectory) ? normalizedPath.substring(projectDirectory.length) : normalizedPath;
}

/**
 * Reloads, in the scene of the editor, every element created from the given asset after the asset changed on disk:
 * textures, node particle system sets, materials, GUI, linked scenes and meshes imported by the MCP tools.
 * @param editor defines the reference to the editor.
 * @param absolutePath defines the absolute path of the asset that changed.
 */
export async function reloadAsset(editor: Editor, absolutePath: string): Promise<IReloadAssetResult> {
	absolutePath = absolutePath.replace(/\\/g, "/");

	const path = getProjectRelativePath(absolutePath);
	const type = getReloadableAssetType(absolutePath);

	let reloaded = 0;

	switch (type) {
		case "texture":
			reloaded = await reloadTextures(editor.layout.preview.scene, path, absolutePath);
			break;

		case "particle-system":
			reloaded = await reloadNodeParticleSystemSets(editor, await readJSON(absolutePath));
			break;

		case "material":
			reloaded = reloadMaterial(editor, await readJSON(absolutePath));
			break;

		case "gui":
			reloaded = reloadGuiTexture(editor, await readJSON(absolutePath));
			break;

		case "scene":
			reloaded = await reloadSceneLinks(editor, absolutePath);
			break;

		case "mesh":
			reloaded = await reloadMeshes(editor, path, absolutePath);
			break;
	}

	if (reloaded) {
		editor.layout.inspector.forceUpdate();
	}

	return { path, type, reloaded };
}

function normalizeTextureUrl(url: string): string {
	return url.replace(/\\/g, "/").split("?")[0];
}

function isTextureUsingAsset(texture: BaseTexture, relativePath: string, absolutePath: string): texture is Texture {
	if (!isTexture(texture) || !texture.url || texture.url.startsWith("data:")) {
		return false;
	}

	return [texture.name, texture.url].some((url) => {
		const normalizedUrl = normalizeTextureUrl(url ?? "");
		return normalizedUrl === relativePath || normalizedUrl === absolutePath;
	});
}

/**
 * Loads again the image of every texture of the scene created from the given image asset.
 */
async function reloadTextures(scene: Scene, relativePath: string, absolutePath: string): Promise<number> {
	const textures = scene.textures.filter((texture) => isTextureUsingAsset(texture, relativePath, absolutePath)) as Texture[];
	if (!textures.length) {
		return 0;
	}

	// The image is read here rather than loaded from its URL: the browser would serve its cached copy of the file. The
	// engine only uses the given data for "data:" URLs, loading from the URL otherwise.
	const data = await readFile(absolutePath);
	const buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

	// Textures loaded from the same URL share their internal texture through the cache of the engine. Without removing
	// it, the first texture updated would get the old image back from the cache.
	const cache = scene.getEngine().getLoadedTexturesCache();
	textures.forEach((texture) => {
		const internalTexture = texture.getInternalTexture();
		const index = internalTexture ? cache.indexOf(internalTexture) : -1;
		if (index !== -1) {
			cache.splice(index, 1);
		}
	});

	textures.forEach((texture) => {
		texture.updateURL(`data:${relativePath}`, buffer, () => {
			texture._buffer = null;
		});

		// Same as when the project is loaded: the URL of the texture is relative to the project.
		texture.url = relativePath;
	});

	return textures.length;
}

/**
 * Updates the material of the scene created from the given material asset, matched by its unique id.
 */
function reloadMaterial(editor: Editor, data: any): number {
	const scene = editor.layout.preview.scene;

	const material = scene.getMaterialByUniqueId(data.uniqueId);
	if (!material) {
		return 0;
	}

	if (isNodeMaterial(material)) {
		reloadNodeMaterial(material, data);
		return 1;
	}

	const newMaterial = Material.Parse(data, scene, getProjectAssetsRootUrl() ?? "");
	if (!newMaterial) {
		return 0;
	}

	newMaterial.id = material.id;

	scene.meshes.forEach((mesh) => {
		if (mesh.material === material) {
			mesh.material = newMaterial;
		}
	});

	scene.multiMaterials.forEach((multiMaterial) => {
		multiMaterial.subMaterials = multiMaterial.subMaterials.map((subMaterial) => (subMaterial === material ? newMaterial : subMaterial));
	});

	const textures = material.getActiveTextures();
	const uniqueId = material.uniqueId;

	material.dispose(false, false);
	newMaterial.uniqueId = uniqueId;

	disposeUnusedTextures(scene, textures);

	if (editor.layout.inspector.state.editedObject === material) {
		editor.layout.inspector.setEditedObject(newMaterial);
	}

	return 1;
}

/**
 * Imports again, in place, every hierarchy of the scene imported by the MCP tools from the given mesh asset.
 */
async function reloadMeshes(editor: Editor, relativePath: string, absolutePath: string): Promise<number> {
	const scene = editor.layout.preview.scene;
	const roots = [...scene.meshes, ...scene.transformNodes].filter((node) => node.metadata?.[sourceAssetMetadataKey] === relativePath);

	let reloaded = 0;

	for (const root of roots) {
		if (root.isDisposed()) {
			continue;
		}

		const result = await loadImportedSceneFile(scene, absolutePath, editor);
		if (!result) {
			continue;
		}

		const importedNodes: Node[] = [...result.meshes, ...result.transformNodes, ...result.lights];
		const importedRoots = importedNodes.filter((node) => !node.parent);

		if (importedRoots.length !== 1) {
			// The asset no longer has a single root, so the imported copy can't take the place of the old one.
			importedRoots.forEach((node) => node.dispose(false, true));
			result.animationGroups.forEach((animationGroup) => animationGroup.dispose());
			result.skeletons.forEach((skeleton) => skeleton.dispose());
			continue;
		}

		replaceHierarchy(editor, root, importedRoots[0] as TransformNode);
		++reloaded;
	}

	if (reloaded) {
		await editor.layout.graph.refresh();
	}

	return reloaded;
}

/**
 * Puts the given newly imported hierarchy in place of the given one: same parent, transform, id and metadata (which
 * holds the attached scripts), and the instances of its meshes placed elsewhere in the scene are recreated from the
 * new meshes of the same name. The old hierarchy is disposed with the materials, textures, skeletons and animation
 * groups only it used.
 */
function replaceHierarchy(editor: Editor, oldRoot: TransformNode, newRoot: TransformNode): void {
	const scene = editor.layout.preview.scene;

	newRoot.parent = oldRoot.parent;
	newRoot.position.copyFrom(oldRoot.position);
	newRoot.rotation.copyFrom(oldRoot.rotation);
	newRoot.rotationQuaternion = oldRoot.rotationQuaternion?.clone() ?? null;
	newRoot.scaling.copyFrom(oldRoot.scaling);
	newRoot.name = oldRoot.name;
	newRoot.metadata = oldRoot.metadata;
	newRoot.setEnabled(oldRoot.isEnabled(false));

	const oldNodes: Node[] = [oldRoot, ...oldRoot.getDescendants(false)];
	const oldMeshes = oldNodes.filter((node) => isMesh(node)) as Mesh[];
	const newMeshes = [newRoot, ...newRoot.getDescendants(false)].filter((node) => isMesh(node)) as Mesh[];

	// Disposing a mesh disposes its instances: the ones placed outside of the hierarchy are recreated.
	const recreatedInstances: { instance: InstancedMesh; uniqueId: number }[] = [];
	oldMeshes.forEach((oldMesh) => {
		const newMesh = newMeshes.find((mesh) => mesh.name === oldMesh.name);
		if (!newMesh) {
			return;
		}

		oldMesh.instances.forEach((oldInstance) => {
			if (oldNodes.includes(oldInstance)) {
				return;
			}

			const instance = newMesh.createInstance(oldInstance.name);
			instance.id = oldInstance.id;
			instance.parent = oldInstance.parent;
			instance.position.copyFrom(oldInstance.position);
			instance.rotation.copyFrom(oldInstance.rotation);
			instance.rotationQuaternion = oldInstance.rotationQuaternion?.clone() ?? null;
			instance.scaling.copyFrom(oldInstance.scaling);
			instance.metadata = oldInstance.metadata;
			instance.isVisible = oldInstance.isVisible;
			instance.setEnabled(oldInstance.isEnabled(false));

			recreatedInstances.push({ instance, uniqueId: oldInstance.uniqueId });
		});
	});

	const oldMaterials = new Set<Material>();
	oldMeshes.forEach((mesh) => {
		if (!mesh.material) {
			return;
		}

		oldMaterials.add(mesh.material);
		if (isMultiMaterial(mesh.material)) {
			mesh.material.subMaterials.forEach((subMaterial) => subMaterial && oldMaterials.add(subMaterial));
		}
	});

	const oldTextures = new Set<BaseTexture>();
	oldMaterials.forEach((material) => material.getActiveTextures().forEach((texture) => oldTextures.add(texture)));

	const oldSkeletons = new Set<Skeleton>(oldMeshes.map((mesh) => mesh.skeleton).filter((skeleton) => skeleton) as Skeleton[]);
	const oldAnimationGroups = scene.animationGroups.filter((animationGroup) => {
		return (
			animationGroup.targetedAnimations.length > 0 &&
			animationGroup.targetedAnimations.every(({ target }) => oldNodes.includes(target) || (isBone(target) && oldSkeletons.has(target.getSkeleton())))
		);
	});

	const editedObjectWasReplaced = oldNodes.includes(editor.layout.inspector.state.editedObject as Node);

	const id = oldRoot.id;
	const uniqueId = oldRoot.uniqueId;

	oldRoot.dispose(false, false);

	newRoot.id = id;
	newRoot.uniqueId = uniqueId;
	recreatedInstances.forEach(({ instance, uniqueId }) => (instance.uniqueId = uniqueId));

	oldAnimationGroups.forEach((animationGroup) => animationGroup.dispose());

	oldSkeletons.forEach((skeleton) => {
		if (!scene.meshes.some((mesh) => mesh.skeleton === skeleton)) {
			skeleton.dispose();
		}
	});

	oldMaterials.forEach((material) => {
		if (!isMaterialUsed(scene, material)) {
			material.dispose(false, false);
		}
	});

	disposeUnusedTextures(scene, [...oldTextures]);

	if (editedObjectWasReplaced) {
		editor.layout.inspector.setEditedObject(newRoot);
		editor.layout.preview.gizmo.setAttachedObject(newRoot);
	}
}

function isMaterialUsed(scene: Scene, material: Material): boolean {
	return (
		scene.meshes.some((mesh: AbstractMesh) => mesh.material === material) ||
		scene.multiMaterials.some((multiMaterial) => multiMaterial.subMaterials.includes(material) && isMaterialUsed(scene, multiMaterial))
	);
}

function disposeUnusedTextures(scene: Scene, textures: BaseTexture[]): void {
	textures.forEach((texture) => {
		const used = scene.materials.some((material) => material.hasTexture(texture)) || scene.environmentTexture === texture;
		if (!used) {
			texture.dispose();
		}
	});
}
