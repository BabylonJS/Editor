import { platform } from "os";
import { shell } from "electron";
import { basename, extname, join } from "path";
import { copyFile, mkdir, pathExists, readdir, readFile, readJSON, stat, Stats, writeFile, writeJSON } from "fs-extra";

import * as React from "react";
import Slider from "antd/lib/slider";
import {
	Boundary, Breadcrumbs, Button, ButtonGroup, Classes, IBreadcrumbProps, Intent, Menu,
	MenuDivider, MenuItem, Popover, Code, Divider, ContextMenu, Icon as BPIcon,
} from "@blueprintjs/core";

import { Tools as BabylonTools, Material, NodeMaterial, ParticleSystem, Mesh } from "babylonjs";

import { Editor } from "../../editor";

import { Icon } from "../../gui/icon";
import { Alert } from "../../gui/alert";
import { Dialog } from "../../gui/dialog";

import { Tools } from "../../tools/tools";

import { WorkSpace } from "../../project/workspace";
import { SceneExporter } from "../../project/scene-exporter";

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
	 * Defines the current size value for the items.
	 */
	itemsSize: number;

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
	 * Initializes the files component.
	 * @param editor defines the reference to the editor.
	 */
	public static async Init(editor: Editor): Promise<void> {
		AssetsBrowserItem.Init(editor);
		await AssetsBrowserItemHandler.Init();
	}

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IAssetsBrowserFilesProps) {
		super(props);

		this.state = {
			items: [],
			itemsSize: 1,
			pathStack: [],
			currentDirectory: "",
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		const isMacOs = platform() === "darwin";
		const isAssetsDirectory = this.state.currentDirectory.indexOf(this._assetsDirectory) === 0;

		const addContent = (
			<Menu>
				<MenuItem text="Material" disabled={!isAssetsDirectory} icon={<Icon src="circle.svg" />}>
					<MenuItem text="Standard Material..." onClick={() => this._handleCreateMaterial("StandardMaterial")} />
					<MenuItem text="PBR Material..." onClick={() => this._handleCreateMaterial("PBRMaterial")} />
					<MenuItem text="Node Material..." onClick={() => this._handleCreateMaterial("NodeMaterial")} />
					<MenuDivider />
					<MenuItem text="Node Material From Snippet..." onClick={() => this._handleAddNodeMaterialFromWeb()} />
					<MenuDivider />
					<Code>Materials Library</Code>
					<MenuItem text="Sky Material..." onClick={() => this._handleCreateMaterial("SkyMaterial")} />
					<MenuItem text="Cel Material..." onClick={() => this._handleCreateMaterial("CellMaterial")} />
					<MenuItem text="Fire Material..." onClick={() => this._handleCreateMaterial("FireMaterial")} />
					<MenuItem key="add-lava-material" text="Add Lava Material..." onClick={() => this._handleCreateMaterial("LavaMaterial")} />
					<MenuItem key="add-water-material" text="Add Water Material..." onClick={() => this._handleCreateMaterial("WaterMaterial")} />
					<MenuItem key="add-tri-planar-material" text="Add Tri Planar Material..." onClick={() => this._handleCreateMaterial("TriPlanarMaterial")} />
				</MenuItem>

				<MenuItem text="Particles System" disabled={!isAssetsDirectory} icon={<Icon src="wind.svg" />}>
					<MenuItem text="Particles System..." onClick={() => this._handleCreateParticlesSystem()} />
				</MenuItem>

				<MenuDivider />

				<MenuItem text="TypeScript File..." disabled={isAssetsDirectory} icon={<Icon src="../images/ts.png" style={{ filter: "none" }} />} onClick={() => this._handleAddScript()} />
				<MenuItem text="Graph File..." disabled={!isAssetsDirectory} icon={<Icon src="project-diagram.svg" />} onClick={() => this._handleAddGraph()} />
			</Menu>
		);

		const view = (
			<Menu>
				<MenuDivider title="Items Size" />
				<div style={{ width: "200px", height: "50px" }}>
					<MenuItem disabled={true} text={
						<Slider min={0.5} max={1} step={0.01} value={this.state.itemsSize} onChange={(v) => {
							this.setState({ itemsSize: v }, () => {
								this._items.forEach((i) => i.setState({ size: v }));
							});
						}} />
					} />
				</div>
				<MenuDivider />
				<MenuItem
					icon={<BPIcon icon="document-open" color="white" />}
					text={`Reveal in ${isMacOs ? "Finder" : "Explorer"}`}
					onClick={() => shell.openItem(Tools.NormalizePathForCurrentPlatform(this.state.currentDirectory))}
				/>
				<MenuDivider />
				<MenuItem text="Refresh" icon={<Icon src="recycle.svg" />} onClick={() => this.props.editor.assetsBrowser.refresh()} />
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
						<Button text="Import..." icon="import" disabled={!isAssetsDirectory} intent="primary" small style={{ minWidth: "120px" }} onClick={() => this._handleImportFiles()} />
						<Divider />
						<Popover key="add-popover" position="bottom-left" content={addContent}>
							<Button text="Add" small icon={<Icon src="plus.svg" />} rightIcon="caret-down" />
						</Popover>
						<Divider />
						<Popover key="view-popover" position="bottom-left" content={view}>
							<Button text="View" small icon={<Icon src="eye.svg" />} rightIcon="caret-down" />
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
						gridTemplateRows: `repeat(auto-fill, ${120 * this.state.itemsSize}px)`,
						gridTemplateColumns: `repeat(auto-fill, ${120 * this.state.itemsSize}px)`,
					}}
					onContextMenu={(ev) => this._handleContextMenu(ev)}
				>
					{this.state.items}
				</div>
			</div>
		)
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

		const isSrcDirectory = directoryPath.indexOf(this._sourcesDirectory) === 0;

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
					size={this.state.itemsSize}
					type={fStats.isDirectory() ? "directory" : "file"}
					relativePath={absolutePath.replace(join(isSrcDirectory ? this._sourcesDirectory : this._assetsDirectory, "/"), "")}

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
		if (ev.ctrlKey || ev.metaKey) {
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
		});
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
	 * Called on the user wants to create a new particles system.
	 */
	private async _handleCreateParticlesSystem(): Promise<void> {
		let name = await Dialog.Show("Particles System Name", "Please provide a name for the new particles system to created.");

		const emitter = new Mesh(name, this.props.editor.scene!);
		emitter.id = Tools.RandomId();

		const ps = new ParticleSystem(name, 1000, this.props.editor.scene!);
		ps.emitter = emitter;
		ps.id = Tools.RandomId();

		const extension = extname(name).toLowerCase();
		if (extension !== ".ps") {
			name += ".ps";
		}

		const relativePath = this.state.currentDirectory.replace(join(this._assetsDirectory, "/"), "");

		ps["metadata"] ??= {};
		ps["metadata"].editorPath = join(relativePath, name);

		await writeJSON(join(this.state.currentDirectory, name), {
			...ps.serialize(true),
			metadata: Tools.CloneObject(ps["metadata"]),
		}, {
			spaces: "\t",
			encoding: "utf-8",
		});

		this.props.editor.graph.refresh();

		await this.refresh();
	}

	/**
	 * Called on the user wants to add a new TypeScript script.
	 */
	private async _handleAddScript(): Promise<void> {
		let name = await Dialog.Show("Script Name", "Please provide a name for the new TypeScript script.");

		const extension = extname(name).toLowerCase();
		if (extension !== ".ts") {
			name += ".ts";
		}

		const dest = join(this.state.currentDirectory, name);
		if (await pathExists(dest)) {
			return Alert.Show("Can't Create Script", `A script named "${name}" already exists.`);
		}

		const tsConfig = await readJSON(join(WorkSpace.DirPath!, "tsconfig.json"), { encoding: "utf-8" });
		const isEs5 = (tsConfig.compilerOptions?.target?.toLowerCase() ?? "es5") === "es5";

		const skeleton = await readFile(join(Tools.GetAppPath(), `assets/scripts/${isEs5 ? "script.ts" : "script-es6.ts"}`), { encoding: "utf-8" });
		await writeFile(dest, skeleton);

		await SceneExporter.GenerateScripts(this.props.editor);

		await this.refresh();
	}

	/**
	 * Called on the user wants to add a new graph file.
	 */
	private async _handleAddGraph(): Promise<void> {
		let name = await Dialog.Show("Graph Name", "Please provide a name for the new Graph file.");

		const extension = extname(name).toLowerCase();
		if (extension !== ".graph") {
			name += ".graph";
		}

		const dest = join(this.state.currentDirectory, name);
		if (await pathExists(dest)) {
			Alert.Show("Can't Create Graph File", `A graph named "${name}" already exists.`);
		}

		const skeleton = await readFile(join(Tools.GetAppPath(), `assets/graphs/default.json`), { encoding: "utf-8" });
		await writeFile(dest, skeleton);

		await SceneExporter.GenerateScripts(this.props.editor);

		await this.refresh();
	}

	/**
	 * Called on the user wants to add a new material asset.
	 */
	private async _handleCreateMaterial(type: string): Promise<void> {
		let name = await Dialog.Show("Material Name", "Please provide a name for the new material to created.");

		const ctor = BabylonTools.Instantiate(`BABYLON.${type}`);
		const material = new ctor(name, this.props.editor.scene!);

		material.id = Tools.RandomId();

		if (material instanceof NodeMaterial) {
			material.setToDefault();
			material.build(true);
		}

		this._configureNewMaterial(name, material);
	}

	/**
	* Called on the user wants to add a new Node Material from the given snippet Id.
	*/
	private async _handleAddNodeMaterialFromWeb(): Promise<void> {
		const snippetId = await Dialog.Show("Snippet Id", "Please provide the Id of the snippet.");

		try {
			const material = await NodeMaterial.ParseFromSnippetAsync(snippetId, this.props.editor.scene!);
			material.id = Tools.RandomId();

			await this._configureNewMaterial(snippetId, material);
		} catch (e) {
			Alert.Show("Failed to load from snippet", e.message);
		}
	}

	/**
	 * Configures the newly created material.
	 */
	private async _configureNewMaterial(name: string, material: Material): Promise<void> {
		const relativePath = this.state.currentDirectory.replace(join(this._assetsDirectory, "/"), "");

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

		await Promise.all([this.refresh(), this.props.editor.assets.refresh()]);
	}
}
