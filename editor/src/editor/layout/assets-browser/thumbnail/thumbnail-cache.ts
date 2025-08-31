import { join, dirname } from "path";
import { readJSON, writeJSON, ensureFile } from "fs-extra";
import { projectConfiguration } from "../../../../project/configuration";

export interface IThumbnailCache {
	[key: string]: string; // relative path -> base64 image data
}

export interface IThumbnailCacheKeys {
	[key: string]: boolean; // relative path -> exists flag (true means thumbnail exists)
}

export class ThumbnailCacheService {
	private static _instance: ThumbnailCacheService;
	private _cacheKeys: IThumbnailCacheKeys = {}; // Only stores which thumbnails exist
	private _loadedThumbnails: Map<string, string> = new Map(); // In-memory cache for currently displayed thumbnails
	private _cacheFilePath: string | null = null;
	private _isInitialized = false;

	private constructor() {}

	public static getInstance(): ThumbnailCacheService {
		if (!ThumbnailCacheService._instance) {
			ThumbnailCacheService._instance = new ThumbnailCacheService();
		}
		return ThumbnailCacheService._instance;
	}

	/**
	 * Initializes the cache service and loads only the cache keys.
	 */
	public async initialize(): Promise<void> {
		if (this._isInitialized) {
			return;
		}

		if (!projectConfiguration.path) {
			this._isInitialized = true;
			return;
		}

		const projectDir = dirname(projectConfiguration.path);
		this._cacheFilePath = join(projectDir, "assets", ".thumbnail-cache.json");

		try {
			await ensureFile(this._cacheFilePath);
			const fullCache = await readJSON(this._cacheFilePath);

			// Only store the keys, not the actual thumbnail data
			this._cacheKeys = {};
			for (const key in fullCache) {
				if (Object.prototype.hasOwnProperty.call(fullCache, key)) {
					this._cacheKeys[key] = true;
				}
			}
		} catch (e) {
			this._cacheKeys = {};
		}

		this._isInitialized = true;
	}

	/**
	 * Gets a thumbnail from cache if it exists, loading it on-demand if needed.
	 * @param relativePath The relative path to the asset
	 * @returns Base64 image data or null if not found
	 */
	public async getThumbnail(relativePath: string): Promise<string | null> {
		await this.initialize();

		// Check if thumbnail exists in cache
		if (!this._cacheKeys[relativePath]) {
			return null;
		}

		// Check if already loaded in memory
		if (this._loadedThumbnails.has(relativePath)) {
			return this._loadedThumbnails.get(relativePath)!;
		}

		// Load thumbnail from cache file on-demand
		try {
			const fullCache = await readJSON(this._cacheFilePath!);
			const thumbnailData = fullCache[relativePath];

			if (thumbnailData) {
				// Store in memory for current session
				this._loadedThumbnails.set(relativePath, thumbnailData);
				return thumbnailData;
			}
		} catch (e) {
			console.error("Failed to load thumbnail from cache:", e);
		}

		return null;
	}

	/**
	 * Saves a thumbnail to cache.
	 * @param relativePath The relative path to the asset
	 * @param base64Data The base64 encoded image data
	 */
	public async setThumbnail(relativePath: string, base64Data: string): Promise<void> {
		await this.initialize();

		// Mark as existing in cache keys
		this._cacheKeys[relativePath] = true;

		// Store in memory for current session
		this._loadedThumbnails.set(relativePath, base64Data);

		// Save to cache file
		if (this._cacheFilePath) {
			try {
				let fullCache: IThumbnailCache = {};
				try {
					fullCache = await readJSON(this._cacheFilePath);
				} catch (e) {
					fullCache = {};
				}

				fullCache[relativePath] = base64Data;

				await writeJSON(this._cacheFilePath, fullCache, {
					encoding: "utf-8",
					spaces: "\t",
				});
			} catch (e) {
				console.error("Failed to save thumbnail cache:", e);
			}
		}
	}

	/**
	 * Checks if a thumbnail exists in cache.
	 * @param relativePath The relative path to the asset
	 * @returns True if thumbnail exists in cache
	 */
	public async hasThumbnail(relativePath: string): Promise<boolean> {
		await this.initialize();
		return relativePath in this._cacheKeys;
	}

