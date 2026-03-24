import { IoIosOptions } from "react-icons/io";
import { FaFilter, FaMagnifyingGlass, FaXmark } from "react-icons/fa6";

import { Label } from "../../../ui/shadcn/ui/label";
import { Input } from "../../../ui/shadcn/ui/input";
import { Switch } from "../../../ui/shadcn/ui/switch";
import { Button } from "../../../ui/shadcn/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/shadcn/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/shadcn/ui/select";

import { MarketplaceProvider } from "../../../tools/marketplaces/provider";
import { IMarketplaceFilterDefinition, IMarketplaceSearchFilters, MarketplaceFilterValue } from "../../../tools/marketplaces/types";

export interface IMarketplaceToolbarProps {
	query: string;
	filters: IMarketplaceSearchFilters;
	filterDefinitions: IMarketplaceFilterDefinition[];
	loading: boolean;
	providers: MarketplaceProvider[];
	selectedProvider: MarketplaceProvider;
	onQueryChange: (query: string) => void;
	onFiltersChange: (filters: IMarketplaceSearchFilters) => void;
	onResetFilters: () => void;
	onSearch: () => void;
	onProviderChange: (provider: MarketplaceProvider) => void;
	onSettingsClick: () => void;
}

export function MarketplaceToolbar(props: IMarketplaceToolbarProps) {
	const activeFilters = props.filterDefinitions.reduce((acc, definition) => {
		const value = props.filters[definition.id];
		if (isFilterActive(value, definition.defaultValue)) {
			return acc + 1;
		}

		return acc;
	}, 0);

	const updateFilter = (id: string, value: MarketplaceFilterValue | undefined) => {
		props.onFiltersChange({
			...props.filters,
			[id]: value,
		});
	};

	return (
		<div className="flex gap-2 justify-between w-full h-10 min-h-10 bg-primary-foreground px-2 items-center">
			<div className="relative flex flex-1 pr-1 group">
				<Input
					placeholder="Search marketplace..."
					value={props.query}
					onChange={(e) => props.onQueryChange(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && props.onSearch()}
					className={`
						w-full h-8 !border-none pl-7
						hover:border-border focus:border-border
						transition-all duration-300 ease-in-out    
					`}
				/>

				<div className="absolute top-1/2 -translate-y-1/2 left-2 flex items-center justify-center w-4 h-4">
					{props.query ? (
						<button onClick={() => props.onQueryChange("")} className="p-0.5 rounded-full hover:bg-muted opacity-50 hover:opacity-100 transition-all">
							<FaXmark className="w-3.5 h-3.5" />
						</button>
					) : (
						<FaMagnifyingGlass className="w-3.5 h-3.5 opacity-50" />
					)}
				</div>
			</div>

			{props.filterDefinitions.length > 0 && (
				<Popover>
					<PopoverTrigger asChild>
						<Button variant="ghost" className="h-8 px-2 gap-2 items-center">
							<FaFilter className="w-3.5 h-3.5" />
							Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end" className="flex flex-col gap-4 w-80 p-2">
						<div className="flex items-center justify-between pb-2">
							<div className="text-lg font-semibold">Search Filters</div>
							<Button variant="ghost" size="sm" className="h-8 px-2" onClick={props.onResetFilters}>
								Reset
							</Button>
						</div>

						<div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
							{props.filterDefinitions.map((definition) => {
								const value = props.filters[definition.id];
								const effectiveValue = value === undefined ? definition.defaultValue : value;

								if (definition.type === "boolean") {
									return (
										<div key={definition.id} className="flex items-center justify-between gap-3">
											<Label>{definition.label}</Label>
											<Switch checked={effectiveValue === true} onCheckedChange={(checked) => updateFilter(definition.id, checked)} />
										</div>
									);
								}

								if (definition.type === "select") {
									const current = typeof effectiveValue === "string" && effectiveValue ? effectiveValue : "__any";
									const options = (definition.options || []).filter((opt) => opt.value !== "");
									return (
										<div key={definition.id} className="flex flex-col gap-2">
											<Label>{definition.label}</Label>
											<Select value={current} onValueChange={(next) => updateFilter(definition.id, next === "__any" ? undefined : next)}>
												<SelectTrigger className="h-8">
													<SelectValue placeholder={definition.placeholder || "Any"} />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="__any">Any</SelectItem>
													{options.map((opt) => (
														<SelectItem key={opt.value} value={opt.value}>
															{opt.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									);
								}

								if (definition.type === "number") {
									const current = typeof effectiveValue === "number" ? String(effectiveValue) : "";
									return (
										<div key={definition.id} className="flex flex-col gap-1">
											<Label>{definition.label}</Label>
											<Input
												type="number"
												value={current}
												min={definition.min}
												max={definition.max}
												step={definition.step}
												onChange={(e) => {
													const next = e.target.value;
													updateFilter(definition.id, next === "" ? undefined : Number(next));
												}}
											/>
										</div>
									);
								}

								const textValue = Array.isArray(effectiveValue) ? effectiveValue.join(", ") : typeof effectiveValue === "string" ? effectiveValue : "";
								return (
									<div key={definition.id} className="flex flex-col gap-1">
										<Label>{definition.label}</Label>
										<Input
											placeholder={definition.placeholder || (definition.type === "multi-select" ? "value1, value2" : "")}
											value={textValue}
											onChange={(e) => {
												const next = e.target.value;
												if (definition.type === "multi-select") {
													const parsed = next
														.split(",")
														.map((v) => v.trim())
														.filter((v) => !!v);
													updateFilter(definition.id, parsed.length ? parsed : undefined);
												} else {
													updateFilter(definition.id, next || undefined);
												}
											}}
										/>
									</div>
								);
							})}
						</div>
					</PopoverContent>
				</Popover>
			)}

			<Select
				value={props.selectedProvider.id}
				onValueChange={(id) => {
					const provider = props.providers.find((p) => p.id === id);
					if (provider) {
						props.onProviderChange(provider);
					}
				}}
			>
				<SelectTrigger className="w-40 h-8">
					<SelectValue placeholder="Marketplace" />
				</SelectTrigger>
				<SelectContent>
					{props.providers.map((provider) => (
						<SelectItem key={provider.id} value={provider.id}>
							{provider.title}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{/* <Button size="sm" className="h-8 px-3" onClick={() => props.onSearch()} disabled={props.loading}>
				{props.loading ? "Searching..." : "Search"}
			</Button> */}

			<Button variant="ghost" className="w-8 h-8 p-0.5" onClick={props.onSettingsClick}>
				<IoIosOptions className="w-6 h-6" strokeWidth={1} />
			</Button>
		</div>
	);
}

function isFilterActive(value: MarketplaceFilterValue | undefined, defaultValue: MarketplaceFilterValue | undefined): boolean {
	if (value === undefined || value === null || value === "") {
		return false;
	}

	if (Array.isArray(value)) {
		return value.length > 0;
	}

	if (typeof value === "boolean") {
		return value !== Boolean(defaultValue);
	}

	if (typeof value === "number") {
		return !Number.isNaN(value);
	}

	return true;
}
