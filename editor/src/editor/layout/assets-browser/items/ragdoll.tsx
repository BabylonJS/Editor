import { readJSON } from "fs-extra";

import { ReactNode } from "react";
import { GiSkeletonInside } from "react-icons/gi";

import { IRagDollConfiguration, parseRagdollConfiguration } from "babylonjs-editor-tools";

import { loadSavedAssetsCache } from "../../../../tools/assets/cache";

import { RagdollEditor } from "../../ragdoll/editor";

import { AssetsBrowserItem } from "./item";

export class AssetBrowserRagdollItem extends AssetsBrowserItem {
	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		return (
			<div className="flex justify-center items-center w-[120px] aspect-square object-cover ring-pink-500 ring-2 rounded-lg">
				<GiSkeletonInside size="64px" />
			</div>
		);
	}

	/**
	 * @override
	 */
	protected async onDoubleClick(): Promise<void> {
		const data = (await readJSON(this.props.absolutePath)) as IRagDollConfiguration;

		const assetsCache = loadSavedAssetsCache();
		if (data.assetRelativePath && assetsCache[data.assetRelativePath]) {
			data.assetRelativePath = assetsCache[data.assetRelativePath].newRelativePath;
		}

		parseRagdollConfiguration(data);

		this.props.editor.layout.addLayoutTab(<RagdollEditor editor={this.props.editor} configuration={data} absolutePath={this.props.absolutePath} />, {
			setAsActiveTab: true,
			neighborId: "inspector",
			title: "Ragdoll Editor",
		});
	}
}
