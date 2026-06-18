import { ipcRenderer } from "electron";
import { join, basename, dirname } from "path/posix";
import { copy, pathExists, readJSON, writeJSON } from "fs-extra";

import { ReactNode } from "react";

import { SiBabylondotjs } from "react-icons/si";
import { HiOutlineDuplicate, HiOutlineExternalLink } from "react-icons/hi";

import { ContextMenuCheckboxItem, ContextMenuItem, ContextMenuSeparator } from "../../../../ui/shadcn/ui/context-menu";

import { renameScene } from "../../../../tools/scene/rename";
import { waitNextAnimationFrame } from "../../../../tools/tools";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserSceneItem extends AssetsBrowserItem {
	private _doNotExport: boolean = false;
	private _previewPath: string | null = null;

	/**
	 * @override
	 */
	protected getContextMenuContent(): ReactNode {
		return (
			<>
				<ContextMenuItem className="flex items-center gap-2" onClick={() => this._handleDuplicate()}>
					<HiOutlineDuplicate className="w-5 h-5" /> Duplicate
				</ContextMenuItem>
				<ContextMenuItem className="flex items-center gap-2" onClick={() => this._handleEdit()}>
					<HiOutlineExternalLink className="w-5 h-5" /> Edit...
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuCheckboxItem checked={this._doNotExport} onClick={() => this._handleDoNotExport()}>
					Do not export
				</ContextMenuCheckboxItem>
			</>
		);
	}

	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		return this._previewPath ? (
			<img alt="" src={this._previewPath} className="w-[120px] aspect-square object-cover ring-purple-500 ring-2 rounded-lg" />
		) : (
			<SiBabylondotjs size="64px" />
		);
	}

	public async componentDidMount(): Promise<void> {
		super.componentDidMount();

		const previewPath = join(this.props.absolutePath, "preview.png");
		if (await pathExists(previewPath)) {
			this._previewPath = previewPath;
			this.forceUpdate();
		}

		const attributesPath = join(this.props.absolutePath, "attributes.json");
		if (await pathExists(attributesPath)) {
			const attributes = await readJSON(attributesPath);
			this._doNotExport = attributes.doNotExport;
			this.forceUpdate();
		}
	}

	private async _handleDuplicate(): Promise<void> {
		const dir = dirname(this.props.absolutePath);
		const name = basename(this.props.absolutePath, ".scene");

		// Choose name
		let index: number | undefined = undefined;
		while (await pathExists(join(dir, `${name}${index !== undefined ? ` ${index}` : ""}.scene`))) {
			index ??= 0;
			++index;
		}

		const newName = `${name}${index !== undefined ? ` ${index}` : ""}.scene`;
		const newAbsolutePath = join(dir, newName);

		// Copy scene folder
		await copy(this.props.absolutePath, newAbsolutePath);

		// Update relative paths related to scene (geometries, etc.).
		await renameScene(this.props.absolutePath, newAbsolutePath);

		// Refresh
		this.props.onRefresh();
		waitNextAnimationFrame().then(() => {
			this.props.editor.layout.assets.setSelectedFile(newAbsolutePath);
		});
	}

	private async _handleDoNotExport(): Promise<void> {
		this._doNotExport = !this._doNotExport;

		let attributes = {
			doNotExport: this._doNotExport,
		};

		const attributesPath = join(this.props.absolutePath, "attributes.json");
		if (await pathExists(attributesPath)) {
			attributes = await readJSON(attributesPath);
		}

		attributes.doNotExport = this._doNotExport;

		await writeJSON(attributesPath, attributes, {
			spaces: "\t",
			encoding: "utf-8",
		});

		this.forceUpdate();
	}

	private async _handleEdit(): Promise<void> {
		ipcRenderer.send("window:open", "build/src/editor/windows/scene", {
			appPath: this.props.editor.path,
			scenePath: this.props.absolutePath,
			projectPath: this.props.editor.state.projectPath,
		});
	}
}
