import sharp from "sharp";
import { webUtils } from "electron";
import { basename, extname, join } from "path/posix";
import { copyFile, ensureDir, readFile, readdir, stat } from "fs-extra";

import {
	BrowserTerrainImageDecoder,
	TerrainMaterialPlugin,
	decodeTerrainLayerSourceBytes,
	type ITerrainDecodedImage,
	type ITerrainImageDecodeOptions,
	type ITerrainImageDecoder,
} from "babylonjs-editor-tools";

import { findAvailableFilename } from "../../fs";
import { onProjectConfigurationChangedObservable, projectConfiguration } from "../../../project/configuration";

import { getProjectDirectory, resolveRenamedAssetPath, toProjectRelativePath } from "./paths";

/** Extensions accepted as layer sources: .png .jpg .jpeg .webp .bmp */
export const TERRAIN_SOURCE_IMAGE_EXTENSIONS: readonly string[] = [".png", ".jpg", ".jpeg", ".webp", ".bmp"];

/** Extensions accepted as brush images: .png .jpg .jpeg .webp .bmp .tif .tiff */
export const TERRAIN_BRUSH_IMAGE_EXTENSIONS: readonly string[] = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"];

/** Project-relative folder receiving the layer sources dropped from outside the project's assets (§1.10). */
export const TERRAIN_SOURCE_IMPORT_FOLDER = "assets/terrain-textures";

/** Limits of expandTerrainDroppedPaths: files deeper than this below a dropped folder are ignored (its direct children are at depth 1). */
export const TERRAIN_DROP_MAX_DEPTH = 8;
/** Limits of expandTerrainDroppedPaths: at most this many paths are returned. */
export const TERRAIN_DROP_MAX_FILES = 512;

/** Size range of getTerrainImageThumbnail (px). */
export const TERRAIN_THUMBNAIL_MIN_SIZE = 64;
export const TERRAIN_THUMBNAIL_MAX_SIZE = 256;

type TerrainDecoderScene = Parameters<ITerrainImageDecoder["decode"]>[3];

interface ITerrainDropExpansion {
	result: string[];
	seen: Set<string>;
}

/** getTerrainImageThumbnail caches: key "path|mtimeMs|bytes|size" → URL promise / created URL (to revoke). */
const thumbnailPromises = new Map<string, Promise<string | null>>();
const thumbnailUrls = new Map<string, string>();

let thumbnailProjectObserved = false;
let thumbnailProjectPath: string | null = null;

/**
 * Files outside <project>/assets are copied into <project>/assets/terrain-textures/ (findAvailableFilename); returns project-relative paths.
 * Files under <project>/assets are referenced in place. Only layer source images are accepted (TERRAIN_SOURCE_IMAGE_EXTENSIONS); other
 * files are rejected with a reason. A file of the same name and the same content already in assets/terrain-textures/ is reused instead
 * of being copied again. Paths use "/" separators; a relative input path is resolved against the project directory; the same input
 * path given twice is imported once. Never throws.
 * @param absolutePaths defines the absolute paths of the images to import.
 */
export async function importTerrainSourceFiles(absolutePaths: string[]): Promise<{ imported: string[]; rejected: { path: string; reason: string }[] }> {
	const imported: string[] = [];
	const rejected: { path: string; reason: string }[] = [];

	const projectDirectory = getProjectDirectory();
	const handled = new Set<string>();

	for (const input of absolutePaths ?? []) {
		if (typeof input !== "string" || !input) {
			continue;
		}

		const absolutePath = toTerrainInputAbsolutePath(input, projectDirectory);
		if (handled.has(absolutePath)) {
			continue;
		}

		handled.add(absolutePath);

		const extensionError = getTerrainSourceFileError(absolutePath);
		if (extensionError) {
			rejected.push({ path: input, reason: extensionError });
			continue;
		}

		if (!projectDirectory) {
			rejected.push({ path: input, reason: "No project is open." });
			continue;
		}

		let size: number;
		try {
			const stats = await stat(absolutePath);
			if (!stats.isFile()) {
				rejected.push({ path: input, reason: "Not a file." });
				continue;
			}
			size = stats.size;
		} catch (e) {
			rejected.push({ path: input, reason: "File not found." });
			continue;
		}

		const relativePath = toProjectRelativePath(absolutePath);
		if (relativePath && isTerrainAssetsPath(relativePath)) {
			imported.push(relativePath);
			continue;
		}

		try {
			imported.push(await copyTerrainSourceFile(absolutePath, projectDirectory, size));
		} catch (e) {
			rejected.push({ path: input, reason: `Can't copy the file: ${getTerrainErrorMessage(e)}` });
		}
	}

	return { imported, rejected };
}

