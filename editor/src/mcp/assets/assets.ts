import { dirname, join, isAbsolute, basename, relative, extname } from "path/posix";
import { pathExists, readFile, readdir } from "fs-extra";

import { Scene } from "babylonjs";

import { normalizedGlob } from "../../tools/fs";
import { loadImportedSceneFile } from "../../editor/layout/preview/import/import";

import { projectConfiguration } from "../../project/configuration";

import { IMCPActionOptions } from "../action";
import { resolveNode, toNodeSummary, toVector3 } from "../tools/resolve";

/**
 * Maps asset types to their associated file extensions (without dot).
 */
const ASSET_TYPE_EXTENSIONS: Record<string, string[]> = {
	texture: ["png", "jpg", "jpeg", "bmp", "webp"],
	"cube-texture": ["env", "hdr"],
	mesh: ["babylon", "glb", "gltf", "fbx", "obj", "stl"],
	sound: ["mp3", "ogg", "wav"],
	material: ["material"],
	particle: ["npss"],
	json: ["json"],
	navmesh: ["navmesh"],
};

/**
 * Returns the asset type associated to the given file extension.
 */
function getAssetTypeFromExtension(extension: string): string | null {
	const ext = extension.replace(".", "").toLowerCase();
	for (const type of Object.keys(ASSET_TYPE_EXTENSIONS)) {
		if (ASSET_TYPE_EXTENSIONS[type].includes(ext)) {
			return type;
		}
	}

	return null;
}

/**
 * Returns the absolute path of the project directory.
 */
function getProjectDirectory(): string {
	if (!projectConfiguration.path) {
		throw new Error("No project is currently open.");
	}

	return dirname(projectConfiguration.path);
}

/**
 * Resolves an absolute path from a project-relative or absolute path.
 */
function resolveProjectPath(path: string): string {
	return isAbsolute(path) ? path : join(getProjectDirectory(), path);
}

/**
 * Returns whether a folder contains an "editor_preview" image file.
 */
async function folderHasPreview(folder: string): Promise<boolean> {
	try {
		const files = await readdir(folder);
		return files.some((f) => f.startsWith("editor_preview") && (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".bmp")));
	} catch (e) {
		return false;
	}
}

/**
 * Lists the project assets, optionally filtered by type or folder.
 */
export async function listAssets(_scene: Scene, data: any): Promise<any> {
	const directory = getProjectDirectory();
	const baseFolder = data.folder ? resolveProjectPath(data.folder) : join(directory, "assets");

	const matches = await normalizedGlob(join(baseFolder, "/**/*"), {
		nodir: true,
		ignore: ["**/node_modules/**"],
	});

	const previewCache: Record<string, boolean> = {};

	const assets: any[] = [];
	for (const matchPath of matches) {
		const absolutePath = matchPath.toString();
		const type = getAssetTypeFromExtension(extname(absolutePath));

		if (!type) {
			continue;
		}

		if (data.type && data.type !== type) {
			continue;
		}

		const folder = dirname(absolutePath);
		if (previewCache[folder] === undefined) {
			previewCache[folder] = await folderHasPreview(folder);
		}

		assets.push({
			name: basename(absolutePath),
			path: relative(directory, absolutePath),
			type,
			hasPreview: previewCache[folder],
		});
	}

	return { assets };
}

/**
 * Returns the folder "editor_preview" image (or the asset itself if it is an image) as base64.
 */
export async function getAssetPreview(_scene: Scene, data: any): Promise<any> {
	const absolutePath = resolveProjectPath(data.path);

	let previewPath: string | null = null;

	const extension = extname(absolutePath).replace(".", "").toLowerCase();
	if (["png", "jpg", "jpeg", "bmp"].includes(extension)) {
		previewPath = absolutePath;
	} else {
		const folder = (await pathExists(absolutePath)) && extname(absolutePath) === "" ? absolutePath : dirname(absolutePath);
		const files = await readdir(folder);
		const preview = files.find((f) => f.startsWith("editor_preview") && (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".bmp")));
		if (preview) {
			previewPath = join(folder, preview);
		}
	}

	if (!previewPath || !(await pathExists(previewPath))) {
		throw new Error(`No preview found for asset: ${data.path}`);
	}

	const buffer = await readFile(previewPath);
	const previewExtension = extname(previewPath).replace(".", "").toLowerCase();
	const mimeType = previewExtension === "png" ? "image/png" : previewExtension === "bmp" ? "image/bmp" : "image/jpeg";

	return {
		imageBase64: buffer.toString("base64"),
		mimeType,
	};
}

/**
 * Loads a mesh asset into the scene (drag'n'drop equivalent). glTF assets are auto-scaled (x100) by the import path.
 */
export async function instantiateMeshAsset(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const absolutePath = resolveProjectPath(data.path);

	const result = await loadImportedSceneFile(scene, absolutePath);
	if (!result) {
		throw new Error(`Failed to load mesh asset: ${data.path}`);
	}

	const root = result.meshes.find((m) => m.parent === null) ?? result.meshes[0];

	let parent: any = null;
	if (data.parentId || data.parentName) {
		parent = resolveNode({ scene, nodeId: data.parentId, nodeName: data.parentName });
	}

	if (root) {
		if (parent) {
			root.parent = parent;
		}

		if (data.name) {
			root.name = data.name;
		}

		if (data.position) {
			root.position.copyFrom(toVector3(data.position));
		}
	}

	options.editor.layout.graph.refresh().then(() => {
		if (root) {
			options.editor.layout.graph.setSelectedNode(root);
		}
	});

	if (root) {
		options.editor.layout.inspector.setEditedObject(root);
	}

	const createdNodes = [...result.meshes, ...result.transformNodes, ...result.lights];

	return {
		rootNodeId: root?.id ?? null,
		createdNodes: createdNodes.map((node) => toNodeSummary(node)),
	};
}
