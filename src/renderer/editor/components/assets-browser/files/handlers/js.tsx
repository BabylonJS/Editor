import { join } from "path";
import { shell } from "electron";

import * as React from "react";
import { ContextMenu, Menu, MenuItem, MenuDivider, Pre } from "@blueprintjs/core";

import { Icon } from "../../../../gui/icon";

import { WorkSpace } from "../../../../project/workspace";

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
        this.props.editor.revealPanel("console");

        // Try executing the script
        try {
            const a = require(this.props.absolutePath);
            await a.main(this.props.editor);
            this.props.editor.console.logInfo(`Successfuly executed script "${this.props.relativePath}"`);
        } catch (e) {
            this.props.editor.console.logError(`An error happened executing the script at "${this.props.relativePath}"`);
            this.props.editor.console.logCustom(
                <Pre style={{ outlineColor: "red", outlineWidth: "1px", outlineStyle: "double" }}>
                    {e?.toString()}
                    {e?.stack}
                </Pre>
            );
        }

        // Clear cache
        for (const c in require.cache) {
            const cachePath = c.replace(/\\/g, "/");
            if (cachePath.indexOf(join(WorkSpace.DirPath!, "assets")) !== -1) {
                delete require.cache[c];
            }
        }
    }
}
