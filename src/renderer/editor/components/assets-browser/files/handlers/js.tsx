import { shell } from "electron";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, MenuDivider } from "@blueprintjs/core";

import { Icon } from "../../../../gui/icon";

import { JSTools } from "../../../../tools/js";

import { AssetsBrowserItemHandler } from "../item-handler";

export class JavaScriptItemHandler extends AssetsBrowserItemHandler {
    /**
     * Computes the image to render.
     */
    public computePreview(): React.ReactNode {
        return (
            <Icon
                src="javascript.svg"
                style={{
                    width: "80%",
                    height: "80%",
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

    /**
     * Called on the user right clicks on the item.
     * @param ev defines the reference to the event object.
     */
    public onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        ContextMenu.show((
            <Menu>
                <MenuItem text="Edit..." icon={<Icon src="edit.svg" />} onClick={() => this.props.editor.addBuiltInPlugin("script-editor", {
                    path: this.props.absolutePath,
                })} />
                <MenuItem text="Execute in Editor..." icon={<Icon src="play.svg" />} onClick={() => this._executeScript()} />
                <MenuDivider />
                {this.getCommonContextMenuItems()}
            </Menu>
        ), {
            top: ev.clientY,
            left: ev.clientX,
        });
    }

    /**
     * Executes the script in the context of the editor.
     */
    private async _executeScript(): Promise<void> {
        await JSTools.ExecuteInEditorContext(this.props.editor, this.props.absolutePath);
    }
}
