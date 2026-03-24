import { ipcRenderer } from "electron";
import { dirname, join, isAbsolute } from "path/posix";
import { ensureDir, readdir, remove, writeFile, writeJSON } from "fs-extra";

import axios from "axios";
import sharp from "sharp";
import decompress from "decompress";

import { UniqueNumber } from "../../tools/tools";

import { configureImportedTexture } from "../../editor/layout/preview/import/import";

import { BaseTexture, EnvironmentTextureTools, EXRCubeTexture, HDRCubeTexture, Observable, Texture, Tools, PBRMaterial } from "babylonjs";

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

	private _activeDownloadIds: IMarketplaceDownloadItem[] = [];
	private _downloadListeners: ((id: string, progress: IMarketplaceProgress) => void)[] = [];

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
	public login?(): void;

	public renderSettings?(): any;

	protected abstract getFilesToDownload(asset: IMarketplaceAsset, selectedQuality: string, selectedType: string): IFileToDownload[];

	public registerDownloadListener(listener: (id: string, progress: IMarketplaceProgress) => void): () => void {
		this._downloadListeners.push(listener);

		return () => {
			const index = this._downloadListeners.indexOf(listener);
			if (index !== -1) {
				this._downloadListeners.splice(index, 1);
			}
		};
	}

	public abortDownload(id: string): void {
		this._activeDownloadIds.find((i) => i.id === id)?.abortController.abort();
	}

	public getAssetDir(assetId: string, projectPath: string) {
		const projectDir = dirname(projectPath);
		const downloadPathKey = projectPath ? `marketplace-download-${projectPath}` : "marketplace-download-path";
		const downloadPath = localStorage.getItem(downloadPathKey) || "assets";
		return isAbsolute(downloadPath) ? join(downloadPath, this.id, assetId) : join(projectDir, downloadPath, this.id, assetId);
	}

	public async downloadAndImport(asset: IMarketplaceAsset, editor: Editor, selectedQuality: string, selectedType: string, type?: string): Promise<void> {
		if (!editor.state.projectPath) {
			throw new Error("Cannot download assets: no project is currently open.");
		}
		if (this._activeDownloadIds.some((i) => i.id === asset.id)) {
			throw new Error("Download already in progress for this asset.");
		}

		const files = this.getFilesToDownload(asset, selectedQuality, selectedType).filter((f) => !!f.url && !!f.path);
		if (files.length === 0) {
			throw new Error(`No downloadable files are available for '${asset.name}' with ${selectedQuality}/${selectedType}.`);
		}

		this._activeDownloadIds.push({ id: asset.id, abortController: new AbortController() });
		const assetDir = this.getAssetDir(asset.id, editor.state.projectPath);

		try {
			await ensureDir(assetDir);

			const totalDownloadSize = files.reduce((acc, q) => acc + (q.size || 0), 0);

			const startTime = Date.now();
			let totalLoaded = 0;

			const filesToExtract: { path: string; dir: string }[] = [];
			for (const file of files) {
				if (this._activeDownloadIds.some((i) => i.id === asset.id && i.abortController.signal.aborted)) {
					throw new Error("Download aborted by user.");
				}

				const filePath = join(assetDir, file.path);
				const fileDirPath = dirname(filePath);
				await ensureDir(fileDirPath);

				let lastFileLoaded = 0;

				const response = await axios({
					method: "get",
					url: file.url,
					responseType: "arraybuffer",
					signal: this._activeDownloadIds.find((i) => i.id === asset.id)?.abortController.signal,
					onDownloadProgress: (progressEvent) => {
						const fileLoaded = progressEvent.loaded;
						const delta = fileLoaded - lastFileLoaded;
						totalLoaded += delta;
						lastFileLoaded = fileLoaded;

						const elapsed = (Date.now() - startTime) / 1000;
						const speed = elapsed > 0 ? totalLoaded / elapsed : 0;
						const progress = totalDownloadSize > 0 ? (totalLoaded / totalDownloadSize) * 100 : 0;

						this._downloadListeners.forEach((l) =>
							l(asset.id, {
								progress: Math.min(100, Math.round(progress)),
								loaded: totalLoaded,
								total: totalDownloadSize,
								speed: speed,
							})
						);
					},
				});

				const buffer = Buffer.from(response.data);
				await writeFile(filePath, buffer);

				if (file.extract) {
					filesToExtract.push({ path: filePath, dir: fileDirPath });
				}
			}

			if (filesToExtract.length > 0) {
				this._downloadListeners.forEach((l) =>
					l(asset.id, {
						extraStatus: "Extracting Asset...",
					})
				);

				for (const item of filesToExtract) {
					await decompress(item.path, item.dir);
					await remove(item.path);
				}
			}

			if (type === "env") {
				this._downloadListeners.forEach((l) =>
					l(asset.id, {
						progress: 100,
						loaded: totalDownloadSize,
						total: totalDownloadSize,
						speed: 0,
						extraStatus: "Converting to Environment...",
					})
				);
				for (const item of files) {
					await this._convertFileToEnv(join(assetDir, item.path), editor);
				}
			} else {
				await this._convertToMaterial(assetDir, asset, editor);
			}
			this._activeDownloadIds = this._activeDownloadIds.filter((item) => item.id !== asset.id);
		} catch (e) {
			await remove(assetDir);
			this._activeDownloadIds = this._activeDownloadIds.filter((item) => item.id !== asset.id);
			throw e;
		}

		editor.layout.assets.refresh();
	}

	private async _convertFileToEnv(filePath: string, editor: Editor) {
		const type = filePath.split(".").pop();
		switch (type) {
			case "hdr":
				const hdr = new HDRCubeTexture(filePath, editor.layout.preview.scene, 512, false, true, false, false);
				await this._convertTextureToEnv(filePath, hdr, hdr.onLoadObservable);
				break;
			case "exr":
				const exr = new EXRCubeTexture(filePath, editor.layout.preview.scene, 512, false, true, false, false);
				await this._convertTextureToEnv(filePath, exr, exr.onLoadObservable);
				break;
		}
	}

	private async _convertTextureToEnv(filePath: string, texture: BaseTexture, onLoadObservable: Observable<BaseTexture>) {
		return new Promise((resolve, reject) => {
			onLoadObservable.addOnce(async () => {
				try {
					const envBuffer = await EnvironmentTextureTools.CreateEnvTextureAsync(texture, {
						imageQuality: 1,
					});
					await writeFile(`${filePath}.env`, Buffer.from(envBuffer));
					await remove(filePath);
					resolve(true);
				} catch (e) {
					reject(e);
				} finally {
					texture.dispose();
				}
			});
		});
	}

	private async _getFilesRecursive(dir: string, baseDir: string = dir): Promise<string[]> {
		const dirents = await readdir(dir, { withFileTypes: true });
		const files = await Promise.all(
			dirents.map(async (dirent) => {
				const res = join(dir, dirent.name);
				if (dirent.isDirectory()) {
					return this._getFilesRecursive(res, baseDir);
				}
				const rel = res.replace(baseDir, "").replace(/\\/g, "/");
				return rel.startsWith("/") ? rel.substring(1) : rel;
			})
		);
		return Array.prototype.concat(...files);
	}

	private _loadTexture(path: string, assetDir: string, editor: Editor): Texture {
		const projectDirForward = dirname(editor.state.projectPath!.replace(/\\/g, "/"));
		const absolutePath = join(assetDir, path).replace(/\\/g, "/");
		const tex = new Texture(absolutePath, editor.layout.preview.scene);
		configureImportedTexture(tex);
		tex.name = absolutePath.replace(`${projectDirForward}/`, "");
		tex.url = tex.name;
		return tex;
	}

	private _parseTextures(files: string[]): Record<string, string> {
		const patterns = {
			albedo: /(_color|_diffuse|_diff)(\.|_)/i,
			normal: /(_normalgl|_normaldx|_nor_gl|_nor_dx)(\.|_)/i,
			ao: /(_ambientocclusion|_ao)(\.|_)/i,
			roughness: /(_roughness|_rough)(\.|_)/i,
			metallic: /(_metalness|_metallic|_metal)(\.|_)/i,
			arm: /(_arm)(\.|_)/i,
			emissive: /(_emissive|_emit)(\.|_)/i,
			opacity: /(_opacity)(\.|_)/i,
			displacement: /(_displacement|_disp)(\.|_)/i,
		};

		const textures: Record<string, string> = {};
		for (const f of files) {
			for (const [key, regex] of Object.entries(patterns)) {
				if (regex.test(f)) {
					if (!textures[key] || f.length < textures[key].length) {
						textures[key] = f;
					}
				}
			}
		}
		return textures;
	}

	private async _packNormalParallax(assetDir: string, normalFile: string, displacementFile: string, assetName: string): Promise<string> {
		const normalPath = join(assetDir, normalFile);
		const meta = await sharp(normalPath).metadata();
		const width = meta.width!;
		const height = meta.height!;

		const displacementBuffer = await sharp(join(assetDir, displacementFile)).resize(width, height).grayscale().toBuffer();

		const parallaxFileName = `${assetName}_NormalParallax.png`;
		const parallaxPath = join(assetDir, parallaxFileName);

		await sharp(normalPath).resize(width, height).joinChannel([displacementBuffer]).png().toFile(parallaxPath);

		return parallaxFileName;
	}

	private async _packORM(assetDir: string, textures: Record<string, string>, assetName: string): Promise<string> {
		const reference = textures.roughness || textures.ao || textures.metallic!;
		const meta = await sharp(join(assetDir, reference)).metadata();
		const width = meta.width!;
		const height = meta.height!;

		const getSingleChannelBuffer = async (path: string | undefined, fallback: number) => {
			if (path) {
				return await sharp(join(assetDir, path)).resize(width, height).grayscale().png().toBuffer();
			}
			const rawBuffer = Buffer.alloc(width * height, fallback);
			return await sharp(rawBuffer, { raw: { width, height, channels: 1 } })
				.png()
				.toBuffer();
		};

		const [rBuffer, gBuffer, bBuffer] = await Promise.all([
			getSingleChannelBuffer(textures.ao, 255),
			getSingleChannelBuffer(textures.roughness, 255),
			getSingleChannelBuffer(textures.metallic, 0),
		]);

		const ormFileName = `${assetName}_ORM.png`;
		const ormPath = join(assetDir, ormFileName).replace(/\\/g, "/");

		await sharp(rBuffer).joinChannel([gBuffer, bBuffer]).png().toFile(ormPath);

		return ormFileName;
	}

	private async _convertToMaterial(assetDir: string, asset: IMarketplaceAsset, editor: Editor): Promise<void> {
		try {
			const files = await this._getFilesRecursive(assetDir);
			const textures = this._parseTextures(files);

			if (textures.albedo || textures.normal) {
				this._downloadListeners.forEach((l) =>
					l(asset.id, {
						extraStatus: "Converting to Material...",
					})
				);
				const material = new PBRMaterial(asset.name, editor.layout.preview.scene);
				material.id = Tools.RandomId();
				material.uniqueId = UniqueNumber.Get();

				if (textures.albedo) {
					material.albedoTexture = this._loadTexture(textures.albedo, assetDir, editor);
					material.albedoTexture.gammaSpace = true;
				}
				if (textures.normal) {
					if (textures.displacement) {
						try {
							const parallaxFileName = await this._packNormalParallax(assetDir, textures.normal, textures.displacement, asset.name);
							const tex = this._loadTexture(parallaxFileName, assetDir, editor);
							tex.gammaSpace = false;
							material.bumpTexture = tex;
							material.useParallax = true;
							material.useParallaxOcclusion = true;
							material.parallaxScaleBias = 0.02;
							material.forceNormalForward = true;
						} catch (e) {
							console.warn(`[Marketplace] Failed to pack Parallax Normal map: ${e}`);
							material.bumpTexture = this._loadTexture(textures.normal, assetDir, editor);
							material.bumpTexture.gammaSpace = false;
						}
					} else {
						material.bumpTexture = this._loadTexture(textures.normal, assetDir, editor);
						material.bumpTexture.gammaSpace = false;
					}

					if (textures.normal.match(/dx/i)) {
						material.invertNormalMapY = true;
					}
				}

				if (textures.emissive) {
					material.emissiveTexture = this._loadTexture(textures.emissive, assetDir, editor);
					material.emissiveTexture.gammaSpace = true;
				}
				if (textures.opacity) {
					material.opacityTexture = this._loadTexture(textures.opacity, assetDir, editor);
					material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
					material.useAlphaFromAlbedoTexture = false;
				}

				if (textures.ao && !textures.roughness && !textures.metallic) {
					material.ambientTexture = this._loadTexture(textures.ao, assetDir, editor);
				}

				if (textures.arm) {
					const tex = this._loadTexture(textures.arm, assetDir, editor);
					tex.gammaSpace = false;
					material.metallicTexture = tex;
					material.useAmbientOcclusionFromMetallicTextureRed = true;
					material.useRoughnessFromMetallicTextureGreen = true;
					material.useMetallnessFromMetallicTextureBlue = true;
				} else if (textures.ao && textures.roughness) {
					try {
						const ormFileName = await this._packORM(assetDir, textures, asset.name);
						const tex = this._loadTexture(ormFileName, assetDir, editor);
						tex.gammaSpace = false;
						material.metallicTexture = tex;
						material.useAmbientOcclusionFromMetallicTextureRed = true;
						material.useRoughnessFromMetallicTextureGreen = true;
						material.useMetallnessFromMetallicTextureBlue = true;
					} catch (e) {
						console.warn(`[Marketplace] Failed to pack ORM texture: ${e}`);
					}
				} else if (textures.metallic) {
					const tex = this._loadTexture(textures.metallic, assetDir, editor);
					tex.gammaSpace = false;
					material.metallicTexture = tex;
				}

				const data = material.serialize();
				const materialPath = join(assetDir, `${asset.name}.material`);
				await writeJSON(materialPath, data, { spaces: "\t", encoding: "utf-8" });

				material.dispose();
				editor.layout.assets.refresh();
			}
		} catch (e) {
			console.warn(`[Marketplace] Failed to auto-create material: ${e}`);
		}
	}
}
