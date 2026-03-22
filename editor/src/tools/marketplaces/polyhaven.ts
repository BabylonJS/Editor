import { IMarketplaceAsset, IMarketplaceSearchResult, IMarketplaceFilterDefinition, IMarketplaceSearchFilters } from "./types";
import { MarketplaceProvider } from "./provider";

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

		const allowedTypes = new Set(["gltf", "fbx", "blend", "hdri"]);
		const qualityOptions = ["1k", "2k", "4k", "8k"];

		const fileData: Record<string, any> = {};

		for (const type in files) {
			if (!Object.hasOwn(files, type)) {
				continue;
			}
			if (!allowedTypes.has(type.toLowerCase())) {
				continue;
			}

			const typeFiles = files[type];

			for (const q of qualityOptions) {
				const qFiles = typeFiles?.[q];
				if (!qFiles) {
					continue;
				}

				const target = (fileData[q] ??= {});

				for (const subType in qFiles) {
					if (!Object.hasOwn(qFiles, subType)) {
						continue;
					}
					target[subType] = qFiles[subType];
				}
			}
		}

		const textureMaps = ["diffuse", "nor_gl", "nor_dx", "rough", "ao", "arm", "rough_ao", "displacement", "emissive", "opacity"];
		const isTextureAsset = Object.keys(files).some((type) => textureMaps.includes(type.toLowerCase()));

		if (isTextureAsset) {
			const formats = ["jpg", "png"];
			for (const format of formats) {
				for (const q of qualityOptions) {
					const includeFiles: Record<string, any> = {};
					let hasFiles = false;

					for (const type in files) {
						if (textureMaps.includes(type.toLowerCase())) {
							const fileFormatData = files[type]?.[q]?.[format];
							if (fileFormatData) {
								includeFiles[type.toLowerCase()] = fileFormatData;
								hasFiles = true;
							}
						}
					}

					if (hasFiles) {
						const target = (fileData[q] ??= {});
						const typeLabel = `${format.toUpperCase()} Textures`;
						target[typeLabel] = {
							url: "",
							include: includeFiles,
						};
					}
				}
			}
		}

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

		if (selectedType.endsWith(" Textures")) {
			return Object.entries(downloadData.include || {}).map(([type, data]: [string, any]) => {
				const ext = data.url.split(".").pop();
				return {
					url: data.url,
					md5: data.md5,
					size: data.size,
					path: `${asset.name}_${type}.${ext}`,
				};
			});
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
