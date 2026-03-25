import { pathExists } from "fs-extra";
import { ipcRenderer } from "electron";

import { Component, ReactNode } from "react";

import { toast } from "sonner";

import { IMarketplaceAsset } from "../../../../tools/marketplaces/types";
import { MarketplaceProvider } from "../../../../tools/marketplaces/provider";

import { MarketplaceSidebar } from "../../marketplace/sidebar";
import { ImportProgress } from "../../marketplace/import-progress";

import { IEditorInspectorImplementationProps } from "../inspector";

export class MarketplaceAssetInspectorObject {
	public readonly isMarketplaceAssetInspectorObject = true;

	public constructor(
		public readonly asset: IMarketplaceAsset,
		public readonly provider: MarketplaceProvider,
		public readonly openSettings: () => void
	) {}
}

interface IEditorMarketplaceAssetInspectorState {
	downloading: boolean;
	detailsLoading: boolean;

	selectedDownloadType?: string;
	selectedDownloadQuality?: string;

	assetPath?: string;
	details?: IMarketplaceAsset;
}

export class EditorMarketplaceAssetInspector extends Component<IEditorInspectorImplementationProps<MarketplaceAssetInspectorObject>, IEditorMarketplaceAssetInspectorState> {
	/**
	 * Returns whether or not the given object is supported by this inspector.
	 * @param object defines the object to check.
	 * @returns true if the object is supported by this inspector.
	 */
	public static IsSupported(object: any): object is MarketplaceAssetInspectorObject {
		return object?.isMarketplaceAssetInspectorObject;
	}

	public constructor(props: IEditorInspectorImplementationProps<MarketplaceAssetInspectorObject>) {
		super(props);
		this.state = {
			selectedDownloadQuality: undefined,
			selectedDownloadType: undefined,
			detailsLoading: false,
			downloading: false,
		};
	}

	public render(): ReactNode {
		return (
			<MarketplaceSidebar
				asset={this.state.details}
				detailsLoading={this.state.detailsLoading}
				selectedQuality={this.state.selectedDownloadQuality}
				selectedType={this.state.selectedDownloadType}
				isDownloading={this.state.downloading}
				showLoginAction={this._shouldShowLoginAction()}
				loginActionLabel={`Login to ${this.props.object.provider.title}`}
				onLogin={this.props.object.provider.login ? () => this.props.object.provider.login!() : undefined}
				onQualityChange={(selectedDownloadQuality) => {
					if (this.state.details) {
						const selectedDownloadType = this._getFirstType(this.state.details, selectedDownloadQuality);
						this.setState({
							selectedDownloadType,
							selectedDownloadQuality,
						});
					}
				}}
				onTypeChange={(val) => this.setState({ selectedDownloadType: val })}
				onImport={(type) => this._handleImport(type)}
				onOpenMarketplaceUrl={(url) => ipcRenderer.send("app:open-url", url)}
				onOpenSettings={() => this.props.object.openSettings()}
				assetPath={this.state.assetPath}
				openAssetFolder={() => this._openAssetFolder()}
			/>
		);
	}

	public async componentDidMount(): Promise<void> {
		this.props.object.provider.onSettingsChanged(this._handleSettingsChanged);
		this._loadDetails();

		const assetPath = await this._getAssetPath();
		if (assetPath) {
			this.setState({
				assetPath,
			});
		}
	}

	public componentDidUpdate(prevProps: IEditorInspectorImplementationProps<MarketplaceAssetInspectorObject>): void {
		if (this.props.object.provider !== prevProps.object.provider) {
			prevProps.object.provider.removeSettingsListener(this._handleSettingsChanged);
			this.props.object.provider.onSettingsChanged(this._handleSettingsChanged);
		}

		if (this.props.object.asset.id !== prevProps.object.asset.id) {
			this._loadDetails();
		}
	}

	public componentWillUnmount(): void {
		this.props.object.provider.removeSettingsListener(this._handleSettingsChanged);
	}

	private _handleSettingsChanged = (): void => {
		this._loadDetails();
	};

	private async _getAssetPath(): Promise<string | undefined> {
		const assetDir = this.props.object.provider.getAssetDir(this.props.object.asset.id, this.props.editor.state.projectPath || "");
		if (await pathExists(assetDir)) {
			return assetDir;
		}

		return undefined;
	}

