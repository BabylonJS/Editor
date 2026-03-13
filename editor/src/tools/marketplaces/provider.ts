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
	IMarketplaceDownloadItem,
} from "./types";
import { HDRCubeTexture } from "babylonjs";
import { EnvironmentTextureTools } from "babylonjs";
import { BaseTexture } from "babylonjs";
import { Observable } from "babylonjs";
import { EXRCubeTexture } from "babylonjs";

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

	private activeDownloadIds: IMarketplaceDownloadItem[] = [];
	private downloadListeners: ((id: string, progress: IMarketplaceProgress) => void)[] = [];

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

	public registerDownloadListener(listener: (id: string, progress: IMarketplaceProgress) => void): () => void {
		this.downloadListeners.push(listener);

		return () => {
			const index = this.downloadListeners.indexOf(listener);
			if (index !== -1) {
				this.downloadListeners.splice(index, 1);
			}
		};
	}

	public abortDownload(id: string): void {
		this.activeDownloadIds.find((i) => i.id === id)?.abortController.abort();
	}

	public async downloadAndImport(asset: IMarketplaceAsset, editor: Editor, selectedQuality: string, selectedType: string, type?: string): Promise<void> {
		if (!editor.state.projectPath || this.activeDownloadIds.some((i) => i.id === asset.id)) {
			throw new Error("Download already in progress for this asset.");
		}

		const files = this.getFilesToDownload(asset, selectedQuality, selectedType).filter((f) => !!f.url && !!f.path);
		if (files.length === 0) {
			throw new Error(`No downloadable files are available for '${asset.name}' with ${selectedQuality}/${selectedType}.`);
		}

		this.activeDownloadIds.push({ id: asset.id, abortController: new AbortController() });
		const projectDir = dirname(editor.state.projectPath);
		const downloadPath = localStorage.getItem("marketplace-download-path") || "assets";
		const assetDir = isAbsolute(downloadPath) ? join(downloadPath, this.id, asset.id) : join(projectDir, downloadPath, this.id, asset.id);

		try {
			await ensureDir(assetDir);

			const totalDownloadSize = files.reduce((acc, q) => acc + (q.size || 0), 0);

			const startTime = Date.now();
			let totalLoaded = 0;

			const filesToExtract: { path: string; dir: string }[] = [];
			for (const file of files) {
				if (this.activeDownloadIds.some((i) => i.id === asset.id && i.abortController.signal.aborted)) {
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
					signal: this.activeDownloadIds.find((i) => i.id === asset.id)?.abortController.signal,
					onDownloadProgress: (progressEvent) => {
						const fileLoaded = progressEvent.loaded;
						const delta = fileLoaded - lastFileLoaded;
						totalLoaded += delta;
						lastFileLoaded = fileLoaded;

						const elapsed = (Date.now() - startTime) / 1000;
						const speed = elapsed > 0 ? totalLoaded / elapsed : 0;
						const progress = totalDownloadSize > 0 ? (totalLoaded / totalDownloadSize) * 100 : 0;

						this.downloadListeners.forEach((l) =>
							l(asset.id, {
								progress: Math.min(100, Math.round(progress)),
								loaded: totalLoaded,
								total: totalDownloadSize,
								speed: speed,
							})
						);
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
				this.downloadListeners.forEach((l) =>
					l(asset.id, {
						progress: 100,
						loaded: totalDownloadSize,
						total: totalDownloadSize,
						speed: 0,
						extraStatus: "Extracting Asset...",
					})
				);

				for (const item of filesToExtract) {
					await decompress(item.path, item.dir);
					await remove(item.path);
				}
			}

			if (type === "env") {
				this.downloadListeners.forEach((l) =>
					l(asset.id, {
						progress: 100,
						loaded: totalDownloadSize,
						total: totalDownloadSize,
						speed: 0,
						extraStatus: "Converting to Environment...",
					})
				);
				for (const item of files) {
					await this.convertFileToEnv(join(assetDir, item.path), editor);
				}
			}

			this.activeDownloadIds = this.activeDownloadIds.filter((asset) => asset.id !== asset.id);
		} catch (e) {
			await remove(assetDir);
			this.activeDownloadIds = this.activeDownloadIds.filter((asset) => asset.id !== asset.id);
			throw e;
		}

		editor.layout.assets.refresh();
	}

	private async convertFileToEnv(filePath: string, editor: Editor) {
		const type = filePath.split(".").pop();
		switch (type) {
			case "hdr":
				const hdr = new HDRCubeTexture(filePath, editor.layout.preview.scene, 512, false, true, false, false);
				await this.convertTextureToEnv(filePath, hdr, hdr.onLoadObservable);
				break;
			case "exr":
				const exr = new EXRCubeTexture(filePath, editor.layout.preview.scene, 512, false, true, false, false);
				await this.convertTextureToEnv(filePath, exr, exr.onLoadObservable);
				break;
		}
	}

	private async convertTextureToEnv(filePath: string, texture: BaseTexture, onLoadObservable: Observable<BaseTexture>) {
		return new Promise((res, rej) => {
			onLoadObservable.addOnce(async () => {
				try {
					const envBuffer = await EnvironmentTextureTools.CreateEnvTextureAsync(texture, {
						imageQuality: 1,
					});
					await writeFile(`${filePath}.env`, Buffer.from(envBuffer));
					await remove(filePath);
					res(true);
				} catch (e) {
					rej(e);
				} finally {
					texture.dispose();
				}
			});
		});
	}
}
