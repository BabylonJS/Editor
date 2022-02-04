import { join } from "path";
import { shell } from "electron";

import * as React from "react";
import { ContextMenu, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";

import { AssetsBrowserItemHandler, Icon } from "babylonjs-editor";

import { MarkdownEditableObject } from "../inspectors/md-inspector";

export class MarkdownItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		return (
			<Icon
				src={join(__dirname, "../../../assets/markdown.svg")}
				style={{
					width: "100%",
					height: "100%",
				}}
			/>
		);
	}

	/**
	 * Called on the user clicks on the asset.
	 * @param ev defines the reference to the event object.
	 */
	public onClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		this.props.editor.inspector.setSelectedObject(new MarkdownEditableObject(this.props.absolutePath));
	}

	/**
	 * Called on the user double clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		shell.openPath(this.props.absolutePath);
	}

	/**
	 * Called on the user right clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		ContextMenu.show((
			<Menu>
				<MenuItem text="Open..." onClick={() => shell.openPath(this.props.absolutePath)} />
				<MenuDivider />
				{this.getCommonContextMenuItems()}
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}
}
