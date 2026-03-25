import { useState } from "react";
import { Fade } from "react-awesome-reveal";

import { Grid } from "react-loader-spinner";

import { Badge } from "../../../ui/shadcn/ui/badge";
import { Button } from "../../../ui/shadcn/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/shadcn/ui/select";

import { IMarketplaceAsset } from "../../../tools/marketplaces/types";

export interface IMarketplaceSidebarProps {
	asset?: IMarketplaceAsset;
	detailsLoading: boolean;
	selectedQuality?: string;
	selectedType?: string;
	showLoginAction?: boolean;
	loginActionLabel?: string;
	isDownloading: boolean;
	assetPath?: string;
	onQualityChange: (quality: string) => void;
	onTypeChange: (type: string) => void;
	onImport: (type?: string) => void;
	onOpenMarketplaceUrl: (url: string) => void;
	onOpenSettings: () => void;
	onLogin?: () => void;
	openAssetFolder: () => void;
}

export function MarketplaceSidebar(props: IMarketplaceSidebarProps) {
	const canImport = !!props.selectedQuality && !!props.selectedType;
	const hasDownloadOptions = !!Object.keys(props.asset?.downloadOptions || {}).length;

	const [imageOpacity, setImageOpacity] = useState(0);

	if (props.detailsLoading) {
		return (
			<div className="flex-1 flex justify-center items-center p-8">
				<Grid width={24} height={24} color="gray" />
			</div>
		);
	}

	if (!props.asset) {
		return null;
	}

	return (
		<Fade>
			<div className="flex flex-1 flex-col gap-4 overflow-hidden">
				<div>
					<div className="flex gap-2 justify-center items-center text-xl font-bold">{props.asset.name}</div>
				</div>

				<div className="w-full h-[350px] min-h-[350px] rounded-lg bg-black/5">
					<img
						alt={props.asset.name}
						src={props.asset.thumbnailUrl}
						onLoad={() => setImageOpacity(1)}
						style={{
							opacity: imageOpacity,
						}}
						className="w-full h-full object-contain p-2 transition-opacity ease-in-out duration-200"
					/>
				</div>

				<div className="flex-1 flex flex-col gap-2 bg-secondary dark:bg-secondary/35 p-2 rounded-lg">
					{hasDownloadOptions && (
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-2">
								<div className="flex flex-col gap-1 w-full">
									<span className="text-xs uppercase font-bold text-muted-foreground tracking-widest px-2">Quality</span>
									<Select disabled={props.isDownloading} value={props.selectedQuality} onValueChange={props.onQualityChange}>
										<SelectTrigger className="w-full text-xs bg-background/50 border-border/50 hover:bg-background transition-colors">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.keys(props.asset.downloadOptions || {}).map((opt) => (
												<SelectItem key={opt} value={opt}>
													{opt.toUpperCase()}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="flex flex-col gap-1 w-full">
									<span className="text-xs uppercase font-bold text-muted-foreground tracking-widest px-2">Format</span>
									<Select disabled={props.isDownloading || !canImport} value={props.selectedType} onValueChange={props.onTypeChange}>
										<SelectTrigger className="w-full text-xs bg-background/50 border-border/50 hover:bg-background transition-colors">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.keys(props.asset.downloadOptions?.[props.selectedQuality!] || {}).map((opt) => (
												<SelectItem key={opt} value={opt}>
													{opt.toUpperCase()}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							{props.isDownloading ? (
								<Button disabled variant="ghost" className="flex gap-2 items-center w-full shadow-lg font-bold uppercase tracking-wider mt-2">
									<Grid width={16} height={16} color="gray" /> Importing...
								</Button>
							) : (
								<div className="flex gap-2 mt-2">
									<Button
										className="w-full shadow-lg font-bold uppercase tracking-wider"
										onClick={() => props.onImport()}
										disabled={props.isDownloading || !canImport}
									>
										Import Asset
									</Button>
									{["hdr", "exr"].includes(props.selectedType || "") && (
										<Button
											className="w-full shadow-lg font-bold uppercase tracking-wider"
											onClick={() => props.onImport("env")}
											disabled={props.isDownloading || !canImport}
										>
											Import as Env
										</Button>
									)}
								</div>
							)}
						</div>
					)}

					{!hasDownloadOptions && props.asset.marketplaceUrl && (
						<div className="flex gap-2 bg-secondary dark:bg-secondary/35 p-2 rounded-lg">
							<Button
								variant="outline"
								className="w-full shadow-lg font-bold uppercase tracking-wider"
								onClick={() => props.onOpenMarketplaceUrl(props.asset!.marketplaceUrl!)}
							>
								{props.asset.marketplaceActionLabel || (props.asset.isDownloadable === false ? "View / Buy" : "Open In Marketplace")}
							</Button>

							{props.showLoginAction && (
								<Button className="w-full shadow-lg font-bold uppercase tracking-wider" onClick={props.onLogin ?? props.onOpenSettings}>
									{props.loginActionLabel || "Login"}
								</Button>
							)}
						</div>
					)}

					{props.assetPath && (
						<div className="flex gap-2">
							<Button className="w-full shadow-lg font-bold uppercase tracking-wider" variant="secondary" onClick={props.openAssetFolder}>
								Open Folder
							</Button>
						</div>
					)}
				</div>

				<div className="flex-1 flex flex-col gap-4 bg-secondary dark:bg-secondary/35 p-2 rounded-lg">
					<div className="flex flex-col gap-4 text-sm">
						{props.asset.author && (
							<div className="flex flex-col">
								<span className="text-[11px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Author</span>
								<span className="font-semibold text-primary/90">{props.asset.author}</span>
							</div>
						)}

						{props.asset.license && (
							<div className="flex flex-col">
								<span className="text-[11px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">License</span>
								<Badge variant="outline" className="w-fit text-[11px] py-0 font-medium">
									{props.asset.license}
								</Badge>
							</div>
						)}

						{props.asset.description && (
							<div className="flex flex-col">
								<span className="text-[11px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Description</span>
								<p className="text-muted-foreground leading-relaxed text-[13px]">{props.asset.description}</p>
							</div>
						)}

						{props.asset.tags?.length && (
							<div className="flex flex-col">
								<span className="text-[11px] uppercase font-bold text-muted-foreground tracking-widest mb-1.5">Tags</span>
								<div className="flex flex-wrap gap-1.5">
									{props.asset.tags?.map((tag) => (
										<Badge key={tag} variant="secondary" className="text-[11px] py-0 px-2 bg-muted/60">
											{tag}
										</Badge>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</Fade>
	);
}
