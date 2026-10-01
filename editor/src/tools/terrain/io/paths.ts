import { dirname, join, normalize } from "path/posix";

import { assetsCache } from "../../assets/cache";
import { projectConfiguration } from "../../../project/configuration";

/** Name of the folder of a scene (".scene") containing its terrain data: the weight maps painted on its terrains. */
export const TERRAIN_DATA_FOLDER_NAME = "terrainData";
/** Prefix of the name of a weight map file (getTerrainWeightMapFileName). */
export const TERRAIN_WEIGHT_MAP_FILE_PREFIX = "weights_";

/** Maximum length of a weight map file key (sanitizeTerrainFileKey). */
export const TERRAIN_FILE_KEY_MAX_LENGTH = 64;
/** Maximum number of renames followed by resolveRenamedAssetPath. */
export const TERRAIN_RENAME_MAX_HOPS = 16;

/**
 * Returns the given path with "/" separators only.
 * @param path defines the path to normalize.
 */
export function toTerrainSlashPath(path: string): string {
	return path.replace(/\\/g, "/");
}

/**
 * Returns whether or not the given path ("/" separators) is absolute: posix root ("/...") or Windows drive ("C:/...").
 * @param path defines the path to test.
 */
export function isTerrainAbsolutePath(path: string): boolean {
	return path.startsWith("/") || /^[A-Za-z]:\//.test(path);
}

/**
 * Returns the absolute path ("/" separators) of a file given by an absolute path or by a path relative to the project directory
 * (MCP tools accept both). Relative paths are returned unchanged when no project is opened.
 * @param path defines the absolute or project-relative path.
 */
export function toTerrainAbsolutePath(path: string): string {
	const slashPath = toTerrainSlashPath(path);
	if (isTerrainAbsolutePath(slashPath)) {
		return slashPath;
	}

	const projectDirectory = getProjectDirectory();
	return projectDirectory ? join(projectDirectory, slashPath) : slashPath;
}

/**
 * Returns the directory of the opened project (dirname of projectConfiguration.path), "/" separators; null when no project is opened.
 */
export function getProjectDirectory(): string | null {
	const projectPath = projectConfiguration.path;
	if (!projectPath) {
		return null;
	}

	return dirname(toTerrainSlashPath(projectPath));
}

/**
 * Returns the path relative to the project directory ("assets/..."), "/" separators; null when the path is outside the project
 * (or is the project directory itself) or when no project is opened. A relative input is resolved against the project directory.
 * @param absolutePath defines the absolute path of a file of the project.
 */
export function toProjectRelativePath(absolutePath: string): string | null {
	const projectDirectory = getProjectDirectory();
	return projectDirectory ? toTerrainRelativePath(projectDirectory, absolutePath) : null;
}

/**
 * Returns the path relative to the given directory, "/" separators; null when the path is outside the directory (or is the directory
 * itself). A relative input is resolved against the directory. Case-insensitive on Windows.
 * @param directory defines the absolute path of the directory.
 * @param absolutePath defines the absolute path of a file inside the directory.
 */
export function toTerrainRelativePath(directory: string, absolutePath: string): string | null {
	if (!directory || !absolutePath) {
		return null;
	}

	const base = trimTrailingSlashes(normalize(toTerrainSlashPath(directory)));

	let path = toTerrainSlashPath(absolutePath);
	if (!isTerrainAbsolutePath(path)) {
		path = join(base, path);
	}

	path = trimTrailingSlashes(normalize(path));

	const prefix = `${base}/`;
	const inside = process.platform === "win32" ? path.toLowerCase().startsWith(prefix.toLowerCase()) : path.startsWith(prefix);
	if (!inside) {
		return null;
	}

	const relativePath = path.substring(prefix.length);
	if (!relativePath || relativePath === ".." || relativePath.startsWith("../")) {
		return null;
	}

	return relativePath;
}

/**
 * Returns the project-relative folder of the terrain data of a scene (the weight maps painted on its terrains): "<scene>/terrainData",
 * e.g. "assets/scenes/main.scene/terrainData". Terrain data is per scene: a duplicated scene gets its own copy.
 * @param sceneRelativePath defines the project-relative path of the scene ("assets/scenes/main.scene").
 */
export function getTerrainDataFolder(sceneRelativePath: string): string {
	const scenePath = trimTrailingSlashes(toTerrainSlashPath(sceneRelativePath)).replace(/^(\.\/)+/, "");
	return `${scenePath}/${TERRAIN_DATA_FOLDER_NAME}`;
}

/**
 * Returns the name of the file of a weight map: `weights_${sanitizeTerrainFileKey(fileKey)}_${index}.png`.
 * @param fileKey defines the file key of the terrain material: its id.
 * @param index defines the index of the weight map (0: layers 1-4, 1: layers 5-8).
 */
export function getTerrainWeightMapFileName(fileKey: string, index: 0 | 1): string {
	return `${TERRAIN_WEIGHT_MAP_FILE_PREFIX}${sanitizeTerrainFileKey(fileKey)}_${index}.png`;
}

/**
 * Returns the file key made of the given value: [A-Za-z0-9_-] kept, every other character → "_", truncated to 64 characters.
 * @param value defines the value to sanitize (typically a material id).
 */
export function sanitizeTerrainFileKey(value: string): string {
	return String(value ?? "")
		.replace(/[^A-Za-z0-9_-]/gu, "_")
		.substring(0, TERRAIN_FILE_KEY_MAX_LENGTH);
}

/**
 * Follows the assetsCache[old].newRelativePath chains of the assets renamed or moved since the last save (at most 16 hops) and returns
 * the current project-relative path of the asset; returns the input when it was not renamed. When a chain comes back to a path it
 * already visited (a file renamed then renamed back), it stops on that path, which is where the last rename put the file.
 * Folder renames record every file below them (weight files included), so paths below a renamed folder resolve too.
 * @param relativePath defines the project-relative path to resolve.
 */
export function resolveRenamedAssetPath(relativePath: string): string {
	if (!relativePath) {
		return relativePath;
	}

	let current = relativePath;
	if (!getRenamedAssetPath(current)) {
		const slashPath = toTerrainSlashPath(relativePath);
		if (slashPath === relativePath || !getRenamedAssetPath(slashPath)) {
			return relativePath;
		}

		current = slashPath;
	}

	const visited = new Set<string>([current]);
	for (let hop = 0; hop < TERRAIN_RENAME_MAX_HOPS; ++hop) {
		const next = getRenamedAssetPath(current);
		if (!next) {
			break;
		}

		current = next;
		if (visited.has(next)) {
			break;
		}

		visited.add(next);
	}

	return current;
}

function getRenamedAssetPath(relativePath: string): string | null {
	if (!Object.prototype.hasOwnProperty.call(assetsCache, relativePath)) {
		return null;
	}

	const newRelativePath = assetsCache[relativePath]?.newRelativePath;
	return typeof newRelativePath === "string" && newRelativePath ? newRelativePath : null;
}

function trimTrailingSlashes(path: string): string {
	let end = path.length;
	while (end > 1 && path.charCodeAt(end - 1) === 47 /* "/" */) {
		--end;
	}

	return path.substring(0, end);
}
