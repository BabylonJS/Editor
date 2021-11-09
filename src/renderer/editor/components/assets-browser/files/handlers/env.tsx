import { clipboard } from "electron";
import { basename, dirname, join } from "path";

import * as React from "react";
import { ContextMenu, Menu, MenuDivider, MenuItem, Tag, Icon as BPIcon } from "@blueprintjs/core";

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
	 * Called on the user clicks on the asset.
	 * @param ev defines the reference to the event object.
	 */
	public onClick(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		const existing = this.props.editor.scene!.textures.filter((t) => t.name === this.props.relativePath);
		if (!existing.length) {
			return;
		}

		if (existing.length === 1) {
			this.props.editor.inspector.setSelectedObject(existing[0]);
		} else {
			const items = existing.map((t) => (
				<MenuItem text={basename(t.metadata?.editorName ?? t.name)} onClick={() => this.props.editor.inspector.setSelectedObject(t)} />
			));

			ContextMenu.show((
				<Menu>
					<Tag>Edit:</Tag>
					{items}
				</Menu>
			), {
				top: ev.clientY,
				left: ev.clientX,
			});
		}
	}

	/**
	 * Called on the user double clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		this.props.editor.addWindowedPlugin("texture-viewer", undefined, this.props.absolutePath);
	}

	/**
	 * Called on the user right clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		ContextMenu.show((
			<Menu>
				<MenuItem text="Copy Path" icon={<BPIcon icon="clipboard" color="white" />} onClick={() => clipboard.writeText(this.props.relativePath, "clipboard")} />
				<MenuItem text="Copy Absolute Path" icon={<BPIcon icon="clipboard" color="white" />} onClick={() => clipboard.writeText(this.props.absolutePath, "clipboard")} />
				<MenuDivider />
				<MenuItem text="Set As Environment Texture" onClick={() => this._applyToObject(this.props.editor.scene, "environmentTexture")} />
				<MenuDivider />
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
	public onDropInInspector(_: React.DragEvent<HTMLElement>, object: any, property: string): Promise<void> {
		return this._applyToObject(object, property);
	}

	/**
	 * Applies the environement texture to the given property of the given object.
	 */
	private _applyToObject(object: any, property: string): Promise<void> {
		let texture = this.props.editor.scene!.textures.find((tex) => tex.name === this.props.relativePath);
		if (!texture) {
			texture = CubeTexture.CreateFromPrefilteredData(this.props.absolutePath, this.props.editor.scene!);
			texture.name = join(dirname(this.props.relativePath), basename(this.props.absolutePath));

			(texture as CubeTexture).url = texture.name;
		}

		object[property] = texture;

		this.props.editor.inspector.refreshDisplay();
		return this.props.editor.assets.refresh();
	}
}
