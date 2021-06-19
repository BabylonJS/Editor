import { platform } from "os";
import { shell } from "electron";
import { basename, extname, join } from "path";
import { copyFile, mkdir, pathExists, readdir, stat, Stats, writeJSON } from "fs-extra";

import * as React from "react";
import {
	Boundary, Breadcrumbs, Button, ButtonGroup, Classes, IBreadcrumbProps, Intent, Menu,
	MenuDivider, MenuItem, Popover, Code, Divider, ContextMenu, Icon as BPIcon,
} from "@blueprintjs/core";

import { Tools as BabylonTools, NodeMaterial } from "babylonjs";

import { Editor } from "../../editor";

import { Icon } from "../../gui/icon";
import { Alert } from "../../gui/alert";
import { Dialog } from "../../gui/dialog";

import { Tools } from "../../tools/tools";

import { AssetsBrowserItem } from "./files/item";
import { AssetsBrowserItemHandler } from "./files/item-handler";

export interface IAssetsBrowserFilesProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
	/**
	 * Defines the callback called on a directory has been clicked in the tree.
	 */
	onDirectorySelected: (path: string) => void;
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
	/**
	 * Defines the list of all selected items.
	 */
	public selectedItems: string[] = [];

	private _assetsDirectory: string;
	private _sourcesDirectory: string;

	private _items: AssetsBrowserItem[] = [];

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
		const addContent = (
			<Menu>
				<MenuItem text="Material">
					<MenuItem text="Standard Material..." onClick={() => this._handleCreateMaterial("StandardMaterial")} />
					<MenuItem text="PBR Material..." onClick={() => this._handleCreateMaterial("PBRMaterial")} />
					<MenuItem text="Node Material..." onClick={() => this._handleCreateMaterial("NodeMaterial")} />
					<MenuDivider />
					<Code>Materials Library</Code>
					<MenuItem text="Sky Material..." onClick={() => this._handleCreateMaterial("SkyMaterial")} />
					<MenuItem text="Cel Material..." onClick={() => this._handleCreateMaterial("CellMaterial")} />
					<MenuItem text="Fire Material..." onClick={() => this._handleCreateMaterial("FireMaterial")} />
				</MenuItem>

				<MenuItem text="Particles System">
					<MenuItem text="Particles System..." />
				</MenuItem>
			</Menu>
		);

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
					<ButtonGroup>
						<Button text="Import..." icon="import" intent="primary" small style={{ minWidth: "120px" }} onClick={() => this._handleImportFiles()} />
						<Divider />
						<Popover key="add-popover" position="bottom-left" content={addContent}>
							<Button text="Add" small icon={<Icon src="plus.svg" />} rightIcon="caret-down" />
						</Popover>
					</ButtonGroup>
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
					onContextMenu={(ev) => this._handleContextMenu(ev)}
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
		AssetsBrowserItem.Init(this.props.editor);
		await AssetsBrowserItemHandler.Init();
	}

	/**
	 * Sets the new absolute path to the directory to read and draw its items.
	 * @param directoryPath defines the absolute path to the directory to show in the view.
	 */
	public async setDirectory(directoryPath: string): Promise<void> {
		this._items = [];
		this.selectedItems = [];

		if (!this._assetsDirectory) {
			this._assetsDirectory = directoryPath;
			this._sourcesDirectory = join(directoryPath, "../src");

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
					ref={(r) => {
						if (r && !this._items.find((i) => i.props.absolutePath === r.props.absolutePath)) {
							this._items.push(r);
						}
					}}
					title={f}
					key={Tools.RandomId()}
					editor={this.props.editor}
					absolutePath={absolutePath}
					type={fStats.isDirectory() ? "directory" : "file"}
					relativePath={absolutePath.replace(join(this._assetsDirectory, "/"), "")}

					onClick={(i, ev) => this._handleAssetSelected(i, ev)}
					onDoubleClick={() => this._handleItemDoubleClicked(directoryPath, f, fStats)}
					onDragStart={(i, ev) => this._handleAssetSelected(i, ev)}
				/>
			);
		}

		// Refresh path stack
		let rootDirectory = this._assetsDirectory;
		let split = directoryPath.split(this._assetsDirectory)[1] ?? null;

		if (split === null) {
			rootDirectory = this._sourcesDirectory;
			split = directoryPath.split(this._sourcesDirectory)[1] ?? null;
		}

		if (split) {
			const pathStack: string[] = [rootDirectory];
			const directories = split.split("/");

			directories.forEach((d) => {
				if (d) {
					pathStack.push(d);
				}
			});

			this.setState({ pathStack });
		}

		this.setState({ items, currentDirectory: directoryPath });
	}

	/**
	 * Refreshes the current list of files.
	 */
	public refresh(): Promise<void> {
		return this.setDirectory(this.state.currentDirectory);
	}

	/**
	 * Called on the user clicks on the item.
	 */
	private _handleAssetSelected(item: AssetsBrowserItem, ev: React.MouseEvent<HTMLDivElement>): void {
		if (ev.ctrlKey || ev.metaKey) {
			const isSelected = !item.state.isSelected;
			if (!isSelected) {
				const index = this.selectedItems.indexOf(item.props.absolutePath);
				if (index !== -1) {
					this.selectedItems.splice(index, 1);
				}
			} else {
				this.selectedItems.push(item.props.absolutePath);
			}

			item.setSelected(isSelected);
		} else if (!item.state.isSelected) {
			this._items.forEach((i) => i.setSelected(false));
			
			item.setSelected(true);
			
			this.selectedItems = [];
			this.selectedItems.push(item.props.absolutePath);
		}
	}

	/**
	 * Called on the user double clicks on an item.
	 */
	private async _handleItemDoubleClicked(directoryPath: string, file: string, stats: Stats): Promise<void> {
		if (stats.isDirectory()) {
			const currentDirectory = join(directoryPath, file);
			const pathStack = this.state.pathStack.concat([file]);

			this.props.onDirectorySelected(currentDirectory);

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
					this.setDirectory(itemStack.join("/"));
				},
			});

			pathStack.push(p);
		}

		return items;
	}

	/**
	 * Called on the user wants to import files to the currently browser directory.
	 */
	private async _handleImportFiles(): Promise<void> {
		if (!this.state.currentDirectory) {
			return;
		}

		const files = await Tools.ShowNativeOpenMultipleFileDialog();
		if (!files.length) {
			return;
		}

		const promises: Promise<void>[] = [];

		for (const f of files) {
			const path = f.path;
			promises.push(copyFile(path, join(this.state.currentDirectory, basename(path))));	
		}

		await Promise.all(promises);
		await this.props.editor.assetsBrowser.refresh();
	}

	/**
	 * Caleld on the user right clicks on an empty area of the files browser.
	 */
	private _handleContextMenu(ev: React.MouseEvent<HTMLDivElement>): void {
		const isMacOs = platform() === "darwin";

		ContextMenu.show((
			<Menu>
				<MenuItem text="Refresh" icon={<Icon src="recycle.svg" />} onClick={() => this.props.editor.assetsBrowser.refresh()} />
				<MenuItem
					icon={<BPIcon icon="document-open" color="white" />}
					text={`Reveal in ${isMacOs ? "Finder" : "Explorer"}`}
					onClick={() => shell.openItem(Tools.NormalizePathForCurrentPlatform(this.state.currentDirectory))}
				/>
				<MenuDivider />
				<MenuItem text="New Directory..." icon={<Icon src="plus.svg" />} onClick={() => this._handleCreateNewDirectory()} />
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		})
	}

	/**
	 * Called on the user wants to create a new directory.
	 */
	private async _handleCreateNewDirectory(): Promise<void> {
		const name = await Dialog.Show("Directory Name", "Please provide the name of the new directory");
		if (!name) {
			return;
		}

		const directoryPath = join(this.state.currentDirectory, name);

		if (await pathExists(directoryPath)) {
			return Alert.Show("Can't Create Directory", `A directory named "${name}" already exists.`);
		}

		await mkdir(directoryPath);
		await this.props.editor.assetsBrowser.refresh();
	}

	/**
	 * Called on the user wants to add a new material asset.
	 */
	private async _handleCreateMaterial(type: string): Promise<void> {
		let name = await Dialog.Show("Material Name", "Please provide a name for the new material to created.");

		const ctor = BabylonTools.Instantiate(`BABYLON.${type}`);
        const material = new ctor(name, this.props.editor.scene!);
		const relativePath = this.state.currentDirectory.replace(join(this._assetsDirectory, "/"), "");

        material.id = Tools.RandomId();

        if (material instanceof NodeMaterial) {
            material.setToDefault();
            material.build(true);
        }

		const extension = extname(name);
		if (extension !== ".material") {
			name += ".material";
		}

		material.metadata ??= {};
		material.metadata.editorPath = join(relativePath, name);

		await writeJSON(join(this.state.currentDirectory, name), {
			...material.serialize(),
			metadata: Tools.CloneObject(material.metadata),
		}, {
			spaces: "\t",
			encoding: "utf-8",
		});

		await this.refresh();
	}
}