	/**
	 * Loads thumbnails for a specific asset folder into memory.
	 * @param folderPath The relative path to the asset folder
	 */
	public async loadFolderThumbnails(folderPath: string): Promise<void> {
		await this.initialize();

		// Find all thumbnails in the specified folder
		const folderThumbnails: string[] = [];
		for (const key in this._cacheKeys) {
			if (Object.prototype.hasOwnProperty.call(this._cacheKeys, key)) {
				if (key.startsWith(folderPath + "/") || key === folderPath) {
					folderThumbnails.push(key);
				}
			}
		}

		// Load thumbnails for this folder on-demand
		for (const relativePath of folderThumbnails) {
			if (!this._loadedThumbnails.has(relativePath)) {
				try {
					const fullCache = await readJSON(this._cacheFilePath!);
					const thumbnailData = fullCache[relativePath];

					if (thumbnailData) {
						this._loadedThumbnails.set(relativePath, thumbnailData);
					}
				} catch (e) {
					console.error(`Failed to load thumbnail for ${relativePath}:`, e);
				}
			}
		}
	}

	/**
	 * Unloads thumbnails that are not in the current folder to free memory.
	 * @param currentFolderPath The relative path to the current asset folder
	 */
	public unloadOtherFolders(currentFolderPath: string): void {
		const thumbnailsToKeep: string[] = [];

		// Keep thumbnails from current folder
		for (const key in this._cacheKeys) {
			if (Object.prototype.hasOwnProperty.call(this._cacheKeys, key)) {
				if (key.startsWith(currentFolderPath + "/") || key === currentFolderPath) {
					thumbnailsToKeep.push(key);
				}
			}
		}

		// Remove thumbnails from other folders from memory
		const keysToRemove: string[] = [];
		for (const [key] of this._loadedThumbnails) {
			if (!thumbnailsToKeep.includes(key)) {
				keysToRemove.push(key);
			}
		}

		for (const key of keysToRemove) {
			this._loadedThumbnails.delete(key);
		}
	}

	/**
	 * Converts an absolute path to a relative path for cache keys.
	 * @param absolutePath The absolute path to the asset
	 * @returns The relative path from the project assets folder
	 */
	public getRelativePath(absolutePath: string): string {
		if (!projectConfiguration.path) {
			return absolutePath;
		}

		const projectDir = dirname(projectConfiguration.path);
		const assetsPath = join(projectDir, "assets");
		if (absolutePath.startsWith(assetsPath)) {
			return absolutePath.substring(assetsPath.length + 1); // +1 for the path separator
		}

		return absolutePath;
	}

	/**
	 * Clears the entire cache (both keys and loaded thumbnails).
	 */
	public async clearCache(): Promise<void> {
		await this.initialize();
		this._cacheKeys = {};
		this._loadedThumbnails.clear();

		if (this._cacheFilePath) {
			try {
				await writeJSON(
					this._cacheFilePath,
					{},
					{
						encoding: "utf-8",
						spaces: "\t",
					}
				);
			} catch (e) {
				console.error("Failed to clear thumbnail cache:", e);
			}
		}
	}

	/**
	 * Removes a specific thumbnail from cache.
	 * @param relativePath The relative path to the asset
	 */
	public async removeThumbnail(relativePath: string): Promise<void> {
		await this.initialize();

		if (relativePath in this._cacheKeys) {
			delete this._cacheKeys[relativePath];
			this._loadedThumbnails.delete(relativePath);

			if (this._cacheFilePath) {
				try {
					const fullCache = await readJSON(this._cacheFilePath);
					delete fullCache[relativePath];

					await writeJSON(this._cacheFilePath, fullCache, {
						encoding: "utf-8",
						spaces: "\t",
					});
				} catch (e) {
					console.error("Failed to update thumbnail cache:", e);
				}
			}
		}
	}

	/**
	 * Gets memory usage statistics for debugging.
	 */
	public getMemoryStats(): { loadedCount: number; totalKeys: number } {
		return {
			loadedCount: this._loadedThumbnails.size,
			totalKeys: Object.keys(this._cacheKeys).length,
		};
	}
}
