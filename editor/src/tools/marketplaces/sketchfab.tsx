import axios from "axios";
import { ipcRenderer } from "electron";
import {
	IMarketplaceAsset,
	MarketplaceProvider,
	IMarketplaceSearchResult,
	IFileToDownload,
	IMarketplaceSettings,
	IMarketplaceSearchFilters,
	IMarketplaceFilterDefinition,
} from "../../project/marketplaces";
import { SketchfabProviderSettings } from "./sketchfab/settings";
import { ReactNode } from "react";

export interface ISketchfabSettings extends IMarketplaceSettings {
	token: string;
}

export class SketchfabProvider extends MarketplaceProvider {
	public id = "sketchfab";
	public title = "Sketchfab";

	private readonly _baseUrl = "https://api.sketchfab.com/v3";
	private readonly _oauthCallbackUrl = this._resolveOAuthCallbackUrl();
	private _pendingOAuthState: string | null = null;

	protected _settings: ISketchfabSettings = this.getSettings();

	public renderSettings(): ReactNode {
		return <SketchfabProviderSettings handleOAuthLogin={this._handleOAuthLogin.bind(this)} onSettingChanged={this.onSettingChanged.bind(this)} settings={this._settings} />;
	}

	public getOAuth() {
		const clientId = process.env.SKETCHFAB_CLIENT_ID ?? "";

		return {
			authorizeUrl: `https://sketchfab.com/oauth2/authorize/?state=${encodeURIComponent(this._pendingOAuthState ?? "")}&response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(this._oauthCallbackUrl)}`,
			redirectUrl: "babylonjs-editor://oauth",
			onRedirect: async (url: string) => {
				const hash = url.split("#")[1];
				if (!hash) {
					this._pendingOAuthState = null;
					throw new Error("Invalid OAuth callback: missing hash payload.");
				}

				const params = new URLSearchParams(hash);
				const error = params.get("error");
				if (error) {
					const description = params.get("error_description") ?? "OAuth authorization failed.";
					this._pendingOAuthState = null;
					throw new Error(`Sketchfab OAuth failed: ${description}`);
				}

				const callbackState = params.get("state");
				if (!this._pendingOAuthState || callbackState !== this._pendingOAuthState) {
					this._pendingOAuthState = null;
					throw new Error("Sketchfab OAuth failed: invalid state.");
				}

				const token = params.get("access_token");
				if (!token) {
					this._pendingOAuthState = null;
					throw new Error("Sketchfab OAuth failed: missing access token.");
				}

				this.onSettingChanged("token", token);
				this._pendingOAuthState = null;
			},
		};
	}

	public getSearchFilters(): IMarketplaceFilterDefinition[] {
		return [
			{
				id: "downloadable",
				label: "Downloadable",
				type: "boolean",
				defaultValue: false,
			},
			{
				id: "animated",
				label: "Animated",
				type: "boolean",
				defaultValue: false,
			},
			{
				id: "staffpicked",
				label: "Staff Picked",
				type: "boolean",
				defaultValue: false,
			},
			{
				id: "sortBy",
				label: "Sort By",
				type: "select",
				options: [
					{ label: "Relevance", value: "" },
					{ label: "Most Likes", value: "-likeCount" },
					{ label: "Most Views", value: "-viewCount" },
					{ label: "Newest", value: "-publishedAt" },
				],
				defaultValue: "",
			},
			{
				id: "minFaceCount",
				label: "Min Faces",
				type: "number",
				min: 0,
				step: 100,
			},
			{
				id: "maxFaceCount",
				label: "Max Faces",
				type: "number",
				min: 0,
				step: 100,
			},
			{
				id: "categories",
				label: "Categories",
				type: "multi-select",
				placeholder: "e.g. art-abstract, vehicles-cars",
			},
			{
				id: "tags",
				label: "Tags",
				type: "multi-select",
				placeholder: "e.g. game-ready, pbr",
			},
		];
	}

