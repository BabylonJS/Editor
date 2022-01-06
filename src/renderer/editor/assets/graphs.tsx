import { ipcRenderer } from "electron";
import { join, extname } from "path";
import { pathExists, mkdir, writeJSON, readFile, writeFile, remove } from "fs-extra";

import { IPCResponses } from "../../../shared/ipc";

import * as React from "react";
import { ButtonGroup, Button, Classes, Menu, MenuItem, Popover, Divider, Position, ContextMenu, Tag, Intent } from "@blueprintjs/core";

import { Scene, Node } from "babylonjs";

import { IFile } from "../project/files";
import { Project } from "../project/project";
import { WorkSpace } from "../project/workspace";
import { SceneExporter } from "../project/scene-exporter";

import { Icon } from "../gui/icon";
import { Dialog } from "../gui/dialog";

import { Tools } from "../tools/tools";
import { undoRedo } from "../tools/undo-redo";
import { IPCTools } from "../tools/ipc";

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
    protected size: number = 100;
    /**
     * Defines the type of the data transfer data when drag'n'dropping asset.
     * @override
     */
    public readonly dragAndDropType: string = "application/script-asset";

    /**
     * Registers the component.
     */
    public static Register(): void {
        Assets.addAssetComponent({
            title: "Visual Scripts (Beta)",
            identifier: "graphs",
            ctor: GraphAssets,
        });
    }

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
            const existingItem = this.items.find((i) => i.key === m.path);
            const item = {
                ...existingItem ?? {
                    id: m.name,
                    key: m.path,
                    base64: "../css/svg/grip-lines.svg",
                },
                extraData: {
                    scriptPath: join("src", "scenes", WorkSpace.GetProjectName(), "graphs", m.name.replace(".json", ".ts")),
                },
                style: {
                    backgroundColor: "#222222",
                    borderColor: "#2FA1D6",
                    borderStyle: "solid",
                    borderWidth: this._isGraphAttached(m.name.replace(".json", ".ts")) ? "2px" : "0px",
                }
            }

            if (!existingItem) {
                this.items.push(item);
            } else {
                const index = this.items.indexOf(existingItem);
                this.items[index] = item;
            }

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
        const path = join("src", "scenes", WorkSpace.GetProjectName(), "graphs", item.id).replace(".json", ".ts");
        const popupId = await this.editor.addWindowedPlugin("graph-editor", existingId, item.key, path);

        if (!popupId) { return; }

        if (index === -1) {
            GraphAssets._GraphEditors.push({ id: popupId, path: item.key });
        } else {
            GraphAssets._GraphEditors[index].id = popupId;
        }

        let callback: (...args: any[]) => void;
        ipcRenderer.on(IPCResponses.SendWindowMessage, callback = async (_, message) => {
            if (message.id !== "graph-json") { return; }
            if (message.data.path !== item.key) { return; }

            if (message.data.closed) {
                ipcRenderer.removeListener(IPCResponses.SendWindowMessage, callback);
            }

            if (message.data.json) {
                try {
                    await writeJSON(item.key, message.data.json, {
                        encoding: "utf-8",
                        spaces: "\t",
                    });
                    
                    IPCTools.SendWindowMessage(popupId, "graph-json");
                } catch (e) {
                    IPCTools.SendWindowMessage(popupId, "graph-json", { error: true });
                }

                // Update preview
                item.base64 = message.data.preview;
                this.setState({ items: this.items });

                await SceneExporter.ExportGraphs(this.editor);
            }
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
     * Called on the user pressed the delete key on the asset.
     * @param item defines the item being deleted.
     */
    public onDeleteAsset(item: IAssetComponentItem): void {
        super.onDeleteAsset(item);
        this._handleRemoveGraph(item);
    }

    /**
     * Returns the content of the item's tooltip on the pointer is over the given item.
     * @param item defines the reference to the item having the pointer over.
     */
    protected getItemTooltipContent(item: IAssetComponentItem): JSX.Element {
        return (
            <>
                <Tag fill={true} intent={Intent.PRIMARY}>{item.id}</Tag>
                <Divider />
                <Tag fill={true} intent={Intent.PRIMARY}>{item.key}</Tag>
                <Divider />
                <img
                    src={item.base64}
                    style={{
                        width: "512px",
                        height: "256px",
                        objectFit: "contain",
                        backgroundColor: "#222222",
                        left: "50%",
                    }}
                ></img>
            </>
        );
    }

    /**
     * Called on an asset item has been drag'n'dropped on graph component.
     * @param data defines the data of the asset component item being drag'n'dropped.
     * @param nodes defines the array of nodes having the given item being drag'n'dropped.
     */
    public onGraphDropAsset(data: IAssetComponentItem, nodes: (Scene | Node)[]): boolean {
        super.onGraphDropAsset(data, nodes);

        if (!data.extraData?.scriptPath) { return false; }

        nodes.forEach((n) => {
            n.metadata ??= { };
            n.metadata.script ??= { };
            n.metadata.script.name = data.extraData!.scriptPath as string;
        });

        return true;
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
        const skeleton = await readFile(join(Tools.GetAppPath(), `assets/graphs/default.json`), { encoding: "utf-8" });

        await writeFile(dest, skeleton);

        GraphAssets.Graphs.push({ name: fileame, path: dest });
        this.refresh();
    }

    /**
     * Called on the user wants to remove a mesh from the library.
     */
    private async _handleRemoveGraph(item: IAssetComponentItem): Promise<void> {
        const extension = extname(item.id);
        const sourcePath = join(WorkSpace.DirPath!, "src/scenes/", WorkSpace.GetProjectName(), "graphs", item.id.replace(extension, ".ts"));
        const scriptExists = await pathExists(sourcePath);

        undoRedo.push({
            common: () => this.refresh(),
            redo: async () => {
                const graphIndex = GraphAssets.Graphs.findIndex((m) => m.path === item.key);
                if (graphIndex !== -1) { GraphAssets.Graphs.splice(graphIndex, 1); }

                const itemIndex = this.items.indexOf(item);
                if (itemIndex !== -1) { this.items.splice(itemIndex, 1); }

                if (scriptExists) {
                    remove(sourcePath);
                }
            },
            undo: async () => {
                GraphAssets.Graphs.push({ name: item.id, path: item.key });
                this.items.push(item);

                if (scriptExists) {
                    await SceneExporter.ExportGraphs(this.editor);
                }
            },
        });
    }

    /**
     * Returns wether or not the given graph asset item is attached to a node or not.
     */
    private _isGraphAttached(name: string): boolean {
        const nodes: (Node | Scene)[] = [
            this.editor.scene!,
            ...this.editor.scene!.meshes,
            ...this.editor.scene!.cameras,
            ...this.editor.scene!.lights,
            ...this.editor.scene!.transformNodes,
        ];
        const path = join("src", "scenes", WorkSpace.GetProjectName(), "graphs", name);

        for (const n of nodes) {
            if (n.metadata?.script?.name === path) {
                return true;
            }
        }

        return false;
    }
}
