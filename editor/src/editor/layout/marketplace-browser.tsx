import { Component, ReactNode } from "react";

import { Editor } from "../main";
import { IMarketplaceAsset, IMarketplaceSearchFilters } from "../../tools/marketplaces/types";

import { MarketplaceToolbar } from "./marketplace-browser/toolbar";
import { MarketplaceGrid } from "./marketplace-browser/grid";
import { MarketplaceFooter } from "./marketplace-browser/footer";
import { MarketplaceSettingsDialog } from "./marketplace-browser/settings-dialog";
import { MarketplaceProvider } from "../../tools/marketplaces/provider";
import registerProviders from "../../tools/marketplaces/registrations";
import { MarketplaceAssetInspectorObject, EditorMarketplaceAssetInspector } from "./inspector/marketplace-asset";
import { waitUntil } from "../../tools/tools";

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
	currentPage: number;
	pageTokenStack: (string | undefined)[];
	nextPageToken?: string;

	settingsOpen: boolean;

	isMaximized: boolean;
}

export class EditorMarketplaceBrowser extends Component<IMarketplaceBrowserProps, IMarketplaceBrowserState> {
	private _searchRequestId = 0;

	public constructor(props: IMarketplaceBrowserProps) {
		super(props);

		const providers = registerProviders();

		this.state = {
			providers: providers,
			selectedProvider: providers[0],
			query: "",
			filters: this._getDefaultFilters(providers[0]),
			assets: [],
			loading: false,
			totalCount: undefined,
			selectedAsset: null,
			currentPage: 1,
			pageTokenStack: [undefined],
			nextPageToken: undefined,
			settingsOpen: false,

			isMaximized: props.editor.layout?.isTabMaximized("marketplace") ?? false,
		};
	}

	public async componentDidMount(): Promise<void> {
		this.state.providers.forEach((p) => {
			p.onSettingsChanged(this._handleSettingsChanged);
		});

		await waitUntil(() => this.props.editor.layout);

		this.props.editor.layout.onLayoutChanged.add(this._handleLayoutChanged);

		const isMaximized = this.props.editor.layout.isTabMaximized("marketplace");
		if (isMaximized !== this.state.isMaximized) {
			this.setState({ isMaximized });
		}
	}

	public componentWillUnmount(): void {
		this.state.providers.forEach((p) => {
			p.removeSettingsListener(this._handleSettingsChanged);
		});

		this.props.editor.layout?.onLayoutChanged.removeCallback(this._handleLayoutChanged);
	}

	private _handleSettingsChanged = (_id: string, _value: any) => {
		this._handleSearch();
	};

	private _handleLayoutChanged = () => {
		const isMaximized = this.props.editor.layout.isTabMaximized("marketplace");
		if (isMaximized !== this.state.isMaximized) {
			this.setState({ isMaximized });
		}
	};

	public render(): ReactNode {
		return (
			<div className="flex flex-row w-full h-full bg-background text-foreground overflow-hidden">
				<div className="flex flex-col flex-1 overflow-hidden">
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
							this.setState(
								{
									selectedProvider,
									filters: this._getDefaultFilters(selectedProvider),
									selectedAsset: null,
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
						<MarketplaceGrid
							assets={this.state.assets}
							loading={this.state.loading}
							query={this.state.query}
							selectedAsset={this.state.selectedAsset}
							onAssetClick={(asset) => this._handleAssetClicked(asset)}
						/>
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
				</div>

				{this.state.isMaximized && this.state.selectedAsset && (
					<div className="border-l border-border bg-background/50 overflow-hidden flex flex-col" style={{ width: "25%" }}>
						<EditorMarketplaceAssetInspector
							editor={this.props.editor}
							object={new MarketplaceAssetInspectorObject(this.state.selectedAsset, this.state.selectedProvider, () => this.setState({ settingsOpen: true }))}
						/>
					</div>
				)}

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
		this.setState({ selectedAsset: asset });
		return this.props.editor.layout.inspector.setEditedObject(
			new MarketplaceAssetInspectorObject(asset, this.state.selectedProvider, () => this.setState({ settingsOpen: true }))
		);
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

	private _getDefaultFilters(provider: MarketplaceProvider): IMarketplaceSearchFilters {
		const definitions = provider.getSearchFilters?.() || [];
		return definitions.reduce((acc, def) => {
			acc[def.id] = def.defaultValue;
			return acc;
		}, {} as IMarketplaceSearchFilters);
	}
}
