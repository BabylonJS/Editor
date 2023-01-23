import { clipboard } from "electron";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, Icon as BPIcon, Divider } from "@blueprintjs/core";

import { Icon } from "../../../../gui/icon";

import { AssetsBrowserItemHandler } from "../item-handler";

export class SVGItemHandler extends AssetsBrowserItemHandler {
    /**
     * Computes the image to render.
     */
    public computePreview(): React.ReactNode {
        return (
            <Icon
                src="svg-icon.svg"
                style={{
                    width: "100%",
                    height: "100%",
                }}
            />
        );
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
                {this.getCommonContextMenuItems()}
                <Divider />
                <div style={{ display: "flex", justifyItems: "center" }}>
                    <img src={this.props.absolutePath} style={{ flex: 1, width: "128px", height: "128px", objectFit: "contain" }} />
                </div>
            </Menu>
        ), {
            top: ev.clientY,
            left: ev.clientX,
        });
    }
}
