import { pathExists, writeJSON } from "fs-extra";

import { ReactNode } from "react";

import { SiConvertio } from "react-icons/si";
import { BiSolidCube } from "react-icons/bi";

import { Scene, SceneSerializer } from "babylonjs";

import { SpinnerUIComponent } from "../../../../ui/spinner";
import { ContextMenuItem } from "../../../../ui/shadcn/ui/context-menu";

import { loadImportedSceneFile } from "../../preview/import/import";

import { computeOrGetThumbnail } from "../../../../tools/assets/thumbnail";

import { AssetsBrowserItem } from "./item";

const convertingFiles: string[] = [];

export class AssetBrowserMeshItem extends AssetsBrowserItem {
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
	protected getContextMenuContent(): ReactNode {
		return (
			<>
				<ContextMenuItem className="flex items-center gap-2" onClick={() => this._handleConvertSceneFileToBabylon()}>
					<SiConvertio className="w-5 h-5" /> Convert to .babylon
				</ContextMenuItem>
			</>
		);
	}

	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		const index = convertingFiles.indexOf(this.props.absolutePath);
		if (index !== -1) {
			return <SpinnerUIComponent width="64px" />;
		}

		if (this._thumbnailBase64) {
			return <img alt="" src={this._thumbnailBase64} className="w-[120px] aspect-square object-contain ring-blue-500 ring-2 rounded-lg" />;
		}

		if (this._thumbnailError) {
			return <BiSolidCube size="64px" />;
		}

		return <SpinnerUIComponent width="64px" />;
	}

	private async _computeThumbnail(): Promise<void> {
		if (!(await pathExists(this.props.absolutePath))) {
			return;
		}

		this._thumbnailBase64 = await computeOrGetThumbnail(this.props.editor, {
			type: "mesh",
			absolutePath: this.props.absolutePath,
		});

		if (!this._thumbnailBase64) {
			this._thumbnailError = true;
		}

		this.forceUpdate();
	}

	private async _handleConvertSceneFileToBabylon(): Promise<void> {
		const selectedFiles = this.props.editor.layout.assets.state.selectedKeys;

		await Promise.all(
			selectedFiles.map(async (file) => {
				if (convertingFiles.includes(file)) {
					return;
				}

				convertingFiles.push(file);
				this.props.onRefresh();

				const scene = new Scene(this.props.editor.layout.preview.engine);
				await loadImportedSceneFile(scene, file);

				const data = await SceneSerializer.SerializeAsync(scene);
				await writeJSON(`${file}.babylon`, data, "utf-8");

				const index = convertingFiles.indexOf(file);
				if (index !== -1) {
					convertingFiles.splice(index, 1);
				}

				this.props.onRefresh();
			})
		);
	}
}
