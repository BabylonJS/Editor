import { Tooltip } from "@blueprintjs/core";
import { IMarketplaceAsset } from "../../../project/marketplaces";

export interface IMarketplaceItemProps {
	asset: IMarketplaceAsset;
	isSelected: boolean;
	onClick: () => void;
}

export const MarketplaceItem = (props: IMarketplaceItemProps) => {
	return (
		<Tooltip key={props.asset.id} position="bottom" content={props.asset.author || props.asset.name}>
			<div
				onClick={(ev) => {
					ev.stopPropagation();
					props.onClick();
				}}
				className={`flex flex-col gap-3 w-[160px] h-[160px] py-1 px-1 cursor-pointer rounded-lg transition-all duration-300 ease-in-out group ${props.isSelected ? "bg-primary/20 border-primary/30 shadow-inner" : "hover:bg-secondary"}`}
			>
				<div className="relative w-full aspect-square overflow-hidden rounded-md group-hover:border-primary/50 transition-colors shadow-sm">
					<img src={props.asset.thumbnailUrl} alt={props.asset.name} className="w-full h-full object-contain transition-transform duration-500" />
				</div>
				<div className="select-none text-center w-full text-[13px] font-medium text-ellipsis overflow-hidden whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
					{props.asset.name}
				</div>
			</div>
		</Tooltip>
	);
};
