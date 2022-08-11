import { basename, join } from "path";

import * as React from "react";
import { ContextMenu, Menu } from "@blueprintjs/core";

import { Icon } from "../../../../gui/icon";
import { Confirm } from "../../../../gui/confirm";
import { Overlay } from "../../../../gui/overlay";

import { WorkSpace } from "../../../../project/workspace";

import { AssetsBrowserItemHandler } from "../item-handler";

export class SceneItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		return (
			<Icon
				src="logo-babylon.svg"
				style={{
					width: "100%",
					height: "100%",
					filter: "none",
					objectFit: "contain",
				}}
			/>
		);
	}

	/**
	 * Called on the user right clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		ContextMenu.show((
			<Menu>
				{this.getCommonContextMenuItems()}
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}

	/**
	 * Called on the user double clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public async onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): Promise<void> {
		const filename = basename(this.props.relativePath);
        const sceneName = filename.replace(".scene", "");

		if (sceneName === WorkSpace.GetProjectName()) {
			return;
		}

		if (!(await Confirm.Show("Load scene?", "Are you sure to close the current scene?"))) {
			return;
		}

		Overlay.Show("Loading Scene...", true);
		
		await WorkSpace.WriteWorkspaceFile(join(WorkSpace.DirPath!, "projects", sceneName, "scene.editorproject"));

		this.props.editor._byPassBeforeUnload = true;
		window.location.reload();
	}
}
