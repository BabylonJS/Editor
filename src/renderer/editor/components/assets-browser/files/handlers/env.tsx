import { basename, dirname, join } from "path";

import * as React from "react";

import { CubeTexture } from "babylonjs";

import { Icon } from "../../../../gui/icon";

import { AssetsBrowserItemHandler } from "../item-handler";

export class EnvDdsItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		return (
			<Icon
				src="dds.svg"
				style={{
					width: "100%",
					height: "100%",
				}}
			/>
		);
	}

	/**
	 * Called on the user starts dragging the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDragStart(ev: React.DragEvent<HTMLDivElement>): void {
		ev.dataTransfer.setData("asset/texture", JSON.stringify({
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
		let texture = this.props.editor.scene!.textures.find((tex) => tex.name === this.props.relativePath);
		if (!texture) {
			texture = CubeTexture.CreateFromPrefilteredData(this.props.absolutePath, this.props.editor.scene!);
			texture.name = join(dirname(this.props.relativePath), basename(this.props.absolutePath));

			(texture as CubeTexture).url = texture.name;
		}

		object[property] = texture;

		await this.props.editor.assets.refresh();
	}
}