/**
 * Returns why a file can't be used as a layer source (extension check only), or null when its extension is accepted.
 * @param absolutePath defines the path of the file.
 */
export function getTerrainSourceFileError(absolutePath: string): string | null {
	const extension = extname(absolutePath.replace(/\\/g, "/")).toLowerCase();
	if (extension === ".exr") {
		return "EXR isn't supported.";
	}

	if (!TERRAIN_SOURCE_IMAGE_EXTENSIONS.includes(extension)) {
		return `Unsupported layer image type "${extension || basename(absolutePath)}": use PNG, JPG, WebP or BMP.`;
	}

	return null;
}

/**
 * "assets" JSON payload (absolute paths) or OS files through webUtils.getPathForFile; "/" separators. Folders are returned as folders.
 * The "assets" payload wins when both are present; duplicates are removed (first occurrence kept). Never throws.
 * @param dataTransfer defines the data transfer of a drop event (read synchronously, before any await).
 */
export function readTerrainPathsFromDataTransfer(dataTransfer: DataTransfer): string[] {
	const paths: string[] = [];
	const seen = new Set<string>();

	const push = (path: unknown): void => {
		if (typeof path !== "string" || !path) {
			return;
		}

		const normalized = path.replace(/\\/g, "/");
		if (!seen.has(normalized)) {
			seen.add(normalized);
			paths.push(normalized);
		}
	};

	if (!dataTransfer) {
		return paths;
	}

	if (getTerrainDragTypes(dataTransfer).includes("assets")) {
		try {
			const payload = JSON.parse(dataTransfer.getData("assets"));
			(Array.isArray(payload) ? payload : [payload]).forEach((path) => push(path));
		} catch (e) {
			// Not a JSON payload of the assets browser: use the OS files.
		}
	}

	if (!paths.length) {
		const files = dataTransfer.files ? Array.from(dataTransfer.files) : [];
		for (const file of files) {
			try {
				push(webUtils.getPathForFile(file));
			} catch (e) {
				// File without a path on disk (dragged from a web page).
			}
		}
	}

	return paths;
}

/**
 * Replaces folders by the files they contain (recursive, max depth 8, max 512 files, hidden and editor-generated_ entries skipped); files kept as is.
 * Folder entries are visited in natural name order; paths use "/" separators; duplicates are removed; a path that doesn't exist is kept
 * as a file (the caller reports it). Never throws.
 * @param paths defines the dropped paths (files and folders).
 */
export async function expandTerrainDroppedPaths(paths: string[]): Promise<string[]> {
	const context: ITerrainDropExpansion = {
		result: [],
		seen: new Set<string>(),
	};

	for (const input of paths ?? []) {
		if (context.result.length >= TERRAIN_DROP_MAX_FILES) {
			break;
		}

		if (typeof input !== "string" || !input) {
			continue;
		}

		const path = trimTerrainTrailingSlashes(input.replace(/\\/g, "/"));

		let isDirectory = false;
		try {
			isDirectory = (await stat(path)).isDirectory();
		} catch (e) {
			isDirectory = false;
		}

		if (isDirectory) {
			await expandTerrainDroppedFolder(context, path, 1);
		} else {
			pushTerrainDroppedPath(context, path);
		}
	}

	return context.result;
}

/**
 * types includes "assets" or "Files"
 * @param dataTransfer defines the data transfer of a drag event.
 */
export function isTerrainDragAccepted(dataTransfer: DataTransfer): boolean {
	if (!dataTransfer) {
		return false;
	}

	const types = getTerrainDragTypes(dataTransfer);
	return types.includes("assets") || types.includes("Files");
}

/**
 * 64-256 px PNG blob URL cached by path + mtime + size for the session (revoked on project change).
 * The image keeps its aspect ratio (fit inside size x size); a changed file (mtime or byte size) gets a new URL and the previous one is
 * revoked. null when the file is missing or can't be decoded.
 * @param absolutePath defines the absolute path of the image.
 * @param size defines the requested size in pixels (clamped to 64..256).
 */
