import { join } from "path";

import { Nullable } from "../../../shared/types";

import * as React from "react";
import SplitPane from "react-split-pane";

import { Editor } from "../editor";

import { FSTools } from "../tools/fs";

import { WorkSpace } from "../project/workspace";

import { AssetsBrowserTree } from "./assets-browser/tree";
import { AssetsBrowserFiles } from "./assets-browser/files";

export interface IAssetsBrowserProps {
	/**
	 * Defines the reference to the editor.
	 */
	editor: Editor;
}

export interface IAssetsBrowserState {
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
	 */
	public static async Init(): Promise<void> {
		if (!WorkSpace.DirPath) {
			return;
		}

		await FSTools.CreateDirectory(join(WorkSpace.DirPath, "assets"));
	}

	/**
	 * Defines the absolute path to the assets directory.
	 */
	public assetsDirectory: string = "";

	private _editor: Editor;
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
				split="vertical"
				// size={this.state.paneWidth}
				minSize={AssetsBrowser._SplitMinSize}
				// onChange={(r) => this.setState({ paneWidth: r })}
				// pane2Style={{ width: `${layoutSize.width - this.state.paneWidth}px` }}
			>
				<AssetsBrowserTree />
				<AssetsBrowserFiles ref={(r) => this._files = r} editor={this._editor} />
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
		this._files?.setDirectory(browsedPath);
	}

	/**
	 * Refreshes the current directory.
	 */
	public async refresh(): Promise<void> {
		await this._files?.refresh();
	}
}
