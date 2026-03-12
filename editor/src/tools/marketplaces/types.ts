export interface IDownloadOptions {
	[quality: string]: {
		[fileType: string]: {
			include: {
				[path: string]: {
					size: number;
					url: string;
					md5: string;
				};
			};
			size: number;
			url: string;
			md5: string;
			extension?: string;
		};
	};
}

export interface IMarketplaceAsset {
	id: string;
	name: string;
	thumbnailUrl: string;
	description?: string;
	author?: string;
	license?: string;
	tags?: string[];
	marketplaceUrl?: string;
	marketplaceActionLabel?: string;
	isDownloadable?: boolean;
	downloadOptions?: IDownloadOptions;
}

export interface IMarketplaceSearchResult {
	assets: IMarketplaceAsset[];
	totalCount?: number;
	nextPageToken?: string;
}

export type MarketplaceFilterValue = string | number | boolean | string[];

export interface IMarketplaceFilterOption {
	label: string;
	value: string;
}

export interface IMarketplaceFilterDefinition {
	id: string;
	label: string;
	type: "boolean" | "select" | "multi-select" | "number" | "text";
	options?: IMarketplaceFilterOption[];
	defaultValue?: MarketplaceFilterValue;
	placeholder?: string;
	min?: number;
	max?: number;
	step?: number;
}

export interface IMarketplaceSearchFilters {
	[id: string]: MarketplaceFilterValue | undefined;
}

export interface IFileToDownload {
	url: string;
	path: string;
	size?: number;
	md5?: string;
	extract?: boolean;
}

export interface IMarketplaceProgress {
	progress: number;
	loaded: number;
	total: number;
	speed: number;
	extracting?: boolean;
}

export interface IMarketplaceOAuth {
	authorizeUrl: string;
	redirectUrl: string;
	onRedirect(url: string): Promise<void>;
}

export interface IMarketplaceSettings {}
