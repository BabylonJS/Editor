import * as React from "react";

import { Icon } from "../../../../gui/icon";

import { AssetsBrowserItemHandler } from "../item-handler";

export class FileItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		return (
			<Icon
				src="file.svg"
				style={{
					width: "100%",
					height: "100%",
				}}
			/>
		);
	}
}