export async function getTerrainImageThumbnail(absolutePath: string, size: number): Promise<string | null> {
	watchTerrainThumbnailProject();

	if (typeof absolutePath !== "string" || !absolutePath) {
		return null;
	}

	const path = absolutePath.replace(/\\/g, "/");
	const thumbnailSize = Number.isFinite(size) ? Math.min(TERRAIN_THUMBNAIL_MAX_SIZE, Math.max(TERRAIN_THUMBNAIL_MIN_SIZE, Math.round(size))) : TERRAIN_THUMBNAIL_MIN_SIZE;

	let key: string;
	try {
		const stats = await stat(path);
		if (!stats.isFile()) {
			return null;
		}

		key = `${path}|${stats.mtimeMs}|${stats.size}|${thumbnailSize}`;
	} catch (e) {
		return null;
	}

	const cached = thumbnailPromises.get(key);
	if (cached) {
		return cached;
	}

	// The file changed: drop the thumbnails of its previous versions at this size.
	for (const otherKey of Array.from(thumbnailPromises.keys())) {
		if (otherKey !== key && otherKey.startsWith(`${path}|`) && otherKey.endsWith(`|${thumbnailSize}`)) {
			removeTerrainThumbnail(otherKey);
		}
	}

	const promise = createTerrainThumbnailUrl(path, thumbnailSize);
	thumbnailPromises.set(key, promise);

	const url = await promise;
	if (url && thumbnailPromises.get(key) === promise) {
		thumbnailUrls.set(key, url);
	} else if (url) {
		// Invalidated while it was being created.
		URL.revokeObjectURL(url);
		return null;
	}

	return url;
}

/**
 * Revokes every thumbnail URL created by getTerrainImageThumbnail (called automatically when the project changes).
 */
export function clearTerrainImageThumbnails(): void {
	for (const key of Array.from(thumbnailPromises.keys())) {
		removeTerrainThumbnail(key);
	}
}

/**
 * Layer source decoder of the editor (§6.10): files of the project are read with fs (no browser cache, no XHR) and decoded like in games;
 * other URLs go to the default browser decoder.
 */
class EditorTerrainImageDecoder implements ITerrainImageDecoder {
	private _browserDecoder: ITerrainImageDecoder | null = null;

	public async decode(url: string, width: number, height: number, scene: TerrainDecoderScene, options?: ITerrainImageDecodeOptions): Promise<ITerrainDecodedImage | null> {
		try {
			const path = getTerrainProjectFilePath(url);
			if (!path) {
				this._browserDecoder ??= new BrowserTerrainImageDecoder();
				return await this._browserDecoder.decode(url, width, height, scene, options);
			}

			// Same decoding as games (§5.5.1): exact PNG path for alpha-packed sources, createImageBitmap otherwise.
			const content = await readFile(path);
			return await decodeTerrainLayerSourceBytes(new Uint8Array(content.buffer, content.byteOffset, content.byteLength), width, height, options);
		} catch (e) {
			return null;
		}
	}
}

const editorImageDecoder = new EditorTerrainImageDecoder();

TerrainMaterialPlugin.ImageDecoder = editorImageDecoder;
TerrainMaterialPlugin.PathResolver = resolveRenamedAssetPath;
TerrainMaterialPlugin.KeepDecodedSources = true;
TerrainMaterialPlugin.KeepWeightMapData = true;

function watchTerrainThumbnailProject(): void {
	if (thumbnailProjectObserved) {
		return;
	}

	thumbnailProjectObserved = true;
	thumbnailProjectPath = projectConfiguration.path;

	onProjectConfigurationChangedObservable.add(() => {
		try {
			if (projectConfiguration.path !== thumbnailProjectPath) {
				thumbnailProjectPath = projectConfiguration.path;
				clearTerrainImageThumbnails();
			}
		} catch (e) {
			console.error(e);
		}
	});
}

function removeTerrainThumbnail(key: string): void {
	const url = thumbnailUrls.get(key);
	if (url) {
		URL.revokeObjectURL(url);
	}

	thumbnailUrls.delete(key);
	thumbnailPromises.delete(key);
}

async function createTerrainThumbnailUrl(path: string, size: number): Promise<string | null> {
	try {
		const buffer = await sharp(path).rotate().resize(size, size, { fit: "inside" }).toColourspace("srgb").png().toBuffer();
		return URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: "image/png" }));
	} catch (e) {
		return null;
	}
}

