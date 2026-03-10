import { IMarketplaceAsset, MarketplaceProvider, IMarketplaceSearchResult, IMarketplaceFilterDefinition, IMarketplaceSearchFilters } from "../../project/marketplaces";

export class PolyHavenProvider extends MarketplaceProvider {
	public id = "polyhaven";
	public title = "Poly Haven";

	private _apiUrl = "https://api.polyhaven.com";

	public getSearchFilters(): IMarketplaceFilterDefinition[] {
		return [
			{
				id: "assetType",
				label: "Asset Type",
				type: "select",
				options: [
					{ label: "Models", value: "models" },
					{ label: "Textures", value: "textures" },
					{ label: "HDRIs", value: "hdris" },
				],
				defaultValue: "models",
			},
		];
	}

	public async search(query: string, pageToken?: string, filters?: IMarketplaceSearchFilters): Promise<IMarketplaceSearchResult> {
		const assetType = typeof filters?.assetType === "string" && filters.assetType ? filters.assetType : "models";
		const response = await fetch(`${this._apiUrl}/assets?t=${encodeURIComponent(assetType)}`);
		const data = await response.json();

		const assets: IMarketplaceSearchResult["assets"] = [];
		const lowerQuery = query.toLowerCase();

		for (const id in data) {
			if (Object.prototype.hasOwnProperty.call(data, id)) {
				const assetData = data[id];
				if (!query || assetData.name.toLowerCase().includes(lowerQuery) || (assetData.tags && assetData.tags.some((t) => t.toLowerCase().includes(lowerQuery)))) {
					assets.push({
						id,
						name: assetData.name,
						thumbnailUrl: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png`,
						tags: assetData.tags,
						author: assetData.authors ? Object.keys(assetData.authors).join(", ") : undefined,
					});
				}
			}
		}

		const limit = 20;
		const offset = pageToken ? parseInt(pageToken) : 0;
		const pagedAssets = assets.slice(offset, offset + limit);

		return {
			assets: pagedAssets,
			totalCount: assets.length,
			nextPageToken: offset + limit < assets.length ? (offset + limit).toString() : undefined,
		};
	}

	public async getAssetDetails(id: string): Promise<IMarketplaceAsset> {
		const [infoResponse, filesResponse] = await Promise.all([fetch(`${this._apiUrl}/info/${id}`), fetch(`${this._apiUrl}/files/${id}`)]);

		const info = await infoResponse.json();
		const files = await filesResponse.json();

		const allowedTypes = ["gltf", "fbx", "blend"];

		const fileTypes = Object.keys(files).filter((t) => allowedTypes.includes(t.toLowerCase()));

		const qualityOptions = Object.keys(files.gltf ?? {});

		const fileData = qualityOptions.reduce((acc, q) => {
			acc[q] = fileTypes.reduce((typeAcc, t) => {
				const entry = files?.[t]?.[q]?.[t];
				if (entry) {
					typeAcc[t] = entry;
				}
				return typeAcc;
			}, {});
			return acc;
		}, {});

		return {
			id,
			name: info.name,
			thumbnailUrl: `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png`,
			description: info.description || `A beautiful 3D model: ${info.name}`,
			author: info.authors ? Object.keys(info.authors).join(", ") : "Unknown",
			license: "CC0",
			tags: info.tags,
			downloadOptions: fileData,
		};
	}

	protected getFilesToDownload(asset: IMarketplaceAsset, selectedQuality: string, selectedType: string) {
		const downloadData = asset.downloadOptions?.[selectedQuality]?.[selectedType];
		if (!downloadData) {
			return [];
		}

		const filesToDownload = [
			{
				url: downloadData.url,
				md5: downloadData.md5,
				size: downloadData.size,
				path: `${asset.id}.${selectedType}`,
			},
			...Object.entries(downloadData.include || {}).map(([path, data]) => ({
				url: data.url,
				md5: data.md5,
				size: data.size,
				path: path,
			})),
		];

		return filesToDownload;
	}
}
