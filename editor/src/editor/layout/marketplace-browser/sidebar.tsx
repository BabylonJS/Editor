import { Grid } from "react-loader-spinner";
import { IMarketplaceAsset } from "../../../tools/marketplaces/types";
import { Button } from "../../../ui/shadcn/ui/button";
import { Badge } from "../../../ui/shadcn/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/shadcn/ui/select";

export interface IMarketplaceSidebarProps {
	asset?: IMarketplaceAsset;
	detailsLoading: boolean;
	selectedQuality?: string;
	selectedType?: string;
	showLoginAction?: boolean;
	loginActionLabel?: string;
	isDownloading: boolean;
	onQualityChange: (quality: string) => void;
	onTypeChange: (type: string) => void;
	onImport: (type?: string) => void;
	onOpenMarketplaceUrl: (url: string) => void;
	onOpenSettings: () => void;
	onLogin?: () => void;
}

export const MarketplaceSidebar = (props: IMarketplaceSidebarProps) => {
	const canImport = !!props.selectedQuality && !!props.selectedType;
	const hasDownloadOptions = !!Object.keys(props.asset?.downloadOptions || {}).length;

	if (props.detailsLoading) {
		return (
			<div className="flex-1 flex items-center justify-center p-8">
				<Grid width={24} height={24} color="gray" />
			</div>
		);
	}

	if (!props.asset) {
		return null;
	}

	return (
		<div className="flex-1 flex flex-col overflow-hidden">
			<div className="flex justify-between items-start gap-2 p-4 border-b border-border bg-background/50 sticky top-0 z-10 backdrop-blur-sm">
				<h3 className="font-bold text-lg leading-tight truncate pr-2">{props.asset.name}</h3>
			</div>

			<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
				{hasDownloadOptions && (
					<div>
						<div className="flex flex-row gap-1.5">
							<Select disabled={props.isDownloading} value={props.selectedQuality} onValueChange={props.onQualityChange}>
								<SelectTrigger className="w-full text-[12px] h-9 bg-background/50 border-border/50 hover:bg-background transition-colors">
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
							<Select disabled={props.isDownloading || !canImport} value={props.selectedType} onValueChange={props.onTypeChange}>
								<SelectTrigger className="w-full text-[12px] h-9 bg-background/50 border-border/50 hover:bg-background transition-colors">
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
						{props.isDownloading ? (
							<Button disabled variant="ghost" className="mt-2 w-full shadow-lg font-bold uppercase tracking-wider">
								Importing...
							</Button>
						) : (
							<div className="flex flex-row gap-1.5 mt-2">
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
					<div className="flex flex-row gap-1.5">
						<Button
							className="w-full shadow-lg font-bold uppercase tracking-wider"
							variant="outline"
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
				<div className="w-full h-[350px] min-h-[350px] rounded-lg overflow-hidden border border-border bg-black/5 shadow-sm">
					<img src={props.asset.thumbnailUrl} className="w-full h-full object-contain p-2" alt={props.asset.name} />
				</div>

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

					{props.asset.tags && props.asset.tags.length > 0 && (
						<div className="flex flex-col">
							<span className="text-[11px] uppercase font-bold text-muted-foreground tracking-widest mb-1.5">Tags</span>
							<div className="flex flex-wrap gap-1.5">
								{props.asset.tags.map((tag) => (
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
	);
};
