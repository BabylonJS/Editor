import Glob from "glob";
import * as os from "os";
import { shell } from "electron";
import { basename, dirname, extname, join } from "path";
import { move, pathExists, stat, writeJSON } from "fs-extra";

import { IStringDictionary, Nullable } from "../../../shared/types";

import * as React from "react";
import { Pre } from "@blueprintjs/core";
import SplitPane from "react-split-pane";

import { Editor } from "../editor";

import { Alert } from "../gui/alert";

import { FSTools } from "../tools/fs";
import { Tools } from "../tools/tools";

import { Project } from "../project/project";
import { WorkSpace } from "../project/workspace";

import { AssetsBrowserTree } from "./assets-browser/tree";
import { AssetsBrowserFiles } from "./assets-browser/files";
import { AssetsBrowserItem } from "./assets-browser/files/item";

export interface IAssetsBrowserProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
}

export interface IAssetsBrowserState {
	/**
	 * Defines width in pixels of the pane.
	 */
	paneWidth: number;
	/**
	 * Defines the current absolute path being browsed.
	 */
	browsedPath: string;
}

export class AssetsBrowser extends React.Component<IAssetsBrowserProps, IAssetsBrowserState> {
	private static _SplitMinSize: number = 200;

	/**
	 * Initializes the assets browser. Will typically create the "assets" folder
	 * located in the root directory of the loaded workspace.
	 * @param editor defines the reference to the editor.
	 */
	public static async Init(editor: Editor): Promise<void> {
		if (!WorkSpace.DirPath) {
			return;
		}

		await FSTools.CreateDirectory(join(WorkSpace.DirPath, "assets"));
		await AssetsBrowserFiles.Init(editor);
	}

	/**
	 * Defines the absolute path to the assets directory.
	 */
	public assetsDirectory: string = "";
	/**
	 * Defines the reference to the dictionary that stores all the moved assets.
	 */
	public movedAssetsDictionary: IStringDictionary<string> = { };

	private _editor: Editor;

