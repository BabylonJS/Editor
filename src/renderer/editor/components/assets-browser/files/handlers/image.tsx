import * as React from "react";

import { AssetsBrowserItemHandler } from "../item-handler";

export class ImageItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		return (
			<img
				src={this.props.absolutePath}
				style={{
					width: "100%",
					height: "100%",
				}}
			/>
		);
	}

	/**
	 * Called on the user double clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		this.props.editor.addWindowedPlugin("texture-viewer", undefined, this.props.absolutePath);
	}
}
