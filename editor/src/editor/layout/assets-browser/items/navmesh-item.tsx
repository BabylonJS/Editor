import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { ReactNode } from "react";
import { GiStonePath } from "react-icons/gi";

import { NavMeshEditor } from "../../navmesh/editor";

import { AssetsBrowserItem } from "./item";

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
		const data = await readJSON(join(this.props.absolutePath, "config.json"));

		this.props.editor.layout.addLayoutTab("Navmesh Editor", <NavMeshEditor editor={this.props.editor} configuration={data} absolutePath={this.props.absolutePath} />);
	}
}
