import { Grid } from "react-loader-spinner";
import { IMarketplaceAsset } from "../../../tools/marketplaces/types";
import { MarketplaceItem } from "./item";

export interface IMarketplaceGridProps {
	assets: IMarketplaceAsset[];
	loading: boolean;
	query: string;
	selectedAsset: IMarketplaceAsset | null;
	onAssetClick: (asset: IMarketplaceAsset) => void;
}

export const MarketplaceGrid = (props: IMarketplaceGridProps) => {
	return (
		<div
			className="relative grid gap-6 justify-left w-full h-full p-6 overflow-y-auto pb-10"
			style={{
				gridTemplateColumns: "repeat(auto-fill, 160px)",
				gridTemplateRows: "repeat(auto-fill, 160px)",
			}}
		>
			{props.loading && (
				<div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
					<Grid width={24} height={24} color="gray" />
				</div>
			)}
			{props.assets.length === 0 && !props.loading && (
				<div className="absolute inset-0 flex items-center justify-center text-muted-foreground italic text-sm">Try searching for something (e.g., "wood", "stone").</div>
			)}
			{props.assets.map((asset) => (
				<MarketplaceItem key={asset.id} asset={asset} isSelected={props.selectedAsset?.id === asset.id} onClick={() => props.onAssetClick(asset)} />
			))}
		</div>
	);
};
