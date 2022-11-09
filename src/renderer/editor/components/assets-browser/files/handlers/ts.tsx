import { shell } from "electron";
import { join, extname } from "path";

import * as React from "react";
import { ContextMenu, Menu } from "@blueprintjs/core";

import { Node, Scene } from "babylonjs";

import { Icon } from "../../../../gui/icon";

import { WorkSpace } from "../../../../project/workspace";

import { AssetsBrowserItemHandler } from "../item-handler";

export class TypeScriptItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		const extension = extname(this.props.relativePath).toLowerCase();
		const iconSrc = extension === ".ts" ? "../images/ts.png" : "react.svg";

		return (
			<Icon
				src={iconSrc}
				style={{
					width: "100%",
					height: "100%",
					filter: "none",
				}}
			/>
		);
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
				{this.getCommonContextMenuItems()}
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}

	/**
	 * Called on the user starts dragging the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDragStart(ev: React.DragEvent<HTMLDivElement>): void {
		ev.dataTransfer.setData("asset/typescript", JSON.stringify({
			absolutePath: this.props.absolutePath,
			relativePath: this.props.relativePath,
		}));
		ev.dataTransfer.setData("plain/text", this.props.absolutePath);
	}

	/**
	 * Called on the user drops the asset in a supported inspector field.
	 * @param ev defiens the reference to the event object.
	 * @param object defines the reference to the object being modified in the inspector.
	 * @param property defines the property of the object to assign the asset instance.
	 */
	public async onDropInInspector(_: React.DragEvent<HTMLElement>, object: any, property: string): Promise<void> {
		object[property] = this.props.absolutePath.replace(join(WorkSpace.DirPath!, "/"), "");
	}

	/**
	 * Called on the user drops the asset in the editor's graph.
	 * @param ev defines the reference to the event object.
	 * @param objects defines the reference to the array of objects selected in the graph.
	 */
	public async onDropInGraph(_: React.DragEvent<HTMLElement>, objects: any[]): Promise<void> {
		const targets = objects.filter((o) => o instanceof Node || o instanceof Scene) as (Scene | Node)[];

		targets.forEach((t) => {
			t.metadata ??= {};
			t.metadata.script ??= {};
			t.metadata.script.name = join("src", this.props.relativePath);
		});

		this.props.editor.graph.refresh();
	}
}
