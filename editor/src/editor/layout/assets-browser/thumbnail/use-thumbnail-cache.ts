import { useEffect, useCallback } from "react";
import { ThumbnailCacheService } from "./thumbnail-cache";

/**
 * Hook to manage thumbnail cache loading for the current asset folder.
 * This should be used in the assets browser to load thumbnails when navigating folders.
 */
export function useThumbnailCache(currentFolderPath: string) {
	const cacheService = ThumbnailCacheService.getInstance();

	// Load thumbnails for the current folder when it changes
	useEffect(() => {
		if (currentFolderPath) {
			const loadFolderThumbnails = async () => {
				try {
					// Load thumbnails for the current folder
					await cacheService.loadFolderThumbnails(currentFolderPath);

					// Unload thumbnails from other folders to free memory
					cacheService.unloadOtherFolders(currentFolderPath);
				} catch (e) {
					console.error("Failed to load folder thumbnails:", e);
				}
			};

			loadFolderThumbnails();
		}
	}, [currentFolderPath]);

	// Function to manually refresh thumbnails for the current folder
	const refreshFolderThumbnails = useCallback(async () => {
		if (currentFolderPath) {
			try {
				await cacheService.loadFolderThumbnails(currentFolderPath);
			} catch (e) {
				console.error("Failed to refresh folder thumbnails:", e);
			}
		}
	}, [currentFolderPath]);

	// Function to get memory usage statistics
	const getMemoryStats = useCallback(() => {
		return cacheService.getMemoryStats();
	}, []);

	// Function to clear all loaded thumbnails from memory
	const clearMemoryCache = useCallback(() => {
		cacheService.unloadOtherFolders("");
	}, []);

	return {
		refreshFolderThumbnails,
		getMemoryStats,
		clearMemoryCache,
	};
}
