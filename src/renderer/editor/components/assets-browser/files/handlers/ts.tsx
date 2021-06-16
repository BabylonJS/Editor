import { join } from "path";
import { shell } from "electron";

import * as React from "react";

import { Icon } from "../../../../gui/icon";

import { WorkSpace } from "../../../../project/workspace";

import { AssetsBrowserItemHandler } from "../item-handler";

export class TypeScriptItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		return (
			<Icon
				src="../images/ts.png"
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
		shell.openItem(this.props.absolutePath);
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
}
