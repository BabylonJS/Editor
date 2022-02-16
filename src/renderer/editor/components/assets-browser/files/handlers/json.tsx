import { shell } from "electron";

import * as React from "react";

import { Icon } from "../../../../gui/icon";

import { FileItemHandler } from "./file";

export class JsonItemHandler extends FileItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		return (
			<Icon
				src="json.svg"
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
}
