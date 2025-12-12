import { Server } from "net";
import { dirname, join } from "path/posix";
import { ensureDir, pathExists, readJSON, writeJSON } from "fs-extra";

import { Component, ReactNode } from "react";

import { Editor, Separator } from "babylonjs-editor";

import { importFabJson } from "../import/import";

import { IFabJson } from "../typings";

import { FabMeshesBrowser } from "./meshes/meshes";

import { FabItems } from "./items";
import { FabToolbar } from "./toolbar";

export interface IFabRootComponentProps {
	editor: Editor;
}

export interface IFabRootComponentState {
	assets: IFabJson[];
	fabAssetsFolder: string | null;

	browsedAsset: IFabJson | null;
	selectedAsset: IFabJson | null;
}

export interface IFabAssetProcessingProgress {
	assetId: string;
	progress: number;
}

export class FabRoot extends Component<IFabRootComponentProps, IFabRootComponentState> {
	private _server: Server | null = null;

	private _loadingAssetsCount: number = 0;
	private _processingAssetIds: Map<string, number> = new Map<string, number>();

	public constructor(props: IFabRootComponentProps) {
		super(props);

		this.state = {
			assets: [],
			fabAssetsFolder: null,

			browsedAsset: null,
			selectedAsset: null,
		};
	}

	public render(): ReactNode {
		return (
			<div className="fab relative flex flex-col w-full h-full overflow-hidden">
				<FabToolbar root={this} />

				{!this.state.assets.length && (
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
						<div className="text-lg font-semibold">No product found.</div>
						<div>Choose export target "Custom (socket port)" and click the "Export" button in Fab application.</div>
					</div>
				)}

				{this.state.fabAssetsFolder && !this.state.browsedAsset && (
					<FabItems
						editor={this.props.editor}
						assets={this.state.assets}
						fabAssetsFolder={this.state.fabAssetsFolder}
						processingAssetIds={this._processingAssetIds}
						selectedAsset={this.state.selectedAsset}
						onClick={(selectedAssetId) =>
							this.setState({
								selectedAsset: selectedAssetId,
							})
						}
						onDoubleClick={(browsedAsset) =>
							this.setState({
								browsedAsset,
							})
						}
					/>
				)}

				{this.state.browsedAsset && this.state.fabAssetsFolder && (
					<>
						<div className="flex justify-between items-center px-5">
							<div className="flex flex-col gap-1 justify-start py-5">
								<div className="text-3xl font-semibold text-center">{this.state.browsedAsset.metadata.fab.listing.title}</div>
								<div className="flex flex-col justify-end">
									<div className="text-muted-foreground">Meshes: {this.state.browsedAsset.meshes.length}</div>
									<div className="text-muted-foreground">Materials: {this.state.browsedAsset.materials.length}</div>
								</div>
							</div>
							<div className="flex flex-col gap-1 justify-end">
								<div className="flex flex-col justify-end">
									<div className="text-end text-muted-foreground">
										Published{" "}
										{new Date(this.state.browsedAsset.metadata.fab.listing.publishedAt).toLocaleString("en-US", {
											day: "2-digit",
											month: "long",
											year: "numeric",
										})}
									</div>
									<div className="text-end text-muted-foreground">
										Updated{" "}
										{new Date(this.state.browsedAsset.metadata.fab.listing.lastUpdatedAt).toLocaleString("en-US", {
											day: "2-digit",
											month: "long",
											year: "numeric",
										})}
									</div>
								</div>
								<div className="flex flex-col justify-end">
									{this.state.browsedAsset.metadata.fab.listing.isAiGenerated && (
										<div className="flex justify-end items-center gap-2 text-green-500">AI Generated</div>
									)}
									<div
										className={`flex justify-end items-center gap-2 ${this.state.browsedAsset.metadata.fab.listing.isAiForbidden ? "text-red-500" : "text-muted-foreground"}`}
									>
										{this.state.browsedAsset.metadata.fab.listing.isAiForbidden && "AI Forbidden"}
										{!this.state.browsedAsset.metadata.fab.listing.isAiForbidden && "AI Authorized"}
									</div>
								</div>
							</div>
						</div>

						<div className="px-5 py-1">
							<Separator />
						</div>

						<FabMeshesBrowser editor={this.props.editor} json={this.state.browsedAsset} fabAssetsFolder={this.state.fabAssetsFolder} />
					</>
				)}
			</div>
		);
	}

	public async componentDidMount(): Promise<void> {
		this._createServer();

		if (this.props.editor.state.projectPath) {
			const fabAssetsFolder = join(dirname(this.props.editor.state.projectPath), "assets/fab");
			await ensureDir(fabAssetsFolder);

			this.setState({
				fabAssetsFolder,
			});

			try {
				const assets = (await readJSON(join(fabAssetsFolder, "assets.json"))) as IFabJson[];
				this.setState({ assets }, () => {
					this.refresh();
				});
			} catch (e) {
				// Catch silently.
			}
		}
	}

	public componentWillUnmount(): void {
		try {
			this._server?.close();
		} catch (e) {
			// Catch silently
		}
	}

	public async refresh(): Promise<void> {
		const assets = [...this.state.assets];

		for (let i = 0; i < assets.length; ++i) {
			const asset = assets[i];

			if (!(await pathExists(asset.path))) {
				assets.splice(i, 1);
				--i;
			}
		}

		this.setState({
			assets,
		});
	}

	private _createServer(): void {
		this._server = new Server((socket) => {
			let buffer: Buffer | null = null;

			socket.on("data", (d: Buffer) => {
				if (!buffer) {
					buffer = Buffer.from(d);
				} else {
					buffer = Buffer.concat([buffer, d]);
				}
			});

			socket.on("end", async () => {
				if (!buffer) {
					return;
				}

				try {
					const assets = [...this.state.assets];
					const data = JSON.parse(buffer.toString("utf-8")) as IFabJson[];

					data.forEach((json) => {
						this._handleParsedAsset(json, assets);
					});
				} catch (e) {
					this.props.editor.layout.console.error("Failed to parse quixel JSON.");
				}

				buffer = null;
			});
		});

		this._server.listen(31337);
	}

	private async _handleParsedAsset(json: IFabJson, assets: IFabJson[]): Promise<void> {
		if (!this.state.fabAssetsFolder) {
			return;
		}

		++this._loadingAssetsCount;

		const existingIndex = assets.findIndex((a) => a.id === json.id);
		if (existingIndex !== -1) {
			assets[existingIndex] = json;
		} else {
			assets.push(json);
		}

		this.setState({
			assets,
		});

		if (json.materials.length > 0 || (json.meshes.length > 0 && !this._processingAssetIds.has(json.id))) {
			this._processingAssetIds.set(json.id, 0);
			this.forceUpdate();

			const finalAssetsFolder = join(this.state.fabAssetsFolder, json.metadata.fab.listing.title);
			await ensureDir(finalAssetsFolder);

			await importFabJson(this.props.editor, {
				json,
				finalAssetsFolder,
				importMeshes: false,
				importMaterials: true,
				onProgress: (progress) => {
					this._processingAssetIds.set(json.id, progress);
					this.forceUpdate();
				},
			});

			this._processingAssetIds.delete(json.id);
			this.forceUpdate();

			this.props.editor.layout.graph.refresh();
			this.props.editor.layout.assets.refresh();
		}

		--this._loadingAssetsCount;

		if (this._loadingAssetsCount === 0) {
			await writeJSON(join(this.state.fabAssetsFolder, "assets.json"), assets);
		}
	}
}
