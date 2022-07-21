import { readJSON, writeJSON } from "fs-extra";
import { ipcRenderer } from "electron";

import { Nullable } from "../../../../../../shared/types";
import { IPCResponses } from "../../../../../../shared/ipc";

import * as React from "react";
import { ContextMenu, Menu, MenuDivider, MenuItem, Spinner, Icon as BPIcon } from "@blueprintjs/core";

import { AdvancedDynamicTexture } from "babylonjs-gui";

import { Icon } from "../../../../gui/icon";

// import { Tools } from "../../../../tools/tools";
import { IPCTools } from "../../../../tools/ipc";

import { WorkSpace } from "../../../../project/workspace";

import { Workers } from "../../../../workers/workers";
import AssetsWorker from "../../../../workers/workers/assets";

import { AssetsBrowserItemHandler } from "../item-handler";

export class GUIItemHandler extends AssetsBrowserItemHandler {
    private static _GUIEditors: {
        id: number;
        absolutePath: string;
    }[] = [];

    /**
     * Computes the image to render.
     */
    public computePreview(): React.ReactNode {
        this._computePreview();

        this.props.onSetTitleColor("blueviolet");

        return (
            <div style={{ width: "100%", height: "100%" }}>
                <Icon src="logo-babylon.svg" style={{ width: "100%", height: "100%", filter: "unset" }} />
                <div style={{ position: "absolute", top: "0", left: "0" }}>
                    <Spinner size={24} />
                </div>
            </div>
        );
    }

    /**
     * Called on the user double clicks on the item.
     * @param ev defines the reference to the event object.
     */
    public async onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): Promise<void> {
        /*
        const plugin = this.props.editor.plugins["GUI Editor"];
        if (plugin) {
            this.props.editor.closePlugin("gui-editor");
        }

        await Tools.Wait(0);
        this.props.editor.addBuiltInPlugin("gui-editor", this.props.absolutePath);
        */

        const index = GUIItemHandler._GUIEditors.findIndex((m) => m.absolutePath === this.props.absolutePath);
        const existingId = index !== -1 ? GUIItemHandler._GUIEditors[index].id : undefined;

        const popupId = await this.props.editor.addWindowedPlugin("gui-editor", true, existingId, {
            workspaceDir: WorkSpace.DirPath,
            relativePath: this.props.relativePath,
            json: await readJSON(this.props.absolutePath, { encoding: "utf-8" }),
        });

        if (!popupId) {
            return;
        }

        if (index === -1) {
            GUIItemHandler._GUIEditors.push({ id: popupId, absolutePath: this.props.absolutePath });
        } else {
            GUIItemHandler._GUIEditors[index].id = popupId;
        }

        let callback: (...args: any[]) => Promise<void>;
        ipcRenderer.on(IPCResponses.SendWindowMessage, callback = async (_, message) => {
            if (message.id !== "gui-json" || message.data.relativePath !== this.props.relativePath) {
                return;
            }

            if (message.data.closed) {
                ipcRenderer.removeListener(IPCResponses.SendWindowMessage, callback);

                const windowIndex = GUIItemHandler._GUIEditors.findIndex((m) => m.id === popupId);
                if (windowIndex !== -1) {
                    GUIItemHandler._GUIEditors.splice(windowIndex, 1);
                }
            }

            if (message.data.json) {
                try {
                    await writeJSON(this.props.absolutePath, message.data.json, { encoding: "utf-8", spaces: "\t" });
                    IPCTools.SendWindowMessage(popupId, "gui-json");
                } catch (e) {
                    IPCTools.SendWindowMessage(popupId, "gui-json", { error: true });
                }
            }
        });
    }

    /**
     * Called on the user right clicks on the item.
     * @param ev defines the reference to the event object.
     */
    public onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        ContextMenu.show((
            <Menu>
                <MenuItem text="Refresh Preview" icon={<BPIcon icon="refresh" color="white" />} onClick={() => {
                    this.props.editor.assetsBrowser._callSelectedItemsMethod("_handleRefreshPreview");
                }} />
                <MenuDivider />
                {this.getCommonContextMenuItems()}
            </Menu>
        ), {
            top: ev.clientY,
            left: ev.clientX,
        });
    }

    /**
     * Called on the user wants to refresh the preview of the material.
     * @hidden
     */
    public async _handleRefreshPreview(): Promise<void> {
        await Workers.ExecuteFunction<AssetsWorker, "deleteFromCache">(
            AssetsBrowserItemHandler.AssetWorker,
            "deleteFromCache",
            this.props.relativePath,
        );

        return this._computePreview();
    }

    /**
     * Computes the preview image of the object.
     */
    private async _computePreview(): Promise<void> {
        let texture: Nullable<AdvancedDynamicTexture> = null;

        try {
            const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });

            texture = AdvancedDynamicTexture.CreateFullscreenUI("editor-ui", true, this.props.editor.scene!);
            texture.parseContent(json, true);

            this.props.editor.scene!.render();

            const previewImage = (
                <img
                    ref={(r) => r && requestAnimationFrame(() => r.style.opacity = "1.0")}
                    src={texture["_canvas"].toDataURL("image/png")}
                    style={{
                        opacity: "0",
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transition: "opacity 0.3s ease-in-out",
                    }}
                />
            );

            this.setState({ previewImage });
        } catch (e) {
            // Catch silently.
        }

        texture?.dispose();
    }
}
