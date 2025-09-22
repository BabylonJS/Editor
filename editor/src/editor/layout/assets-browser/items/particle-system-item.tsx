import { ipcRenderer } from "electron";

import { ReactNode } from "react";
import { IoSparklesSharp } from "react-icons/io5";

import { getProjectAssetsRootUrl } from "../../../../project/configuration";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserParticleSystemItem extends AssetsBrowserItem {
	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		return <IoSparklesSharp size="64px" />;
	}

	/**
	 * @override
	 */
	protected async onDoubleClick(): Promise<void> {
		ipcRenderer.send("window:open", "build/src/editor/windows/npe", {
			filePath: this.props.absolutePath,
			rootUrl: getProjectAssetsRootUrl() ?? undefined,
		});
	}
}
