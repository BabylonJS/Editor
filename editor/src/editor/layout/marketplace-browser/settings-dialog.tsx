import { Component, ReactNode } from "react";
import { ipcRenderer } from "electron";
import { isAbsolute } from "path";

import { MarketplaceProvider } from "../../../tools/marketplaces/provider";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../ui/shadcn/ui/alert-dialog";
import { Label } from "../../../ui/shadcn/ui/label";
import { Input } from "../../../ui/shadcn/ui/input";
import { Button } from "../../../ui/shadcn/ui/button";
import { Separator } from "../../../ui/shadcn/ui/separator";
import { FaFolderOpen } from "react-icons/fa6";

export interface IMarketplaceSettingsDialogProps {
	open: boolean;
	providers: MarketplaceProvider[];
	onClose: () => void;
}

export interface IMarketplaceSettingsDialogState {
	downloadPath: string;
}

export class MarketplaceSettingsDialog extends Component<IMarketplaceSettingsDialogProps, IMarketplaceSettingsDialogState> {
	public constructor(props: IMarketplaceSettingsDialogProps) {
		super(props);

		this.state = {
			downloadPath: localStorage.getItem("marketplace-download-path") || "assets",
		};
	}

	public componentDidMount(): void {
		this.props.providers.forEach((p) => {
			p.onSettingsChanged(this._handleSettingsChanged);
		});
	}

	public componentWillUnmount(): void {
		this.props.providers.forEach((p) => {
			p.removeSettingsListener(this._handleSettingsChanged);
		});
	}

	private _handleSettingsChanged = () => {
		this.forceUpdate();
	};

	public render(): ReactNode {
		return (
			<AlertDialog open={this.props.open}>
				<AlertDialogContent className="sm:max-w-[600px]">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-2xl font-bold">Marketplace Settings</AlertDialogTitle>
					</AlertDialogHeader>

					<div className="flex flex-col gap-6 py-4 max-h-[60vh] overflow-y-auto pr-2 w-full">
						{/* Global Marketplace Settings */}
						<div className="flex flex-col gap-4">
							<h3 className="text-lg font-semibold flex items-center gap-2">Global Settings</h3>
							<div className="flex flex-col gap-2">
								<Label htmlFor="download-path">Download Path</Label>
								<div className="flex gap-2">
									<Input
										id="download-path"
										value={this.state.downloadPath}
										onChange={(e) => this._handleDownloadPathChange(e.target.value)}
										placeholder="e.g., assets/marketplace"
										className="flex-1"
									/>
									<Button variant="outline" size="icon" onClick={() => this._handleBrowseDownloadPath()}>
										<FaFolderOpen />
									</Button>
								</div>
								<p className="text-xs text-muted-foreground italic">
									{isAbsolute(this.state.downloadPath)
										? `Assets will be downloaded to ${this.state.downloadPath}/[Provider]/[AssetID]`
										: `Assets will be downloaded to [ProjectRoot]/${this.state.downloadPath}/[Provider]/[AssetID]`}
								</p>
							</div>
						</div>

						{/* Provider Specific Settings */}
						{this.props.providers
							.filter((provider) => provider.renderSettings)
							.map((provider) => {
								return (
									<div key={provider.id} className="flex flex-col gap-4">
										<Separator />
										<h3 className="text-lg font-semibold">{provider.title} Settings</h3>
										{provider.renderSettings?.()}
									</div>
								);
							})}
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => this.props.onClose()}>Close</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	private _handleDownloadPathChange(path: string): void {
		localStorage.setItem("marketplace-download-path", path);
		this.setState({ downloadPath: path });
	}

	private _handleBrowseDownloadPath(): void {
		const path = ipcRenderer.sendSync("editor:open-single-folder-dialog", "Select Download Path");
		if (path) {
			this._handleDownloadPathChange(path);
		}
	}
}