async function expandTerrainDroppedFolder(context: ITerrainDropExpansion, directory: string, depth: number): Promise<void> {
	if (depth > TERRAIN_DROP_MAX_DEPTH || context.result.length >= TERRAIN_DROP_MAX_FILES) {
		return;
	}

	let names: string[];
	try {
		names = (await readdir(directory)).map((name) => name.toString());
	} catch (e) {
		return;
	}

	names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

	for (const name of names) {
		if (context.result.length >= TERRAIN_DROP_MAX_FILES) {
			return;
		}

		if (name.startsWith(".") || name.startsWith("editor-generated_")) {
			continue;
		}

		const path = `${directory}/${name}`;

		try {
			const stats = await stat(path);
			if (stats.isDirectory()) {
				await expandTerrainDroppedFolder(context, path, depth + 1);
			} else if (stats.isFile()) {
				pushTerrainDroppedPath(context, path);
			}
		} catch (e) {
			// Broken link or entry removed meanwhile.
		}
	}
}

function pushTerrainDroppedPath(context: ITerrainDropExpansion, path: string): void {
	if (context.result.length < TERRAIN_DROP_MAX_FILES && !context.seen.has(path)) {
		context.seen.add(path);
		context.result.push(path);
	}
}

async function copyTerrainSourceFile(absolutePath: string, projectDirectory: string, size: number): Promise<string> {
	const folder = join(projectDirectory, TERRAIN_SOURCE_IMPORT_FOLDER);
	await ensureDir(folder);

	const extension = extname(absolutePath);
	const name = basename(absolutePath, extension);

	// Same name and same content: reuse the copy made by a previous drop.
	const existingName = `${name}${extension}`;
	if (await isSameTerrainFileContent(absolutePath, join(folder, existingName), size)) {
		return `${TERRAIN_SOURCE_IMPORT_FOLDER}/${existingName}`;
	}

	const fileName = await findAvailableFilename(folder, name, extension);
	await copyFile(absolutePath, join(folder, fileName));

	return `${TERRAIN_SOURCE_IMPORT_FOLDER}/${fileName}`;
}

async function isSameTerrainFileContent(sourcePath: string, targetPath: string, size: number): Promise<boolean> {
	try {
		const target = await stat(targetPath);
		if (!target.isFile() || target.size !== size) {
			return false;
		}

		const [source, existing] = await Promise.all([readFile(sourcePath), readFile(targetPath)]);
		return source.equals(existing);
	} catch (e) {
		return false;
	}
}

function isTerrainAssetsPath(relativePath: string): boolean {
	const path = process.platform === "win32" ? relativePath.toLowerCase() : relativePath;
	return path.startsWith("assets/");
}

function isTerrainAbsolutePath(path: string): boolean {
	return path.startsWith("/") || /^[A-Za-z]:\//.test(path);
}

function toTerrainInputAbsolutePath(input: string, projectDirectory: string | null): string {
	const path = input.replace(/\\/g, "/");
	if (isTerrainAbsolutePath(path) || !projectDirectory) {
		return path;
	}

	return join(projectDirectory, path);
}

function trimTerrainTrailingSlashes(path: string): string {
	let end = path.length;
	while (end > 1 && path.charAt(end - 1) === "/" && !/^[A-Za-z]:\/$/.test(path.substring(0, end))) {
		--end;
	}

	return path.substring(0, end);
}

function getTerrainDragTypes(dataTransfer: DataTransfer): string[] {
	try {
		return dataTransfer.types ? Array.from(dataTransfer.types) : [];
	} catch (e) {
		return [];
	}
}

function getTerrainProjectFilePath(url: string): string | null {
	if (typeof url !== "string" || !url) {
		return null;
	}

	let path = url;
	if (/^file:\/\//i.test(path)) {
		try {
			path = decodeURIComponent(path.replace(/^file:\/\//i, ""));
		} catch (e) {
			return null;
		}

		if (/^\/[A-Za-z]:[\\/]/.test(path)) {
			path = path.substring(1);
		}
	} else if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path) && !/^[A-Za-z]:[\\/]/.test(path)) {
		// http:, https:, blob:, data: ...
		return null;
	}

	path = path.replace(/\\/g, "/");
	if (!isTerrainAbsolutePath(path)) {
		return null;
	}

	return toProjectRelativePath(path) !== null ? path : null;
}

function getTerrainErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
