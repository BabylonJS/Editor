import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { IOfflineProvider } from "@babylonjs/core/Offline/IOfflineProvider";

import { ILoadFileProgressEvent, loadFile, loadJsonFile } from "../../tools/request";

import { getFromIndexDB, openIndexDB, putInIndexDB } from "./indexdb";

/**
 * Setups offline support for the scene loading using IndexedDB as offline storage.
 * This allows scenes and assets to be loaded from the local database when offline.
 * @param name defines the name of the database to setup
 */
export function setupOfflineProvider(name: string) {
	AbstractEngine.OfflineProviderFactory = (urlToScene: string, callbackManifestChecked: (checked: boolean) => any, disableManifestCheck: boolean = false) => {
		return new Database(name, urlToScene, callbackManifestChecked, disableManifestCheck);
	};
}

/**
 * Creates a database for offline support and opens it.
 * If the database already exists in indexDB, it will be opened and returned. Otherwise, a new database will be created and opened.
 * @param name defines the name of the database to create (if doesn't exists) and open
 * @param urlToScene defines the Url of the scene to load.
 */
export async function createAndOpenDatabase(name: string, urlToScene: string) {
	const database = await new Promise<Database | null>((resolve) => {
		const databaseInstance = new Database(name, urlToScene, (checked) => resolve(checked ? databaseInstance : null), false);
	});

	await database?.open();

	return database;
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
			const manifest = await loadJsonFile<any>(`${urlToScene}.manifest?${Date.now()}`);

			this._manifestVersion = manifest.version;
			callbackManifestChecked(true);
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
	public async open(successCallback?: () => void, errorCallback?: () => void): Promise<void> {
		try {
			this._database = await openIndexDB(this.name, (database) => {
				database.createObjectStore("files", { keyPath: "url" });
				database.createObjectStore("images", { keyPath: "url" });
				database.createObjectStore("versions", { keyPath: "url" });
			});

			successCallback?.();
		} catch (e) {
			errorCallback?.();
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
				putInIndexDB<_IFilesObjectStore>(this._database, "images", { url, data }),
				putInIndexDB<_IVersionObjectStore>(this._database, "versions", {
					url,
					version: this._manifestVersion!,
				}),
			]);
		} else {
			data = (await getFromIndexDB<_IFilesObjectStore>(this._database, "images", url))?.data ?? null;
		}

		if (data !== null) {
			const objectUrl = URL.createObjectURL(data);
			image.src = objectUrl;
		} else {
			image.src = url;
		}
	}

	public async saveImage(url: string): Promise<void> {
		if (!this._database) {
			throw new Error("Database is not available");
		}

		const data = await loadFile(url, "blob");

		await Promise.all([
			putInIndexDB<_IFilesObjectStore>(this._database, "images", { url, data }),
			putInIndexDB<_IVersionObjectStore>(this._database, "versions", {
				url,
				version: this._manifestVersion!,
			}),
		]);
	}

	/**
	 * Checks wehter or not the file located at the given URL is matching the current manifest version in the database.
	 * @param url defines the URL to check the version for
	 */
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
				putInIndexDB<_IFilesObjectStore>(this._database, "files", { url, data }),
				putInIndexDB<_IVersionObjectStore>(this._database, "versions", {
					url,
					version: this._manifestVersion!,
				}),
			]);
		} else {
			data = (await getFromIndexDB<_IFilesObjectStore>(this._database, "files", url))?.data ?? null;
		}

		if (data !== null) {
			sceneLoaded(data);
		} else {
			errorCallback?.();
		}
	}

	public async saveFile(url: string, useArrayBuffer: boolean, progress?: (data: ILoadFileProgressEvent) => void): Promise<void> {
		if (!this._database) {
			throw new Error("Database is not available");
		}

		const data = await loadFile(url, useArrayBuffer ? "arraybuffer" : "text", progress);

		await Promise.all([
			putInIndexDB<_IFilesObjectStore>(this._database, "files", { url, data }),
			putInIndexDB<_IVersionObjectStore>(this._database, "versions", {
				url,
				version: this._manifestVersion!,
			}),
		]);
	}

	private async _getFileVersionForUrl(url: string): Promise<number | null> {
		const data = await getFromIndexDB<_IVersionObjectStore>(this._database!, "versions", url);
		return data?.version ?? null;
	}
}
