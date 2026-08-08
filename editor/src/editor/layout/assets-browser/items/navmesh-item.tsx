import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { ReactNode } from "react";
import { GiStonePath } from "react-icons/gi";

import { NavMeshEditor } from "../../navmesh/editor";

import { AssetsBrowserItem } from "./item";

interface _IEditedNavMeshConfiguration {
	tabId: string;
	absolutePath: string;
}

const editedNavMeshConfigurations: _IEditedNavMeshConfiguration[] = [];

export class AssetBrowserNavmeshItem extends AssetsBrowserItem {
	/**
	 * @override
	 */
	protected getIcon(): ReactNode {
		return (
			<div className="flex justify-center items-center w-[120px] aspect-square object-cover ring-orange-500 ring-2 rounded-lg">
				<GiStonePath size="64px" />
			</div>
		);
	}

	/**
	 * @override
	 */
	protected async onDoubleClick(): Promise<void> {
		const existingConfiguration = editedNavMeshConfigurations.find((c) => c.absolutePath === this.props.absolutePath);
		if (existingConfiguration) {
			this.props.editor.layout.selectTab(existingConfiguration.tabId);
			return;
		}

		const data = await readJSON(join(this.props.absolutePath, "config.json"));

		const tabId = this.props.editor.layout.addLayoutTab(
			<NavMeshEditor
				editor={this.props.editor}
				configuration={data}
				absolutePath={this.props.absolutePath}
				onClose={() => {
					const index = editedNavMeshConfigurations.findIndex((c) => c.tabId === tabId);
					if (index !== -1) {
						editedNavMeshConfigurations.splice(index, 1);
					}
				}}
			/>,
			{
				setAsActiveTab: true,
				title: "NavMesh Editor",
				neighborId: "inspector",
			}
		);

		editedNavMeshConfigurations.push({
			tabId,
			absolutePath: this.props.absolutePath,
		});
	}
}