	private async _openAssetFolder(): Promise<void> {
		const assetDir = await this._getAssetPath();
		if (assetDir) {
			this.props.editor.layout.selectTab("assets-browser");
			this.props.editor.layout.assets.setBrowsePath(assetDir);
		}
	}

	private _shouldShowLoginAction(): boolean {
		const selectedAsset = this.state.details;
		if (!selectedAsset) {
			return false;
		}

		const hasDownloadOptions = Object.keys(selectedAsset.downloadOptions || {}).length > 0;
		if (hasDownloadOptions || !selectedAsset.marketplaceUrl || !this.props.object.provider.getOAuth) {
			return false;
		}

		if (!this.props.object.provider.isAuthenticated) {
			return true;
		}

		if (!this.props.object.provider.isAuthenticated()) {
			return true;
		}
		return false;
	}

	private async _loadDetails(): Promise<void> {
		const provider = this.props.object.provider;

		this.setState({
			detailsLoading: true,
			selectedDownloadQuality: undefined,
			selectedDownloadType: undefined,
		});

		if (provider.getAssetDetails) {
			try {
				const details = await provider.getAssetDetails(this.props.object.asset.id);
				if (provider !== this.props.object.provider) {
					return;
				}

				const selectedQuality = Object.keys(details.downloadOptions || {})?.[0];
				const selectedType = Object.keys(details.downloadOptions?.[selectedQuality] || {})?.[0];
				this.setState({
					details,
					detailsLoading: false,
					selectedDownloadQuality: selectedQuality,
					selectedDownloadType: selectedType,
				});
			} catch (e) {
				if (provider !== this.props.object.provider) {
					return;
				}

				const message = e instanceof Error ? e.message : String(e);
				this.props.editor.layout.console.error(`Failed to fetch asset details: ${message}`);
				this.setState({
					detailsLoading: false,
				});
			}
		} else {
			const selectedQuality = Object.keys(this.props.object.asset.downloadOptions || {})?.[0];
			const selectedType = Object.keys(this.props.object.asset.downloadOptions?.[selectedQuality] || {})?.[0];
			this.setState({
				details: this.props.object.asset,
				detailsLoading: false,
				selectedDownloadQuality: selectedQuality,
				selectedDownloadType: selectedType,
			});
		}
	}

	private async _handleImport(type?: string): Promise<void> {
		const asset = this.state.details || this.props.object.asset;
		if (!this.state.selectedDownloadQuality || !this.state.selectedDownloadType || !asset) {
			toast.error("Please select a valid quality and format before importing.");
			return;
		}

		this.setState({ downloading: true });

		toast(
			<ImportProgress
				asset={asset}
				editor={this.props.editor}
				provider={this.props.object.provider}
				quality={this.state.selectedDownloadQuality!}
				type={this.state.selectedDownloadType!}
			/>,
			{
				id: asset.id,
				duration: Infinity,
				dismissible: false,
			}
		);

		try {
			await this.props.object.provider.downloadAndImport(asset, this.props.editor, this.state.selectedDownloadQuality!, this.state.selectedDownloadType!, type);
			this.props.editor.layout.console.log(`Imported ${asset.name} from ${this.props.object.provider.title}`);
			toast.success(`Successfully imported ${asset.name}`, { id: asset.id, duration: 3000 });
		} catch (e) {
			if (e.message === "Download aborted by user.") {
				toast.error(`Import of ${asset.name} was cancelled and cleaned up.`, { id: asset.id, duration: 3000 });
			} else {
				this.props.editor.layout.console.error(`Import failed: ${e.message}`);
				toast.error(`Failed to import ${asset.name}: ${e.message}`, { id: asset.id, duration: 5000 });
			}
		} finally {
			this.setState({
				downloading: false,
				assetPath: await this._getAssetPath(),
			});
		}
	}

	private _getFirstType(asset: IMarketplaceAsset | null, quality?: string): string | undefined {
		if (!asset || !quality) {
			return undefined;
		}

		const types = Object.keys(asset.downloadOptions?.[quality] || {});
		if (types.includes(this.state.selectedDownloadType!)) {
			return this.state.selectedDownloadType;
		}

		return types[0];
	}
}
