import { ipcRenderer } from "electron";
import { basename, join, dirname } from "path/posix";
import { pathExists, readJSON, writeJSON } from "fs-extra";

import { ReactNode } from "react";

import { FaRegClone } from "react-icons/fa6";
import { GiMaterialsScience } from "react-icons/gi";

import { Tools } from "babylonjs";

import { SpinnerUIComponent } from "../../../../ui/spinner";
import { showAlert, showPrompt } from "../../../../ui/dialog";
import { ContextMenuItem } from "../../../../ui/shadcn/ui/context-menu";

import { UniqueNumber } from "../../../../tools/tools";

import { openMaterialViewer } from "../viewers/material-viewer";

import { computeOrGetThumbnail } from "../../../../tools/assets/thumbnail";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserMaterialItem extends AssetsBrowserItem {
	private _thumbnailError: boolean = false;
	private _thumbnailBase64: string | null = null;

	/**
	 * @override
	 */
	public async componentDidMount(): Promise<void> {
		await super.componentDidMount();
		await this._computeThumbnail();
	}

	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		if (this._thumbnailBase64) {
			return <img alt="" src={this._thumbnailBase64} className="w-[120px] aspect-square object-contain ring-blue-500 ring-2 rounded-lg" />;
		}

		if (this._thumbnailError) {
			return <GiMaterialsScience size="64px" />;
		}

		return <SpinnerUIComponent width="64px" />;
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
	 * @override
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

	private async _computeThumbnail(): Promise<void> {
		if (!(await pathExists(this.props.absolutePath))) {
			return;
		}

		this._thumbnailBase64 = await computeOrGetThumbnail(this.props.editor, {
			type: "material",
			absolutePath: this.props.absolutePath,
		});

		if (!this._thumbnailBase64) {
			this._thumbnailError = true;
		}

		this.forceUpdate();
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
