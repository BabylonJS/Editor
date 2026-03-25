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
		<div className="flex gap-2 justify-between items-center px-4 w-full h-10 min-h-10 bg-primary-foreground text-xs tracking-widest">
			<div className="flex items-center gap-4">
				<span>
					{props.assetsCount} results on page {props.currentPage}
				</span>
				<span className="opacity-50">|</span>
				<span>Total: {props.totalCount === undefined ? "Unknown" : props.totalCount}</span>
			</div>
			<div className="flex items-center gap-2">
				<Button variant="ghost" onClick={() => props.onPrevious()} disabled={!props.hasPrevious || props.loading} className="h-8 text-xs">
					Previous
				</Button>
				<Button variant="ghost" className="h-8 text-xs" onClick={() => props.onNext()} disabled={!props.hasNext || props.loading}>
					Next
				</Button>
			</div>
		</div>
	);
}
