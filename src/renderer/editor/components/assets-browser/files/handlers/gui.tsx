import { readJSON, writeJSON } from "fs-extra";
import { clipboard, ipcRenderer } from "electron";

import { Nullable } from "../../../../../../shared/types";
import { IPCResponses } from "../../../../../../shared/ipc";

import * as React from "react";
import { ContextMenu, Menu, MenuDivider, MenuItem, Spinner, Icon as BPIcon } from "@blueprintjs/core";

import { Mesh, PickingInfo, Scene } from "babylonjs";
import { AdvancedDynamicTexture, Image } from "babylonjs-gui";

import { Icon } from "../../../../gui/icon";

// import { Tools } from "../../../../tools/tools";
import { IPCTools } from "../../../../tools/ipc";

import { Workers } from "../../../../workers/workers";
import AssetsWorker from "../../../../workers/workers/assets";

import { AssetsBrowserItemHandler } from "../item-handler";

import { overridesConfiguration } from "../../../../tools/gui/augmentations";

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
            absolutePath: this.props.absolutePath,
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

                    // Update instantied references
                    const meshes = this.props.editor.scene!.meshes.filter((m) => m.metadata?.guiPath);
                    meshes.forEach((m) => {
                        const ui = m.material?.getActiveTextures().find((t) => t instanceof AdvancedDynamicTexture) as AdvancedDynamicTexture;
                        if (ui) {
                            ui.rootContainer.clearControls();
                            ui.parseContent(message.data.json, true);
                        }
                    });
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
     * Called on the user drops the asset in the editor's preview canvas.
     * @param ev defines the reference to the event object.
     * @param pick defines the picking info generated while dropping in the preview.
     */
    public async onDropInPreview(_: DragEvent, pick: PickingInfo): Promise<void> {
        if (!pick.pickedMesh || !(pick.pickedMesh instanceof Mesh)) {
            return;
        }

        try {
            const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });

            const ui = AdvancedDynamicTexture.CreateForMesh(pick.pickedMesh, 3, 3);
            ui.parseContent(json, true);

            pick.pickedMesh.metadata ??= { };
            pick.pickedMesh.metadata.guiPath = this.props.relativePath;
        } catch (e) {
            // Catch silently.
        }
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

        const scene = new Scene(this.props.editor.engine!);
        scene.activeCamera = this.props.editor.scene!.activeCamera;

        try {
            const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });

            overridesConfiguration.absolutePath = this.props.absolutePath;

            texture = AdvancedDynamicTexture.CreateFullscreenUI("editor-ui", true, scene);
            texture.parseContent(json, true);

            await this._waitUntilAssetsLoaded(texture);

            scene.render();

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

        scene.dispose();
        texture?.dispose();
    }

    /**
     * Waits until the given texture external assets (images, etc.) are loaded.
     */
    private async _waitUntilAssetsLoaded(texture: AdvancedDynamicTexture): Promise<void> {
        const images = texture.getControlsByType("Image") as Image[];

        const promises = images.map((i) => {
            if (!i.source) {
                return Promise.resolve();
            }

            return new Promise<void>((resolve) => {
                const timeoutId = setTimeout(() => resolve(), 5000);

                const textureLoadEnd = () => {
                    resolve();
                    clearTimeout(timeoutId);
                }

                const domImage = i["_domImage"];
                if (domImage) {
                    domImage.onerror = () => textureLoadEnd();
                }

                i.onImageLoadedObservable.add(() => textureLoadEnd());
            });
        })

        await Promise.all(promises);
    }
}
