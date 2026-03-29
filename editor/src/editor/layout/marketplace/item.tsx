import { Tooltip } from "@blueprintjs/core";
import { IMarketplaceAsset } from "../../../tools/marketplaces/types";

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
				className={`
					group flex flex-col gap-2 w-[160px] h-[160px] p-2 cursor-pointer rounded-lg
					${props.isSelected ? "bg-primary/20 border-primary/30 shadow-inner" : "hover:bg-secondary"}
					transition-all duration-300 ease-in-out
				`}
			>
				<div className="relative w-full aspect-square overflow-hidden rounded-lg group-hover:border-primary/50 transition-colors">
					<img src={props.asset.thumbnailUrl} alt={props.asset.name} className="w-full h-full object-contain rounded-lg transition-all ease-in-out duration-300" />
				</div>
				<div className="select-none text-center w-full text-[13px] font-medium text-ellipsis overflow-hidden whitespace-nowrap opacity-90 group-hover:opacity-100 transition-opacity">
					{props.asset.name}
				</div>
			</div>
		</Tooltip>
	);
};
