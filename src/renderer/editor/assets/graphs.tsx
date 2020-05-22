import { ipcRenderer } from "electron";
import { join } from "path";
import { pathExists, mkdir, writeJSON } from "fs-extra";

import { IPCResponses } from "../../../shared/ipc";

import * as React from "react";
import { ButtonGroup, Button, Classes, Menu, MenuItem, Popover, Divider, Position, ContextMenu } from "@blueprintjs/core";

import { LGraph } from "litegraph.js";

import { IFile } from "../project/files";
import { Project } from "../project/project";

import { Icon } from "../gui/icon";
import { Dialog } from "../gui/dialog";

import { undoRedo } from "../tools/undo-redo";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";

export class GraphAssets extends AbstractAssets {
    /**
     * Defines the list of all avaiable meshes in the assets component.
     */
    public static Graphs: IFile[] = [];

    private static _GraphEditors: { id: number; path: string }[] = [];

    /**
     * Defines the size of assets to be drawn in the panel. Default is 100x100 pixels.
     * @override
     */
    protected size: number = 50;

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const node = super.render();

        const add = 
            <Menu>
                <MenuItem key="add-new-graph" text="New Graph..." onClick={() => this._addGraph()} />
            </Menu>;

        return (
            <>
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        <Popover content={add} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="plus.svg" />} rightIcon="caret-down" small={true} text="Add"/>
                        </Popover>
                    </ButtonGroup>
                </div>
                {node}
            </>
        );
    }

    /**
     * Refreshes the component.
     * @override
     */
    public async refresh(): Promise<void> {
        for (const m of GraphAssets.Graphs) {
            if (this.items.find((i) => i.key === m.path)) { continue; }
            
            this.items.push({ id: m.name, key: m.path, base64: "../css/svg/grip-lines.svg" });
            this.updateAssetObservable.notifyObservers();
        }
        
        return super.refresh();
    }

    /**
     * Called on the user double clicks an item.
     * @param item the item being double clicked.
     * @param img the double-clicked image element.
     */
    public async onDoubleClick(item: IAssetComponentItem, img: HTMLImageElement): Promise<void> {
        super.onDoubleClick(item, img);

        const index = GraphAssets._GraphEditors.findIndex((m) => m.path === item.key);
        const existingId = index !== -1 ? GraphAssets._GraphEditors[index].id : undefined;
        const popupId = await this.editor.addWindowedPlugin("graph-editor", existingId, item.key);

        if (!popupId) { return; }

        if (index === -1) {
            GraphAssets._GraphEditors.push({ id: popupId, path: item.key });
        } else {
            GraphAssets._GraphEditors[index].id = popupId;
        }

        let callback: (...args: any[]) => void;
        ipcRenderer.on(IPCResponses.SendWindowMessage, callback = async (_, data) => {
            if (data.id !== "graph-json") { return; }
            if (data.path !== item.key) { return; }

            if (data.closed) {
                ipcRenderer.removeListener(IPCResponses.SendWindowMessage, callback);
            }

            await writeJSON(item.key, data.json, {
                encoding: "utf-8",
                spaces: "\t",
            });
        });
    }

    /**
     * Called on the user right-clicks on an item.
     * @param item the item being right-clicked.
     * @param event the original mouse event.
     */
    public onContextMenu(item: IAssetComponentItem, e: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        super.onContextMenu(item, e);

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemoveGraph(item)} />
            </Menu>,
            { left: e.clientX, top: e.clientY },
        );
    }

    /**
     * Adds a new graph to the project.
     */
    private async _addGraph(): Promise<void> {
        const name = await Dialog.Show("New Graph Name..", "Please provide a name for the new graph to create");
        const destFolder = join(Project.DirPath!, "graphs");

        if (!(await pathExists(destFolder))) {
            await mkdir(destFolder);
        }

        const fileame = `${name}.json`;
        const dest = join(destFolder, fileame);
        await writeJSON(dest, new LGraph().serialize(), {
            encoding: "utf-8",
            spaces: "\t",
        });

        GraphAssets.Graphs.push({ name: fileame, path: dest });
        this.refresh();
    }

    /**
     * Called on the user wants to remove a mesh from the library.
     */
    private _handleRemoveGraph(item: IAssetComponentItem): void {
        undoRedo.push({
            common: () => this.refresh(),
            redo: () => {
                const graphIndex = GraphAssets.Graphs.findIndex((m) => m.path === item.key);
                if (graphIndex !== -1) { GraphAssets.Graphs.splice(graphIndex, 1); }

                const itemIndex = this.items.indexOf(item);
                if (itemIndex !== -1) { this.items.splice(itemIndex, 1); }
            },
            undo: () => {
                GraphAssets.Graphs.push({ name: item.id, path: item.key });
                this.items.push(item);
            },
        });
    }
}

Assets.addAssetComponent({
    title: "Graphs",
    ctor: GraphAssets,
});