	private _tree: Nullable<AssetsBrowserTree> = null;
	private _files: Nullable<AssetsBrowserFiles> = null;

	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IAssetsBrowserProps) {
		super(props);

		this._editor = props.editor;
		this._editor.assetsBrowser = this;

		this.state = {
			browsedPath: "",
			paneWidth: AssetsBrowser._SplitMinSize,
		};
	}

	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		if (!this.state.browsedPath) {
			return (<></>);
		}

		return (
			<SplitPane
				size="75%"
				split="vertical"
				minSize={AssetsBrowser._SplitMinSize}
				onChange={(r) => this.setState({ paneWidth: r })}
				primary="second"
			>
				<AssetsBrowserTree
					editor={this._editor}
					ref={(r) => this._tree = r}
					onDirectorySelected={(p) => this._files?.setDirectory(p)}
				/>
				<AssetsBrowserFiles
					editor={this._editor}
					ref={(r) => this._files = r}
					onDirectorySelected={(p) => this._tree?.setDirectory(p)}
				/>
			</SplitPane>
		);
	}

	/**
	 * Sets the workspace directory absolute path and refreshes the component.
	 * @param workspacePath defines the absolute path to the workspace directory.
	 */
	public setWorkspaceDirectoryPath(workspacePath: string): void {
		const browsedPath = join(workspacePath, "assets");

		if (!this.assetsDirectory) {
			this.assetsDirectory = browsedPath;
		}

		this.setState({ browsedPath });

		this._tree?.setDirectory(browsedPath);
		this._files?.setDirectory(browsedPath);
	}

	/**
	 * Reveals the assets-browser panel in the layout, shows the directory of the given file and makes the file selected.
	 * @param relativePath defines the path of the file to show relative to the assets directory.
	 */
	public async revealPanelAndShowFile(relativePath: Nullable<string>): Promise<void> {
		if (!relativePath) {
			return;
		}

		this._editor.showTab("assets-browser");
		this.showFile(relativePath);
	}

	/**
	 * Shows the directory of the given file and makes the file selected.
	 * @param relativePath defines the path of the file to show relative to the assets directory.
	 */
	public async showFile(relativePath: string): Promise<void> {
		const directory = dirname(relativePath);
		const absolutePath = join(this.state.browsedPath, directory);

		if (!await pathExists(absolutePath)) {
			return;
		}

		await Promise.all([
			this._tree?.setDirectory(absolutePath),
			this._files?.setDirectory(absolutePath),
		]);

		await Tools.Wait(0);

		this._files?._items.find((i) => i.props.relativePath === relativePath)?.setState({
			isSelected: true,
		});
	}

	/**
	 * Refreshes the current directory.
	 */
	public async refresh(): Promise<void> {
		this._tree?.refresh();
		await this._files?.refresh();
	}

	/**
	 * Returns the list of all selected items.
	 */
	public get selectedFiles(): string[] {
		return this._files?.selectedItems ?? [];
	}

	/**
	 * Returns the list of all available scripts.
	 */
	public async getAllScripts(): Promise<string[]> {
		if (!WorkSpace.DirPath) {
			return [];
		}

		const files = await new Promise<string[]>((resolve, reject) => {
			Glob(join(WorkSpace.DirPath!, "src", "scenes", "**", "*.ts"), {}, (err, files) => {
				if (err) {
					reject(err);
				} else {
					resolve(files);
				}
			});
		});

		const excluded = [
			"src/scenes/fx.ts",
			"src/scenes/tools.ts",
			"src/scenes/decorators.ts",
			"src/scenes/scripts-map.ts",
		];

		return files.filter((f) => f.indexOf("index.ts") === -1)
			.map((f) => f.replace(/\\/g, "/").replace(WorkSpace.DirPath!.replace(/\\/g, "/"), ""))
			.filter((f) => excluded.indexOf(f) === -1);
	}

	/**
	 * Renames the given file by updating all known references.
	 * @param absolutePath defines the absolute path to the file to rename.
	 * @param newName defines the new name of the file to apply.
	 */
	public async renameFile(absolutePath: string, newName: string): Promise<void> {
		const extension = extname(absolutePath).toLowerCase();

		if (extname(newName).toLowerCase() !== extension) {
			newName += extension;
		}

		const destination = join(dirname(absolutePath), newName);
		if ((await pathExists(destination))) {
			return;
		}

		const handler = AssetsBrowserItem._ItemMoveHandlers.find((h) => h.extensions.indexOf(extension) !== -1);
		if (handler) {
			await handler.moveFile(absolutePath, destination);
		}

		await move(absolutePath, destination);

		this.refresh();
	}

	/**
	 * Moves all the selected items to trash and returns the list of failed items.
	 * @param deleteOnFail defines wether or not the file should be deleted if failed to move to trash.
	 */
	public async moveSelectedItemsToTrash(deleteOnFail: boolean): Promise<string[]> {
		if (!this._files?.selectedItems.length) {
			return [];
		}

		const usedFiles: string[] = [];
		const isUsedCheckResults = await Promise.all(this._files.selectedItems.map(async (i) => {
			let files = [i];
			
			const fStat = await stat(i);
			if (fStat.isDirectory()) {
				files = await FSTools.GetGlobFiles(join(i, "**", "*.*"));
			}

			const result = await Promise.all(files.map(async (f) => {
				const extension = extname(f).toLowerCase();
				const handler = AssetsBrowserItem._ItemMoveHandlers.find((h) => h.extensions.indexOf(extension) !== -1);
	
				const isUsed = await handler?.isFileUsed(f) ?? false;
				if (isUsed) {
					usedFiles.push(f);
				}

				return isUsed;
			}));

			return result.includes(true);
		}));

		if (isUsedCheckResults.includes(true)) {
			Alert.Show("Can't remove file(s)", "Following files are used in the scene:", undefined, (
				<Pre>
					<ul>
						{usedFiles.map((uf) => <li>{uf}</li>)}
					</ul>
				</Pre>
			));
			return [];
		}

		const failed: string[] = [];
		const platform = os.platform();

		this._files.selectedItems.map((i) => {
			const extension = extname(i).toLowerCase();
			const handler = AssetsBrowserItem._ItemMoveHandlers.find((h) => h.extensions.indexOf(extension) !== -1);

			handler?.onRemoveFile(i);

			const iAbsolute = platform === "win32" ? i.replace(/\//g, "\\") : i;
			const result = shell.moveItemToTrash(iAbsolute, deleteOnFail);
			if (!result) {
				failed.push(i);
			}
		});

		return failed;
	}

	/**
	 * Moves the currently selected items to the given destination folder (to)
	 * @param to defines the absolute path to the folder where to move the asset.
	 * @param items defines the optional list of items to move.
	 */
	public async moveSelectedItems(to: string, items?: string[], renamedFolder?: string): Promise<void> {
		const selectedItems = items ?? this._files?.selectedItems;
		if (!selectedItems?.length) {
			return;
		}

		const promises: Promise<void>[] = [];

		for (const item of selectedItems) {
			const iStats = await stat(item);

			if (iStats.isDirectory()) {
				// Check directory dropped on itself or same location
				if (join(item, "/") === join(to, "/") || (!renamedFolder && dirname(item) === to)) {
					continue;
				}

				const directoryPromises: Promise<void>[] = [];
				const filesToMove = await FSTools.GetGlobFiles(join(item, "**", "*.*"));

				for (const f of filesToMove) {
					const destination = renamedFolder ?
						dirname(f.replace(item, join(to, renamedFolder))) :
						dirname(f.replace(dirname(item), to));

					directoryPromises.push(this._moveFile(f, destination, false));
				}

				promises.push(new Promise<void>(async (resolve) => {
					await Promise.all(directoryPromises);
					await move(item, join(to, renamedFolder ?? basename(item)));

					resolve();
				}));
			} else {
				promises.push(this._moveFile(item, to, true));
			}
		}

		await Promise.all(promises);
		await this.refresh();

		await writeJSON(join(Project.DirPath!, "../links.json"), this.movedAssetsDictionary, {
			spaces: "\t",
			encoding: "utf-8",
		});
	}

	/**
	 * Moves the given file to the given destination. When moving a folder (specific case) the given file
	 * will not be moved as "physicallyMove" will be set to false.
	 */
	private async _moveFile(absolutePath: string, to: string, physicallyMove: boolean): Promise<void> {
		const extension = extname(absolutePath).toLowerCase();
		const destination = join(to, basename(absolutePath));

		const relativePath = absolutePath.replace(join(this.assetsDirectory, "/"), "");
		const relativeDestination = destination.replace(join(this.assetsDirectory, "/"), "");

		// Manage moving asset
		let foundMovedAssetPath = false;

		if (this.movedAssetsDictionary[relativeDestination]) {
			// Come back to original path
			foundMovedAssetPath = true;
			delete this.movedAssetsDictionary[relativeDestination];
		} else {
			// Check for already moved to another folder
			for (const key in this.movedAssetsDictionary) {
				const movedAssetPath = this.movedAssetsDictionary[key];
				if (movedAssetPath === relativePath) {
					foundMovedAssetPath = true;
					this.movedAssetsDictionary[key] = relativeDestination;

					break;
				}
			}
		}

		if (!foundMovedAssetPath) {
			// First move, add to moved assets
			this.movedAssetsDictionary[relativePath] = relativeDestination;
		}

		// Call handlers
		const handler = AssetsBrowserItem._ItemMoveHandlers.find((h) => h.extensions.indexOf(extension) !== -1);
		if (handler) {
			await handler.moveFile(absolutePath, destination);
		}

		if (physicallyMove && !(await pathExists(destination))) {
			await move(absolutePath, destination);
		}
	}
}
