import { basename, join } from "path";
import { readdir, stat, Stats } from "fs-extra";

import * as React from "react";
import { Boundary, Breadcrumbs, Classes, IBreadcrumbProps, Intent } from "@blueprintjs/core";

import { Editor } from "../../editor";

import { Icon } from "../../gui/icon";

import { Tools } from "../../tools/tools";

import { AssetsBrowserItem } from "./files/item";
import { AssetsBrowserItemHandler } from "./files/item-handler";

export interface IAssetsBrowserFilesProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
}

export interface IAssetsBrowserFilesState {
	/**
	 * Defines the current stack of opened folders.
	 */
	pathStack: string[];
	/**
	 * Defines the absolute path to the working directory.
	 */
	currentDirectory: string;

	/**
	 * Defines the list of all items drawn in the view.
	 */
	items: React.ReactNode[];
}

export class AssetsBrowserFiles extends React.Component<IAssetsBrowserFilesProps, IAssetsBrowserFilesState> {
	private _assetsDirectory: string;
	
	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IAssetsBrowserFilesProps) {
		super(props);

		this.state = {
			items: [],
			pathStack: [],
			currentDirectory: "",
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
				{/* Toolbar */}
				<div className={Classes.FILL} key="scripts-toolbar" style={{
					width: "100%",
					height: "25px",
					backgroundColor: "#333333",
					borderRadius: "10px",
					marginTop: "5px"
				}}>
				</div>

				{/* Path stack */}
				<Breadcrumbs
					overflowListProps={{
						style: {
							backgroundColor: "#222222",
							borderRadius: "10px",
							marginTop: "5px",
							paddingLeft: "10px"
						}
					}}
					collapseFrom={Boundary.START}
					items={this._getBreadcrumbsItems()}
				></Breadcrumbs>

				{/* Assets */}
				<div
					style={{
						width: "100%",
						display: "grid",
						overflow: "auto",
						position: "absolute",
						height: "calc(100% - 70px)",
						justifyContent: "space-between",
						gridTemplateRows: "repeat(auto-fill, 120px)",
						gridTemplateColumns: "repeat(auto-fill, 120px)",
					}}
				>
					{this.state.items}
				</div>
			</div>
		)
	}

	/**
	 * Called on the component did mount.
	 */
	public async componentDidMount(): Promise<void> {
		AssetsBrowserItem.Init();
		await AssetsBrowserItemHandler.Init();
	}

	/**
	 * Sets the new absolute path to the directory to read and draw its items.
	 * @param directoryPath defines the absolute path to the directory to show in the view.
	 */
	public async setDirectory(directoryPath: string): Promise<void> {
		if (!this._assetsDirectory) {
			this._assetsDirectory = directoryPath;
			this.setState({
				pathStack: [directoryPath],
				currentDirectory: directoryPath,
			});
		}

		// Get files and filter
		let files = await readdir(directoryPath);
		files = files.filter((f) => f.indexOf(".") !== 0);

		// Build items
		const items: React.ReactNode[] = [];
		for (const f of files) {
			const absolutePath = join(directoryPath, f);
			const fStats = await stat(absolutePath);

			items.push(
				<AssetsBrowserItem
					title={f}
					key={Tools.RandomId()}
					editor={this.props.editor}
					absolutePath={absolutePath}
					type={fStats.isDirectory() ? "directory" : "file"}
					relativePath={absolutePath.replace(join(this._assetsDirectory, "/"), "")}
					onDoubleClick={() => this._handleItemDoubleClicked(directoryPath, f, fStats)}
				/>
			);
		}

		this.setState({ items });
	}

	/**
	 * Refreshes the current list of files.
	 */
	public refresh(): Promise<void> {
		return this.setDirectory(this.state.currentDirectory);
	}

	/**
	 * Called on the user double clicks on an item.
	 */
	private async _handleItemDoubleClicked(directoryPath: string, file: string, stats: Stats): Promise<void> {
		if (stats.isDirectory()) {
			const currentDirectory = join(directoryPath, file);
			const pathStack = this.state.pathStack.concat([file]);

			this.setState({ pathStack, currentDirectory });
			return this.setDirectory(currentDirectory);
		}
	}

	/**
	 * Returns the breadcrumb items to be shown.
	 */
	private _getBreadcrumbsItems(): IBreadcrumbProps[] {
		const pathStack: string[] = [];
		const items: IBreadcrumbProps[] = [];

		for (let i = 0; i < this.state.pathStack.length; i++) {
			const p = this.state.pathStack[i];
			const itemStack = pathStack.concat([p]);

			items.push({
				text: <span style={{ marginLeft: "5px" }}>{basename(p)}</span>,
				icon: <Icon src="folder-open.svg" />,
				intent: Intent.NONE,
				onClick: () => {
					this.setState({ pathStack: itemStack });
					this.setDirectory(itemStack.join("/"));
				},
			});

			pathStack.push(p);
		}

		return items;
	}
}
