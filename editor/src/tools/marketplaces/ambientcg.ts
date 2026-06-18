import axios from "axios";
import { IMarketplaceAsset, IMarketplaceSearchResult, IFileToDownload, IMarketplaceSearchFilters, IMarketplaceFilterDefinition } from "./types";
import { MarketplaceProvider } from "./provider";

export class AmbientCGProvider extends MarketplaceProvider {
	public id = "ambientcg";
	public title = "ambientCG";

	private readonly _baseUrl = "https://ambientcg.com/api/af";
	private _assetCache: Map<string, any> = new Map();

	public getSearchFilters(): IMarketplaceFilterDefinition[] {
		return [
			{
				id: "type",
				label: "Asset Type",
				type: "select",
				options: [
					{ label: "Any", value: "" },
					{ label: "Material", value: "Material" },
					{ label: "HDRI", value: "HDRI" },
					{ label: "3D Model", value: "3DModel" },
					{ label: "Decal", value: "Decal" },
				],
				defaultValue: "",
			},
		];
	}

	public async search(query: string, pageToken?: string, filters?: IMarketplaceSearchFilters): Promise<IMarketplaceSearchResult> {
		const offset = pageToken ? parseInt(pageToken) : 0;
		const limit = 100;
		const type = typeof filters?.type === "string" ? filters.type : "";

		const response = await axios.get(`${this._baseUrl}/asset_list`, {
			params: {
				q: query,
				offset,
				...(type ? { type } : {}),
			},
		});

		const data = response.data;
		const hasMore = data.assets.length === limit;
		const assets: IMarketplaceAsset[] = data.assets.map((asset: any) => {
			this._assetCache.set(asset.id, asset.data);

			return {
				id: asset.id,
				name: asset.data.text.title,
				thumbnailUrl: asset.data.preview_image_thumbnail.uris["256"] || asset.data.preview_image_thumbnail.uris["0"],
				description: asset.data.text.description,
				author: "ambientCG",
				license: "CC0",
			};
		});

		return {
			assets,
			totalCount: hasMore ? undefined : offset + assets.length,
			nextPageToken: data.assets.length === limit ? (offset + limit).toString() : undefined,
		};
	}

	public async getAssetDetails(id: string): Promise<IMarketplaceAsset> {
		let assetData = this._assetCache.get(id);

		if (!assetData) {
			const response = await axios.get(`${this._baseUrl}/asset_list`, {
				params: { q: id },
			});
			const found = response.data.assets?.find((a: any) => a.id === id);
			if (found) {
				assetData = found.data;
				this._assetCache.set(id, assetData);
			}
		}

		if (!assetData) {
			throw new Error(`Asset not found: ${id}`);
		}

		const details: IMarketplaceAsset = {
			id: id,
			name: assetData.text.title,
			thumbnailUrl: assetData.preview_image_thumbnail.uris["512"] || assetData.preview_image_thumbnail.uris["0"],
			description: assetData.text.description,
			author: "ambientCG",
			license: "CC0",
			downloadOptions: {},
		};

		const attributeParam = assetData.implementation_list_query.parameters.find((p: any) => p.id === "attribute");
		if (attributeParam && attributeParam.choices) {
			const fetchPromises = attributeParam.choices.map(async (choice: any) => {
				const attr = choice.value;
				const implResponse = await axios.get(`${this._baseUrl}/implementation_list`, {
					params: {
						id: id,
						attribute: attr,
					},
				});

				let quality = "Default";
				let fileType = "ZIP";

				if (attr.includes("-")) {
					const parts = attr.split("-");
					quality = parts[0];
					fileType = parts[1];
				} else {
					quality = attr;
				}

				const impl = implResponse.data.implementations.find((i: any) => i.id.endsWith("_LOOSE") || i.id.includes("ZIP") || i.id.includes("EXR") || i.id.includes("USDZ"));

				if (impl && impl.components && impl.components[0]) {
					const component = impl.components[0];
					if (!details.downloadOptions![quality]) {
						details.downloadOptions![quality] = {};
					}
					details.downloadOptions![quality][fileType] = {
						url: component.data["fetch.download"].download_query.uri,
						size: component.data.store.bytes,
						md5: "",
						include: {},
						extension: component.data.format.extension,
					};
				}
			});

			await Promise.all(fetchPromises);
		}

		return details;
	}

	protected getFilesToDownload(asset: IMarketplaceAsset, selectedQuality: string, selectedType: string): IFileToDownload[] {
		const option = asset.downloadOptions?.[selectedQuality]?.[selectedType];
		if (!option) {
			return [];
		}

		const extension = option.extension || (selectedType === "USDZ" ? ".usdz" : ".zip");
		const isZip = extension.toLowerCase() === ".zip";

		return [
			{
				url: option.url,
				path: `${asset.id}_${selectedQuality}_${selectedType}${extension}`,
				size: option.size,
				extract: isZip,
			},
		];
	}
}
