import { Component, ReactNode } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { toast } from "sonner";
import { ipcRenderer } from "electron";

import { Editor } from "../main";
import { IMarketplaceAsset, MarketplaceProvider, IMarketplaceSearchFilters } from "../../project/marketplaces";
import "../../tools/marketplaces/providers";

import { ImportProgress } from "./marketplace-browser/import-progress";
import { MarketplaceToolbar } from "./marketplace-browser/toolbar";
import { MarketplaceGrid } from "./marketplace-browser/grid";
import { MarketplaceSidebar } from "./marketplace-browser/sidebar";
import { MarketplaceFooter } from "./marketplace-browser/footer";
import { MarketplaceSettingsDialog } from "./marketplace-browser/settings-dialog";

export interface IMarketplaceBrowserProps {
	editor: Editor;
}

export interface IMarketplaceBrowserState {
	providers: MarketplaceProvider[];
	selectedProvider: MarketplaceProvider;
	query: string;
	filters: IMarketplaceSearchFilters;
	assets: IMarketplaceAsset[];
	loading: boolean;
	totalCount?: number;

	selectedAsset: IMarketplaceAsset | null;
	detailsLoading: boolean;

	currentPage: number;
	pageTokenStack: (string | undefined)[];
	nextPageToken?: string;

	selectedDownloadQuality?: string;
	selectedDownloadType?: string;

	activeDownloadIds: string[];
	settingsOpen: boolean;
}

export class MarketplaceBrowser extends Component<IMarketplaceBrowserProps, IMarketplaceBrowserState> {
	private _searchRequestId = 0;
	private _detailsRequestId = 0;

	public constructor(props: IMarketplaceBrowserProps) {
		super(props);

		const providers = MarketplaceProvider.getProviders();

		this.state = {
			providers: providers,
			selectedProvider: providers[0],
			query: "",
			filters: this._getDefaultFilters(providers[0]),
			assets: [],
			loading: false,
			totalCount: undefined,
			selectedAsset: null,
			detailsLoading: false,
			currentPage: 1,
			pageTokenStack: [undefined],
			nextPageToken: undefined,
			selectedDownloadType: undefined,
			activeDownloadIds: [],
			settingsOpen: false,
		};
	}

	public componentDidMount(): void {
		this.state.providers.forEach((p) => {
			p.onSettingsChanged(this._handleSettingsChanged);
		});
	}

	public componentWillUnmount(): void {
		this.state.providers.forEach((p) => {
			p.removeSettingsListener(this._handleSettingsChanged);
		});
	}

	private _handleSettingsChanged = (_id: string, _value: any) => {
		if (this.state.selectedAsset) {
			this._handleAssetClicked(this.state.selectedAsset);
		}
	};

