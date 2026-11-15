export interface ILoadFileProgressEvent {
	total: number;
	loaded: number;
}

export type LoadFileResponseType<T> = T extends "text" ? string : T extends "arraybuffer" ? ArrayBuffer : Blob;

/**
 * Defines the function used to load the files requested by the tools (scenes, geometries, textures, sounds, etc.).
 * When set, it has priority over the default network request. This is typically used to load files from an offline
 * database instead of the network.
 * @see setFileLoaderOverride
 */
export type FileLoaderOverride = (url: string, responseType: "text" | "arraybuffer" | "blob", progressCallback?: (data: ILoadFileProgressEvent) => void) => Promise<any> | null;

const fileLoaderOverrides: FileLoaderOverride[] = [];
const loadableUrls = new Map<string, Promise<string>>();

/**
 * Adds a function that can provide the content of the files requested by the tools instead of the network.
 * The override returns `null` when it can't provide the requested file, the next override (or the network) is used then.
 * @param override defines the reference to the override function to add.
 * @returns a function that removes the override.
 */
export function addFileLoaderOverride(override: FileLoaderOverride): () => void {
	fileLoaderOverrides.push(override);

	return () => {
		const index = fileLoaderOverrides.indexOf(override);
		if (index !== -1) {
			fileLoaderOverrides.splice(index, 1);
			loadableUrls.clear();
		}
	};
}

/**
 * Loads the file located at the given url using the network only, bypassing the overrides.
 * @param url defines the url to load from
 * @param responseType defines the type of response expected ("text", "arraybuffer", or "blob")
 * @param progressCallback defines a callback to call when progress changes
 * @returns a promise with the loaded file content
 */
export function loadFileFromNetwork<T extends "text" | "arraybuffer" | "blob">(
	url: string,
	responseType: T,
	progressCallback?: (data: ILoadFileProgressEvent) => void
): Promise<LoadFileResponseType<T>> {
	return new Promise<LoadFileResponseType<T>>((resolve, reject) => {
		const request = new XMLHttpRequest();
		request.open("GET", url);
		request.responseType = responseType;
		request.send();

		request.addEventListener("progress", (ev) => {
			progressCallback?.({
				total: ev.total,
				loaded: ev.loaded,
			});
		});

		request.addEventListener("load", () => {
			if (request.status >= 400) {
				return reject(new Error(`Failed to load file at "${url}": ${request.status} ${request.statusText}`));
			}

			resolve(responseType === "text" ? request.responseText : request.response);
		});

		request.addEventListener("error", (e) => reject(e));
	});
}

/**
 * Loads the file located at the given url and returns a promise with its content. The promise is rejected if an error occurs while loading the file.
 * @param url defines the url to load from
 * @param responseType defines the type of response expected ("text", "arraybuffer", or "blob")
 * @param progressCallback defines a callback to call when progress changes
 * @returns a promise with the loaded file content
 */
export function loadFile<T extends "text" | "arraybuffer" | "blob">(
	url: string,
	responseType: T,
	progressCallback?: (data: ILoadFileProgressEvent) => void
): Promise<LoadFileResponseType<T>> {
	for (const override of fileLoaderOverrides) {
		const result = override(url, responseType, progressCallback);
		if (result) {
			return result;
		}
	}

	return loadFileFromNetwork(url, responseType, progressCallback);
}

/**
 * Loads a JSON file from the given url and returns a promise with its content. The promise is rejected if an error occurs while loading the file or if the loaded content cannot be parsed as JSON.
 * @param url defines the url to load from
 * @param progressCallback defines a callback to call when progress changes
 * @returns a promise with the loaded JSON content
 */
export async function loadJsonFile<T>(url: string, progressCallback?: (data: ILoadFileProgressEvent) => void): Promise<T> {
	const response = await loadFile(url, "text", progressCallback);
	return JSON.parse(response) as T;
}

/**
 * Returns the URL to use to load the file located at the given url in a Babylon Lite loader that fetches the URL
 * itself (textures, environments, etc.). When a file loader override (typically the offline database) provides the
 * file, an object URL pointing to the provided content is returned instead of the original url.
 * @param url defines the url of the file to load.
 */
export async function getLoadableUrl(url: string): Promise<string> {
	if (!fileLoaderOverrides.length) {
		return url;
	}

	// The same object URL is returned for the same url so the loaders of Babylon Lite can still share the loaded resources.
	let promise = loadableUrls.get(url);
	if (!promise) {
		promise = createLoadableUrl(url);
		loadableUrls.set(url, promise);
	}

	return promise;
}

async function createLoadableUrl(url: string): Promise<string> {
	for (const override of fileLoaderOverrides) {
		const result = override(url, "blob");
		if (result) {
			try {
				const blob = await result;
				if (blob) {
					return URL.createObjectURL(blob);
				}
			} catch (e) {
				// Catch silently, the url is used as it is.
			}
		}
	}

	return url;
}
