import { join } from "path";
import { writeJSON } from "fs-extra";
import { ipcRenderer } from "electron";

import { IPCResponses } from "../../../../../../shared/ipc";

import * as React from "react";
import { ContextMenu, Menu } from "@blueprintjs/core";

import { Icon } from "../../../../gui/icon";

import { IPCTools } from "../../../../tools/ipc";

import { WorkSpace } from "../../../../project/workspace";
import { SceneExporter } from "../../../../project/scene-exporter";

import { AssetsBrowserItemHandler } from "../item-handler";

export class GraphItemHandler extends AssetsBrowserItemHandler {
    private static _GraphEditors: { id: number; path: string }[] = [];

    /**
     * Computes the image to render.
     */
    public computePreview(): React.ReactNode {
        return (
            <Icon
                src="project-diagram.svg"
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
                {this.getCommonContextMenuItems()}
            </Menu>
        ), {
            top: ev.clientY,
            left: ev.clientX,
        });
    }

    /**
     * Called on the user double clicks on the item.
     * @param ev defines the reference to the event object.
     */
    public async onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): Promise<void> {
        const index = GraphItemHandler._GraphEditors.findIndex((m) => m.path === this.props.absolutePath);
        const existingId = index !== -1 ? GraphItemHandler._GraphEditors[index].id : undefined;

        const relativePath = this.props.absolutePath.replace(join(this.props.editor.assetsBrowser.assetsDirectory, "/"), "").replace(/\//g, "_");
        const linkPath = join("src/scenes/_graphs", `${relativePath}.ts`);

        const popupId = await this.props.editor.addWindowedPlugin("graph-editor", existingId, this.props.absolutePath, linkPath, WorkSpace.DirPath!);
        if (!popupId) {
            return;
        }

        if (index === -1) {
            GraphItemHandler._GraphEditors.push({ id: popupId, path: this.props.absolutePath });
        } else {
            GraphItemHandler._GraphEditors[index].id = popupId;
        }

        let callback: (...args: any[]) => void;
        ipcRenderer.on(IPCResponses.SendWindowMessage, callback = async (_, message) => {
            if (message.id !== "graph-json") { return; }
            if (message.data.path !== this.props.absolutePath) { return; }
            
            if (message.data.closed) {
                ipcRenderer.removeListener(IPCResponses.SendWindowMessage, callback);
            }

            if (message.data.json) {
                try {
                    await writeJSON(this.props.absolutePath, message.data.json, {
                        encoding: "utf-8",
                        spaces: "\t",
                    });
                    
                    IPCTools.SendWindowMessage(popupId, "graph-json");
                } catch (e) {
                    IPCTools.SendWindowMessage(popupId, "graph-json", { error: true });
                }

                await SceneExporter.ExportGraphs(this.props.editor);
            }
        });
    }
}