	public render(): ReactNode {
		return (
			<div className="flex flex-col w-full h-full bg-background text-foreground overflow-hidden">
				<MarketplaceToolbar
					query={this.state.query}
					filters={this.state.filters}
					filterDefinitions={this.state.selectedProvider.getSearchFilters?.() || []}
					loading={this.state.loading}
					providers={this.state.providers}
					selectedProvider={this.state.selectedProvider}
					onQueryChange={(query) => this.setState({ query })}
					onFiltersChange={(filters) => this.setState({ filters })}
					onResetFilters={() => this.setState({ filters: this._getDefaultFilters(this.state.selectedProvider) })}
					onSearch={() => this._handleSearch()}
					onProviderChange={(selectedProvider) => {
						this._detailsRequestId++;
						this.setState(
							{
								selectedProvider,
								filters: this._getDefaultFilters(selectedProvider),
								selectedAsset: null,
								selectedDownloadQuality: undefined,
								selectedDownloadType: undefined,
								currentPage: 1,
								pageTokenStack: [undefined],
								nextPageToken: undefined,
								totalCount: undefined,
								assets: [],
							},
							() => this._handleSearch()
						);
					}}
					onSettingsClick={() => this.setState({ settingsOpen: true })}
				/>

				<div className="flex-1 overflow-hidden">
					<PanelGroup direction="horizontal">
						<Panel defaultSize={75} minSize={30}>
							<MarketplaceGrid
								assets={this.state.assets}
								loading={this.state.loading}
								query={this.state.query}
								selectedAsset={this.state.selectedAsset}
								onAssetClick={(asset) => this._handleAssetClicked(asset)}
							/>
						</Panel>

						{this.state.selectedAsset && <PanelResizeHandle className="w-1 bg-border/50 hover:bg-primary/50 transition-colors cursor-col-resize" />}
						{this.state.selectedAsset && (
							<Panel defaultSize={25} minSize={20} className="bg-primary-foreground/20 border-l border-border flex flex-col overflow-hidden">
								<MarketplaceSidebar
									asset={this.state.selectedAsset}
									detailsLoading={this.state.detailsLoading}
									selectedQuality={this.state.selectedDownloadQuality}
									selectedType={this.state.selectedDownloadType}
									activeDownloadIds={this.state.activeDownloadIds}
									showLoginAction={this._shouldShowLoginAction()}
									loginActionLabel={`Login to ${this.state.selectedProvider.title}`}
									onClose={() => this.setState({ selectedAsset: null, selectedDownloadQuality: undefined, selectedDownloadType: undefined })}
									onQualityChange={(val) => {
										const selectedDownloadType = this._getFirstType(this.state.selectedAsset, val);
										this.setState({ selectedDownloadQuality: val, selectedDownloadType });
									}}
									onTypeChange={(val) => this.setState({ selectedDownloadType: val })}
									onImport={(asset) => this._handleImport(asset)}
									onOpenMarketplaceUrl={(url) => ipcRenderer.send("app:open-url", url)}
									onOpenSettings={() => this.setState({ settingsOpen: true })}
								/>
							</Panel>
						)}
					</PanelGroup>
				</div>

				<MarketplaceFooter
					assetsCount={this.state.assets.length}
					currentPage={this.state.currentPage}
					totalCount={this.state.totalCount}
					loading={this.state.loading}
					hasPrevious={this.state.currentPage > 1}
					hasNext={!!this.state.nextPageToken}
					onPrevious={() => this._handlePreviousPage()}
					onNext={() => this._handleNextPage()}
				/>

				<MarketplaceSettingsDialog open={this.state.settingsOpen} providers={this.state.providers} onClose={() => this.setState({ settingsOpen: false })} />
			</div>
		);
	}

	private async _handlePreviousPage(): Promise<void> {
		const stack = [...this.state.pageTokenStack];
		stack.pop();
		const prevToken = stack[stack.length - 1];

		const success = await this._handleSearch(prevToken);
		if (!success) {
			return;
		}

		this.setState({
			pageTokenStack: stack,
			currentPage: this.state.currentPage - 1,
		});
	}

	private async _handleNextPage(): Promise<void> {
		const nextToken = this.state.nextPageToken;
		if (!nextToken) {
			return;
		}

		const success = await this._handleSearch(nextToken);
		if (!success) {
			return;
		}

		this.setState({
			pageTokenStack: [...this.state.pageTokenStack, nextToken],
			currentPage: this.state.currentPage + 1,
		});
	}

	private async _handleAssetClicked(asset: IMarketplaceAsset): Promise<void> {
		const provider = this.state.selectedProvider;
		const requestId = ++this._detailsRequestId;
		this.setState({ selectedAsset: asset, detailsLoading: true, selectedDownloadQuality: undefined, selectedDownloadType: undefined });

		if (provider.getAssetDetails) {
			try {
				const details = await provider.getAssetDetails(asset.id);
				if (requestId !== this._detailsRequestId || provider !== this.state.selectedProvider) {
					return;
				}

				const selectedQuality = Object.keys(details.downloadOptions || {})?.[0];
				const selectedType = Object.keys(details.downloadOptions?.[selectedQuality] || {})?.[0];
				this.setState({ selectedAsset: details, detailsLoading: false, selectedDownloadQuality: selectedQuality, selectedDownloadType: selectedType });
			} catch (e) {
				if (requestId !== this._detailsRequestId || provider !== this.state.selectedProvider) {
					return;
				}

				const message = e instanceof Error ? e.message : String(e);
				this.props.editor.layout.console.error(`Failed to fetch asset details: ${message}`);
				this.setState({ detailsLoading: false });
			}
		} else {
			const selectedQuality = Object.keys(asset.downloadOptions || {})?.[0];
			const selectedType = Object.keys(asset.downloadOptions?.[selectedQuality] || {})?.[0];
			this.setState({ detailsLoading: false, selectedDownloadQuality: selectedQuality, selectedDownloadType: selectedType });
		}
	}

