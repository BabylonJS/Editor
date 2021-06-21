import * as React from "react";

import { Icon } from "../../../../gui/icon";

import { AssetsBrowserItemHandler } from "../item-handler";

export class KTXItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		return (
			<Icon
				src="../images/ktx.png"
				style={{
					width: "100%",
					height: "100%",
					filter: "none",
					marginTop: "25%",
				}}
			/>
		);
	}
}
