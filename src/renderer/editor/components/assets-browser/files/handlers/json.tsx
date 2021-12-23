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
}
