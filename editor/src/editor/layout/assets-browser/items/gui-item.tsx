import { readJSON } from "fs-extra";
import { dirname } from "path/posix";
import { ipcRenderer } from "electron";

import { ReactNode } from "react";

import { CgIfDesign } from "react-icons/cg";

import { projectConfiguration } from "../../../../project/configuration";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserGUIItem extends AssetsBrowserItem {
	private _base64Value: string | null = null;

	public async componentDidMount(): Promise<void> {
		try {
			const data = await readJSON(this.props.absolutePath);
			if (data.base64String) {
				this._base64Value = data.base64String;
				this.forceUpdate();
			}
		} catch (e) {
			// Catch silently.
		}

		return super.componentDidMount();
	}

	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		return this._base64Value ? <img src={this._base64Value} className="w-[120px] aspect-square object-contain" /> : <CgIfDesign size="64px" />;
	}

	/**
	 * @override
	 */
	protected async onDoubleClick(): Promise<void> {
		if (!projectConfiguration.path) {
			return;
		}

		ipcRenderer.send("window:open", "build/src/editor/windows/ge", {
			filePath: this.props.absolutePath,
			projectPath: dirname(projectConfiguration.path),
		});
	}
}
