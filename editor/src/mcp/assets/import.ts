import { basename, dirname, extname, isAbsolute, join, normalize, relative } from "path/posix";
import { copyFile, ensureDir, pathExists, readJSON, stat } from "fs-extra";

import { Scene } from "babylonjs";

import { findAvailableFilename } from "../../tools/fs";
import { reloadAsset } from "../../tools/assets/reload";
import { assetsAllSupportedExtensions, assetsImageExtensions } from "../../tools/assets/extensions";

import { projectConfiguration } from "../../project/configuration";

import { IMCPActionOptions } from "../action";

/**
 * Defines the extensions of the files "import_asset" copies: assets only. The AI assistant may use the tool without
 * asking, so it must never become a way to copy any file of the computer into the project, where it is read freely.
 */
export const importableAssetExtensions = [
	...assetsAllSupportedExtensions,
	".gif",
	".hdr",
	".env",
	".dds",
	".ktx",
	".ktx2",
	".npss",
	".material",
	".gui",
	".ply",
	".splat",
	".spz",
	".sog",
];

/**
 * Defines the extensions of the external resources of a .gltf file copied with it.
 */
const gltfResourceExtensions = [".bin", ...assetsImageExtensions, ".ktx", ".ktx2", ".dds"];

function getProjectDirectory(): string {
	if (!projectConfiguration.path) {
		throw new Error("No project is currently open.");
	}

	return dirname(projectConfiguration.path.replace(/\\/g, "/"));
}

function toPosixPath(path: string): string {
	return path.replace(/\\/g, "/");
}

/**
 * Returns wether or not the given path is the given directory or is located inside of it.
 */
function isInsideDirectory(path: string, directory: string): boolean {
	const relativePath = relative(directory, path);
	return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

/**
 * Returns the paths, relative to the .gltf file, of the external buffers and images it references.
 */
async function getGltfResources(absolutePath: string): Promise<string[]> {
	try {
		const gltf = await readJSON(absolutePath);
		const uris = [...(gltf.buffers ?? []), ...(gltf.images ?? [])].map((resource: any) => resource?.uri).filter((uri: unknown) => typeof uri === "string") as string[];

		return uris.filter((uri) => !uri.startsWith("data:") && !/^[a-z]+:\/\//i.test(uri)).map((uri) => decodeURIComponent(uri));
	} catch (e) {
		return [];
	}
}

/**
 * Copies a file from anywhere on disk into the assets of the project: a file downloaded or generated outside of the
 * project, typically. The external buffers and images of a .gltf file are copied with it, in a folder of its own.
 */
export async function importAsset(_scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const projectDirectory = getProjectDirectory();
	const assetsDirectory = join(projectDirectory, "assets");

	if (typeof data.sourcePath !== "string" || !data.sourcePath) {
		throw new Error("The absolute path of the file to import is required in `sourcePath`.");
	}

	const sourcePath = toPosixPath(isAbsolute(data.sourcePath) ? data.sourcePath : join(projectDirectory, data.sourcePath));
	if (!(await pathExists(sourcePath)) || !(await stat(sourcePath)).isFile()) {
		throw new Error(`No file found at ${data.sourcePath}. Only files can be imported.`);
	}

	const folder = toPosixPath(data.folder ?? "")
		.replace(/^\/+/, "")
		.replace(/^assets(\/|$)/, "");
	let destinationDirectory = normalize(join(assetsDirectory, folder));
	if (!isInsideDirectory(destinationDirectory, assetsDirectory)) {
		throw new Error("The destination `folder` must be located in the assets folder of the project.");
	}

	const sourceExtension = extname(sourcePath);
	const name = typeof data.name === "string" && data.name ? data.name : basename(sourcePath);
	if (name.includes("/") || name.includes("\\")) {
		throw new Error("`name` must be a file name, use `folder` to choose where the file is copied.");
	}

	const extension = extname(name) || sourceExtension;
	const baseName = basename(name, extname(name));

	if (!importableAssetExtensions.includes(sourceExtension.toLowerCase()) || !importableAssetExtensions.includes(extension.toLowerCase())) {
		throw new Error(`Only assets can be imported: ${importableAssetExtensions.join(", ")}.`);
	}

	const resources = extension.toLowerCase() === ".gltf" ? await getGltfResources(sourcePath) : [];
	if (resources.length) {
		// The resources keep their names, so they get a folder of their own where they can't replace other assets.
		destinationDirectory = join(destinationDirectory, data.overwrite ? baseName : await findAvailableFilename(destinationDirectory, baseName, ""));
	}

	await ensureDir(destinationDirectory);

	const fileName = data.overwrite ? `${baseName}${extension}` : await findAvailableFilename(destinationDirectory, baseName, extension);
	const destinationPath = join(destinationDirectory, fileName);

	if (destinationPath !== sourcePath) {
		await copyFile(sourcePath, destinationPath);
	}

	const copiedResources: string[] = [];
	for (const resource of resources) {
		const resourceSource = normalize(join(dirname(sourcePath), resource));
		const resourceDestination = normalize(join(destinationDirectory, resource));

		if (
			!gltfResourceExtensions.includes(extname(resource).toLowerCase()) ||
			!isInsideDirectory(resourceSource, dirname(sourcePath)) ||
			!isInsideDirectory(resourceDestination, destinationDirectory)
		) {
			continue;
		}

		if (resourceSource !== resourceDestination && (await pathExists(resourceSource))) {
			await ensureDir(dirname(resourceDestination));
			await copyFile(resourceSource, resourceDestination);
			copiedResources.push(relative(projectDirectory, resourceDestination));
		}
	}

	options.editor.layout.assets.refresh();

	// Replacing an asset used in the scene updates the elements created from it.
	const reloaded = data.overwrite ? (await reloadAsset(options.editor, destinationPath)).reloaded : 0;

	return {
		path: relative(projectDirectory, destinationPath),
		absolutePath: destinationPath,
		resources: copiedResources,
		reloaded,
	};
}

/**
 * Reloads, in the scene, the elements created from an asset of the project after it was modified on disk.
 */
export async function reloadAssetEndpoint(_scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const projectDirectory = getProjectDirectory();

	if (typeof data.path !== "string" || !data.path) {
		throw new Error("The path of the asset to reload is required in `path`.");
	}

	const absolutePath = toPosixPath(isAbsolute(data.path) ? data.path : join(projectDirectory, data.path));
	if (!(await pathExists(absolutePath))) {
		throw new Error(`No asset found at ${data.path}.`);
	}

	const result = await reloadAsset(options.editor, absolutePath);

	options.editor.layout.assets.refresh();

	if (!result.type) {
		return {
			...result,
			message: `The scene never uses the content of ${extname(absolutePath)} assets directly: nothing to reload.`,
		};
	}

	return result;
}
