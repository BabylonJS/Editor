import { Button } from "../../../ui/shadcn/ui/button";

export interface IMarketplaceFooterProps {
	assetsCount: number;
	currentPage: number;
	totalCount?: number;
	loading: boolean;
	hasPrevious: boolean;
	hasNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
}

export function MarketplaceFooter(props: IMarketplaceFooterProps) {
	if (props.assetsCount <= 0) {
		return null;
	}

	return (
		<div className="flex justify-between items-center px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground border-t border-border bg-primary-foreground/30 shadow-inner">
			<div className="flex items-center gap-4">
				<span>
					{props.assetsCount} results on page {props.currentPage}
				</span>
				<span className="opacity-50">|</span>
				<span>Total: {props.totalCount === undefined ? "Unknown" : props.totalCount}</span>
			</div>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					className="h-6 px-2 text-[9px] uppercase font-black"
					onClick={() => props.onPrevious()}
					disabled={!props.hasPrevious || props.loading}
				>
					Previous
				</Button>
				<Button variant="outline" size="sm" className="h-6 px-2 text-[9px] uppercase font-black" onClick={() => props.onNext()} disabled={!props.hasNext || props.loading}>
					Next
				</Button>
			</div>
		</div>
	);
}
