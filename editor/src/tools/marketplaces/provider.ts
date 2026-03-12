import { dirname, join, isAbsolute } from "path";
import { ensureDir, remove, writeFile } from "fs-extra";
import axios from "axios";
import { ipcRenderer } from "electron";

import decompress from "decompress";
import { Editor } from "../../editor/main";
import {
	IMarketplaceAsset,
	IMarketplaceSearchResult,
	IMarketplaceFilterDefinition,
	IMarketplaceSearchFilters,
	IFileToDownload,
	IMarketplaceProgress,
	IMarketplaceOAuth,
	IMarketplaceSettings,
} from "./types";

export abstract class MarketplaceProvider {
	private static _registry: MarketplaceProvider[] = [];

	static register(provider: MarketplaceProvider) {
		if (MarketplaceProvider._registry.some((p) => p.id === provider.id)) {
			return;
		}

		MarketplaceProvider._registry.push(provider);

		if (MarketplaceProvider._registry.length === 1) {
			ipcRenderer?.on("app:open-url-callback", async (_, url: string) => {
				for (const p of MarketplaceProvider._registry) {
					const oauth = p.getOAuth?.();
					if (oauth && url.startsWith(oauth.redirectUrl)) {
						try {
							await oauth.onRedirect(url);
						} catch (e) {
							const message = e instanceof Error ? e.message : String(e);
							console.error(`[Marketplace OAuth] ${p.id}: ${message}`);
						}
						break;
					}
				}
			});
		}
	}

	static getProviders() {
		return MarketplaceProvider._registry;
	}

	public abstract id: string;
	public abstract title: string;

	protected _settings: IMarketplaceSettings;
	private _settingsListeners: ((id: string, value: any) => void)[] = [];

	public onSettingsChanged(listener: (id: string, value: any) => void): void {
		this._settingsListeners.push(listener);
	}

	public removeSettingsListener(listener: (id: string, value: any) => void): void {
		const index = this._settingsListeners.indexOf(listener);
		if (index !== -1) {
			this._settingsListeners.splice(index, 1);
		}
	}

	public getSearchFilters?(): IMarketplaceFilterDefinition[];

	public abstract search(query: string, pageToken?: string, filters?: IMarketplaceSearchFilters): Promise<IMarketplaceSearchResult>;

	public abstract getAssetDetails?(id: string): Promise<IMarketplaceAsset>;

	protected onSettingChanged(id: string, value: any): void {
		this._settings = {
			...this._settings,
			[id]: value,
		};
		localStorage.setItem(`marketplace-setting-${this.id}`, JSON.stringify(this._settings));

		this._settingsListeners.forEach((l) => l(id, value));
	}

	protected getSettings<T extends IMarketplaceSettings>(): T {
		const settings = localStorage.getItem(`marketplace-setting-${this.id}`);
		return JSON.parse(settings || "{}");
	}

	public getOAuth?(): IMarketplaceOAuth;
	public isAuthenticated?(): boolean;

	public renderSettings?(): any;

	protected abstract getFilesToDownload(asset: IMarketplaceAsset, selectedQuality: string, selectedType: string): IFileToDownload[];

	public async downloadAndImport(
		asset: IMarketplaceAsset,
		editor: Editor,
		selectedQuality: string,
		selectedType: string,
		onProgress?: (data: IMarketplaceProgress) => void,
		signal?: AbortSignal
	): Promise<void> {
		if (!editor.state.projectPath) {
			return;
		}

		const files = this.getFilesToDownload(asset, selectedQuality, selectedType).filter((f) => !!f.url && !!f.path);
		if (files.length === 0) {
			throw new Error(`No downloadable files are available for '${asset.name}' with ${selectedQuality}/${selectedType}.`);
		}

		const projectDir = dirname(editor.state.projectPath);
		const downloadPath = localStorage.getItem("marketplace-download-path") || "assets";
		const assetDir = isAbsolute(downloadPath) ? join(downloadPath, this.id, asset.id) : join(projectDir, downloadPath, this.id, asset.id);
		await ensureDir(assetDir);

		const totalDownloadSize = files.reduce((acc, q) => acc + (q.size || 0), 0);

		const startTime = Date.now();
		let totalLoaded = 0;

		const filesToExtract: { path: string; dir: string }[] = [];

		try {
			for (const file of files) {
				if (signal?.aborted) {
					throw new Error("Download aborted by user.");
				}

				const filePath = join(assetDir, file.path);
				const fileDirPath = dirname(filePath);
				await ensureDir(fileDirPath);

				let lastFileLoaded = 0;

				await axios({
					method: "get",
					url: file.url,
					responseType: "arraybuffer",
					signal: signal,
					onDownloadProgress: (progressEvent) => {
						if (onProgress) {
							const fileLoaded = progressEvent.loaded;
							const delta = fileLoaded - lastFileLoaded;
							totalLoaded += delta;
							lastFileLoaded = fileLoaded;

							const elapsed = (Date.now() - startTime) / 1000;
							const speed = elapsed > 0 ? totalLoaded / elapsed : 0;
							const progress = totalDownloadSize > 0 ? (totalLoaded / totalDownloadSize) * 100 : 0;

							onProgress({
								progress: Math.min(100, Math.round(progress)),
								loaded: totalLoaded,
								total: totalDownloadSize,
								speed: speed,
							});
						}
					},
				}).then(async (response) => {
					const buffer = Buffer.from(response.data);
					await writeFile(filePath, buffer);

					if (file.extract) {
						filesToExtract.push({ path: filePath, dir: fileDirPath });
					}
				});
			}

			if (filesToExtract.length > 0) {
				if (onProgress) {
					onProgress({
						progress: 100,
						loaded: totalDownloadSize,
						total: totalDownloadSize,
						speed: 0,
						extracting: true,
					});
				}

				for (const item of filesToExtract) {
					await decompress(item.path, item.dir);
					await remove(item.path);
				}
			}
		} catch (e) {
			await remove(assetDir);
			throw e;
		}

		editor.layout.assets.refresh();
	}
}