	private async _handleSearch(pageToken?: string): Promise<boolean> {
		const provider = this.state.selectedProvider;
		const query = this.state.query;
		const filters = this.state.filters;
		const requestId = ++this._searchRequestId;
		this.setState({ loading: true });

		if (pageToken === undefined && arguments.length === 0) {
			this.setState({
				currentPage: 1,
				pageTokenStack: [undefined],
			});
		}

		try {
			const result = await provider.search(query, pageToken, filters);
			if (requestId !== this._searchRequestId || provider !== this.state.selectedProvider) {
				return false;
			}

			this.setState({
				assets: result.assets,
				totalCount: result.totalCount,
				nextPageToken: result.nextPageToken,
				selectedAsset: null,
				selectedDownloadQuality: undefined,
				selectedDownloadType: undefined,
			});
			return true;
		} catch (e) {
			if (requestId !== this._searchRequestId || provider !== this.state.selectedProvider) {
				return false;
			}

			const message = e instanceof Error ? e.message : String(e);
			this.props.editor.layout.console.error(`Marketplace search failed: ${message}`);
			return false;
		} finally {
			if (requestId === this._searchRequestId) {
				this.setState({ loading: false });
			}
		}
	}

	private _handleImport(asset: IMarketplaceAsset): void {
		if (this.state.activeDownloadIds.includes(asset.id)) {
			return;
		}

		if (!this.state.selectedDownloadQuality || !this.state.selectedDownloadType) {
			toast.error("Please select a valid quality and format before importing.");
			return;
		}

		this.setState((prev) => ({ activeDownloadIds: [...prev.activeDownloadIds, asset.id] }));

		toast(
			<ImportProgress
				asset={asset}
				editor={this.props.editor}
				provider={this.state.selectedProvider}
				quality={this.state.selectedDownloadQuality!}
				type={this.state.selectedDownloadType!}
				onComplete={() => {
					this.setState((prev) => ({ activeDownloadIds: prev.activeDownloadIds.filter((id) => id !== asset.id) }));
				}}
			/>,
			{
				id: asset.id,
				className: "w-[420px]",
				duration: Infinity,
				dismissible: false,
			}
		);
	}

	private _getFirstType(asset: IMarketplaceAsset | null, quality?: string): string | undefined {
		if (!asset || !quality) {
			return undefined;
		}

		return Object.keys(asset.downloadOptions?.[quality] || {})[0];
	}

	private _shouldShowLoginAction(): boolean {
		const selectedAsset = this.state.selectedAsset;
		if (!selectedAsset) {
			return false;
		}

		const hasDownloadOptions = Object.keys(selectedAsset.downloadOptions || {}).length > 0;
		if (hasDownloadOptions || !selectedAsset.marketplaceUrl || !this.state.selectedProvider.getOAuth) {
			return false;
		}

		if (!this.state.selectedProvider.isAuthenticated) {
			return true;
		}

		if (!this.state.selectedProvider.isAuthenticated()) {
			return true;
		}
		return false;
	}

	private _getDefaultFilters(provider: MarketplaceProvider): IMarketplaceSearchFilters {
		const definitions = provider.getSearchFilters?.() || [];
		return definitions.reduce((acc, def) => {
			acc[def.id] = def.defaultValue;
			return acc;
		}, {} as IMarketplaceSearchFilters);
	}
}
