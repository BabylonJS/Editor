import { ipcRenderer } from "electron";
import { basename, join, dirname } from "path/posix";
import { pathExists, readJSON, writeJSON } from "fs-extra";

import { ReactNode } from "react";

import { FaRegClone } from "react-icons/fa6";

import { Tools } from "babylonjs";

import { UniqueNumber } from "../../../../tools/tools";

import { showAlert, showPrompt } from "../../../../ui/dialog";
import { ContextMenuItem } from "../../../../ui/shadcn/ui/context-menu";

import { openMaterialViewer } from "../viewers/material-viewer";
import { MaterialThumbnailRenderer } from "../thumbnail/material-thumbnail";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserMaterialItem extends AssetsBrowserItem {
	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		return (
			<div className="w-full h-full pointer-events-none">
				<MaterialThumbnailRenderer absolutePath={this.props.absolutePath} />
			</div>
		);
	}

	/**
	 * @override
	 */
	protected async onDoubleClick(): Promise<void> {
		const data = await readJSON(this.props.absolutePath);
		if (data.customType === "BABYLON.NodeMaterial") {
			ipcRenderer.send("window:open", "build/src/editor/windows/nme", {
				filePath: this.props.absolutePath,
			});
		} else {
			openMaterialViewer(this.props.editor, this.props.absolutePath);
		}
	}

	/**
	 * Returns the context menu content for the current item.
	 * To be overriden by the specialized items implementations.
	 */
	protected getContextMenuContent(): ReactNode {
		return (
			<>
				<ContextMenuItem className="flex items-center gap-2" onClick={() => this._handleClone()}>
					<FaRegClone className="w-4 h-4" /> Clone...
				</ContextMenuItem>
			</>
		);
	}

	private async _handleClone(): Promise<unknown> {
		const data = await readJSON(this.props.absolutePath);
		data.id = Tools.RandomId();
		data.uniqueId = UniqueNumber.Get();

		let name = await showPrompt("Enter the name for the cloned material", undefined, basename(this.props.absolutePath).replace(".material", ""));

		if (!name) {
			return;
		}

		if (!name.endsWith(".material")) {
			name += ".material";
		}

		const absoluteDestination = join(dirname(this.props.absolutePath), name);

		if (await pathExists(absoluteDestination)) {
			return showAlert("Can't clone material", `A material with name ("${name}") already exists in the current folder.`);
		}

		await writeJSON(absoluteDestination, data, {
			spaces: "\t",
			encoding: "utf-8",
		});

		this.props.editor.layout.assets.refresh();
		this.props.editor.layout.assets.setSelectedFile(absoluteDestination);
	}
}
