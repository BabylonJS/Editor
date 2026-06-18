import { WebRequest } from "@babylonjs/core/Misc/webRequest";

export interface ILoadFileProgressEvent {
	total: number;
	loaded: number;
}

export type LoadFileResponseType<T> = T extends "text" ? string : T extends "arraybuffer" ? ArrayBuffer : Blob;

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
	return new Promise<LoadFileResponseType<T>>((resolve, reject) => {
		const request = new WebRequest();
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
			resolve(responseType === "text" ? request.responseText : request.response);
		});

		request.addEventListener("error", (e) => reject(e));
	});
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
