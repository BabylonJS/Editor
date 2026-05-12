import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { IOfflineProvider } from "@babylonjs/core/Offline/IOfflineProvider";

import { ILoadFileProgressEvent, loadFile } from "../../tools/request";

import { getFromDatabase, openDatabase, putInDatabase } from "./indexdb";

export async function setupOfflineProvider(name: string) {
	AbstractEngine.OfflineProviderFactory = (urlToScene: string, callbackManifestChecked: (checked: boolean) => any, disableManifestCheck = false) => {
		return new Database(name, urlToScene, callbackManifestChecked, disableManifestCheck);
	};
}

interface _IVersionObjectStore {
	url: string;
	version: number;
}

export interface _IFilesObjectStore {
	url: string;
	data: string | ArrayBuffer | Blob;
}

export class Database implements IOfflineProvider {
	/**
	 * Gets a boolean indicating if scene must be saved in the database
	 */
	public enableSceneOffline: boolean = true;
	/**
	 * Gets a boolean indicating if textures must be saved in the database
	 */
	public enableTexturesOffline: boolean = true;

	/**
	 * Defines the name of the database.
	 */
	public readonly name: string;

	private _database: IDBDatabase | null = null;
	private _manifestVersion: number | null = null;

	public constructor(name: string, urlToScene: string, callbackManifestChecked: (checked: boolean) => any, disableManifestCheck: boolean) {
		this.name = name;

		if (disableManifestCheck) {
			callbackManifestChecked(false);
		} else {
			this._checkManifest(urlToScene, callbackManifestChecked);
		}
	}

	private async _checkManifest(urlToScene: string, callbackManifestChecked: (checked: boolean) => any): Promise<void> {
		try {
			const response = await fetch(`${urlToScene}.manifest?${Date.now()}`, {
				method: "GET",
			});

			const manifest = await response.json();
			this._manifestVersion = manifest.version;
			callbackManifestChecked(true);
			console.log(this._manifestVersion);
		} catch (e) {
			this.enableSceneOffline = false;
			this.enableTexturesOffline = false;

			callbackManifestChecked(false);
		}
	}

	/**
	 * Open the offline support and make it available
	 * @param successCallback defines the callback to call on success
	 * @param errorCallback defines the callback to call on error
	 */
	public async open(successCallback: () => void, errorCallback: () => void): Promise<void> {
		try {
			this._database = await openDatabase(this.name, (database) => {
				database.createObjectStore("files", { keyPath: "url" });
				database.createObjectStore("images", { keyPath: "url" });
				database.createObjectStore("versions", { keyPath: "url" });
			});

			successCallback();
		} catch (e) {
			errorCallback();
		}
	}

	/**
	 * Loads an image from the offline support
	 * @param url defines the url to load from
	 * @param image defines the target DOM image
	 */
	public async loadImage(url: string, image: HTMLImageElement): Promise<void> {
		if (!this._database) {
			image.src = url;
			return;
		}

		let data: any = null;

		const version = await this._getFileVersionForUrl(url);
		if (version !== this._manifestVersion) {
			data = await loadFile(url, "blob");

			await Promise.all([
				putInDatabase<_IFilesObjectStore>(this._database, "images", { url, data }),
				putInDatabase<_IVersionObjectStore>(this._database, "versions", {
					url,
					version: this._manifestVersion!,
				}),
			]);
		} else {
			data = (await getFromDatabase<_IFilesObjectStore>(this._database, "images", url))?.data ?? null;
		}

		if (data !== null) {
			const objectUrl = URL.createObjectURL(data);
			image.src = objectUrl;
		} else {
			image.src = url;
		}
	}

	public async isFileMatchingVersion(url: string): Promise<boolean> {
		return (await this._getFileVersionForUrl(url)) === this._manifestVersion;
	}

	/**
	 * Loads a file from offline support
	 * @param url defines the URL to load from
	 * @param sceneLoaded defines a callback to call on success
	 * @param progressCallBack defines a callback to call when progress changed
	 * @param errorCallback defines a callback to call on error
	 * @param useArrayBuffer defines a boolean to use array buffer instead of text string
	 */
	public async loadFile(
		url: string,
		sceneLoaded: (data: any) => void,
		progressCallBack?: (data: ILoadFileProgressEvent) => void,
		errorCallback?: () => void,
		useArrayBuffer?: boolean
	): Promise<void> {
		if (!this._database) {
			return errorCallback?.();
		}

		let data: any = null;

		const version = await this._getFileVersionForUrl(url);
		if (version !== this._manifestVersion) {
			data = await loadFile(url, useArrayBuffer ? "arraybuffer" : "text", progressCallBack);

			await Promise.all([
				putInDatabase<_IFilesObjectStore>(this._database, "files", { url, data }),
				putInDatabase<_IVersionObjectStore>(this._database, "versions", {
					url,
					version: this._manifestVersion!,
				}),
			]);
		} else {
			data = (await getFromDatabase<_IFilesObjectStore>(this._database, "files", url))?.data ?? null;
		}

		if (data !== null) {
			sceneLoaded(data);
		} else {
			errorCallback?.();
		}
	}

	private async _getFileVersionForUrl(url: string): Promise<number | null> {
		const data = await getFromDatabase<_IVersionObjectStore>(this._database!, "versions", url);
		return data?.version ?? null;
	}
}
