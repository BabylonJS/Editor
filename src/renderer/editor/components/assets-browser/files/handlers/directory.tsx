import * as React from "react";

import { Icon } from "../../../../gui/icon";

import { AssetsBrowserItemHandler } from "../item-handler";

export class DirectoryItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		return (
			<Icon
				src="folder-open.svg"
				style={{
					width: "100%",
					height: "100%",
				}}
			/>
		);
	}
}