	public async search(query: string, pageToken?: string, filters?: IMarketplaceSearchFilters): Promise<IMarketplaceSearchResult> {
		const downloadable = filters?.downloadable === true;
		const animated = filters?.animated === true;
		const staffpicked = filters?.staffpicked === true;
		const sortBy = typeof filters?.sortBy === "string" ? filters.sortBy : "";
		const minFaceCount = typeof filters?.minFaceCount === "number" ? filters.minFaceCount : undefined;
		const maxFaceCount = typeof filters?.maxFaceCount === "number" ? filters.maxFaceCount : undefined;
		const categories = Array.isArray(filters?.categories) ? filters.categories : undefined;
		const tags = Array.isArray(filters?.tags) ? filters.tags : undefined;

		const response = await axios.get(`${this._baseUrl}/search`, {
			params: {
				type: "models",
				q: query,
				cursor: pageToken,
				...(downloadable ? { downloadable: true } : {}),
				...(animated ? { animated: true } : {}),
				...(staffpicked ? { staffpicked: true } : {}),
				...(sortBy ? { sort_by: sortBy } : {}),
				...(typeof minFaceCount === "number" ? { min_face_count: minFaceCount } : {}),
				...(typeof maxFaceCount === "number" ? { max_face_count: maxFaceCount } : {}),
				...(categories?.length ? { categories: categories.join(",") } : {}),
				...(tags?.length ? { tags: tags.join(",") } : {}),
			},
		});

		const data = response.data;
		const offset = pageToken ? Number.parseInt(pageToken, 10) || 0 : 0;
		const assets: IMarketplaceAsset[] = data.results.map((result: any) => {
			return {
				id: result.uid,
				name: result.name,
				thumbnailUrl: result.thumbnails.images[3]?.url || result.thumbnails.images[0]?.url,
				description: result.description,
				author: result.user.displayName,
				license: result.license?.label || "Unknown",
				tags: result.tags?.map((t: any) => t.name) || [],
				marketplaceUrl: result.viewerUrl,
				marketplaceActionLabel: result.isDownloadable === false ? "View / Buy" : "Open In Marketplace",
				isDownloadable: result.isDownloadable,
			};
		});

		return {
			assets,
			totalCount: data.cursors?.next ? undefined : offset + assets.length,
			nextPageToken: data.cursors.next,
		};
	}

	public async getAssetDetails(id: string): Promise<IMarketplaceAsset> {
		const response = await axios.get(`${this._baseUrl}/models/${id}`);
		const result = response.data;

		const details: IMarketplaceAsset = {
			id: id,
			name: result.name,
			thumbnailUrl: result.thumbnails.images[3]?.url || result.thumbnails.images[0]?.url,
			description: result.description,
			author: result.user.displayName,
			license: result.license?.label || "Unknown",
			tags: result.tags?.map((t: any) => t.name) || [],
			marketplaceUrl: result.viewerUrl,
			marketplaceActionLabel: result.isDownloadable === false ? "View / Buy" : "Open In Marketplace",
			isDownloadable: result.isDownloadable,
			downloadOptions: {},
		};

		if (this._settings.token) {
			try {
				const downloadResponse = await axios.get(`${this._baseUrl}/models/${id}/download`, {
					headers: {
						Authorization: `Bearer ${this._settings.token}`,
					},
				});

				const downloads = downloadResponse.data;
				if (downloads.gltf) {
					details.downloadOptions!["Default"] = details.downloadOptions!["Default"] || {};
					details.downloadOptions!["Default"]["gltf"] = {
						url: downloads.gltf.url,
						size: downloads.gltf.size,
						md5: "",
						include: {},
						extension: ".zip",
					};
				}
				if (downloads.usdz) {
					details.downloadOptions!["Default"] = details.downloadOptions!["Default"] || {};
					details.downloadOptions!["Default"]["usdz"] = {
						url: downloads.usdz.url,
						size: downloads.usdz.size,
						md5: "",
						include: {},
						extension: ".usdz",
					};
				}
			} catch (e) {
				console.warn(`Failed to fetch download links for Sketchfab asset ${id}: ${e.message}`);
			}
		}

		return details;
	}

	protected getFilesToDownload(asset: IMarketplaceAsset, selectedQuality: string, selectedType: string): IFileToDownload[] {
		const option = asset.downloadOptions?.[selectedQuality]?.[selectedType];
		if (!option) {
			return [];
		}

		return [
			{
				url: option.url,
				path: `${asset.id}_${selectedQuality}_${selectedType}${option.extension}`,
				size: option.size,
				extract: option.extension === ".zip",
			},
		];
	}

	public isAuthenticated(): boolean {
		return !!this._settings.token;
	}

	private _handleOAuthLogin(): void {
		if (!process.env.SKETCHFAB_CLIENT_ID) {
			console.error("Sketchfab OAuth is not configured: missing SKETCHFAB_CLIENT_ID.");
			return;
		}

		this._pendingOAuthState = this._createOAuthState();
		const oauth = this.getOAuth();
		if (oauth) {
			ipcRenderer.send("app:start-oauth-server");
			ipcRenderer.send("app:open-url", oauth.authorizeUrl);
		}
	}

	private _createOAuthState(): string {
		const bytes = new Uint8Array(16);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (v) => v.toString(16).padStart(2, "0")).join("");
	}

	private _resolveOAuthCallbackUrl(): string {
		const baseUrl = (process.env.OAUTH_BASE_URL ?? "http://localhost:9542").replace(/\/+$/, "");
		return `${baseUrl}/sketchfab/callback`;
	}
}
