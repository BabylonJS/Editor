import { join } from "path";
import { readJSON } from "fs-extra";
import { clipboard } from "electron";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, MenuDivider, Icon as BPIcon } from "@blueprintjs/core";

import { ProceduralTexture } from "babylonjs";

import { Icon } from "../../../../gui/icon";

import { AssetsBrowserItemHandler } from "../item-handler";

export class ProceduralTextureItemHandler extends AssetsBrowserItemHandler {
    /**
     * Computes the image to render.
     */
    public computePreview(): React.ReactNode {
        return (
            <Icon
                src="circle.svg"
                style={{
                    width: "80%",
                    height: "80%",
                }}
            />
        );
    }

    /**
     * Called on the user clicks on the asset.
     * @param ev defines the reference to the event object.
     */
    public onClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        const existing = this.props.editor.scene!.proceduralTextures?.find((m) => m.metadata?.editorPath === this.props.relativePath);
        if (existing) {
            this.props.editor.inspector.setSelectedObject(existing);
        }
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
    public async onDropInInspector(_: React.DragEvent<HTMLElement>, object: any, property: string): Promise<void> {
        let texture = this.props.editor.scene!.proceduralTextures?.find((m) => m.metadata?.editorPath === this.props.relativePath);

        if (!texture) {
            const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });

            texture = ProceduralTexture.Parse(json, this.props.editor.scene!, join(this.props.editor.assetsBrowser.assetsDirectory, "/")) as ProceduralTexture;

            if (texture) {
                if (json.metadata) {
                    texture.metadata = json.metadata;
                }

                texture.uniqueId = json.uniqueId ?? texture.uniqueId;
            }
        }

        if (texture) {
            object[property] = texture;
        }

        await this.props.editor.assets.refresh();
    }
}
