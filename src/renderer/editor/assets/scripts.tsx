import { shell } from "electron";
import { readdir, pathExists, mkdir, writeFile, stat, readFile, move } from "fs-extra";
import { join, extname, normalize, basename } from "path";
import Glob from "glob";

import { Undefinable } from "../../../shared/types";

import * as React from "react";
import { ButtonGroup, Button, Classes, Breadcrumbs, Boundary, IBreadcrumbProps, Divider, ContextMenu, Menu, MenuItem, MenuDivider, Tag, Intent } from "@blueprintjs/core";

import { Scene, Node } from "babylonjs";

import { WorkSpace } from "../project/workspace";
import { SceneExporter } from "../project/scene-exporter";

import { Icon } from "../gui/icon";
import { Alert } from "../gui/alert";
import { Dialog } from "../gui/dialog";

import { Tools } from "../tools/tools";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";

export class ScriptAssets extends AbstractAssets {
    /**
     * Defines the size of assets to be drawn in the panel. Default is 100x100 pixels.
     * @override
     */
    protected size: number = 50;
    /**
     * Defines the type of the data transfer data when drag'n'dropping asset.
     * @override
     */
    public readonly dragAndDropType: string = "application/script-asset";

    private _refreshing: boolean = false;

    private static _Path: string = "";

    /**
     * Registers the component.
     */
    public static Register(): void {
        Assets.addAssetComponent({
            title: "Scripts",
            identifier: "scripts",
            ctor: ScriptAssets,
        });
    }

    /**
     * Returns the list of all available scripts.
     */
    public static GetAllScripts(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            if (!WorkSpace.DirPath) {
                return resolve([]);
            }

            Glob(join(WorkSpace.DirPath, "src", "scenes", "**", "*.ts"), { }, (err, files) => {
                if (err) { return reject(err); }

                const excluded = [
                    "src/scenes/decorators.ts",
                    "src/scenes/scripts-map.ts",
                    "src/scenes/tools.ts",
                ];
                const result = files.filter((f) => f.indexOf("index.ts") === -1)
                                    .map((f) => f.replace(/\\/g, "/").replace(WorkSpace.DirPath!.replace(/\\/g, "/"), ""))
                                    .filter((f) => excluded.indexOf(f) === -1);

                resolve(result);
            });
        });
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const node = super.render();

        return (
            <>
                <div className={Classes.FILL} key="scripts-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        <Button key="add-script" icon={<Icon src="plus.svg" />} small={true} text="Add Script..." onClick={() => this._addScript()} />
                    </ButtonGroup>
                </div>
                <Breadcrumbs
                    overflowListProps={{
                        style: { marginLeft: "4px" }
                    }}
                    collapseFrom={Boundary.START}
                    items={this._getPathBrowser()}
                ></Breadcrumbs>
                {node}
            </>
        );
    }

    /**
     * Refreshes the component.
     * @override
     */
    public async refresh(): Promise<void> {
        this.items = [];
        if (!WorkSpace.HasWorkspace()) { return super.refresh(); }

        if (this._refreshing) { return; }
        this._refreshing = true;

        try {
            const path = this._getCurrentPath();
            if (!(await pathExists(path))) {
                await mkdir(path);
            }

            const files = await readdir(path);
            for (const f of files) {
                if (ScriptAssets._Path === "" && f === "index.ts") { continue; }

                const key = join(ScriptAssets._Path, f);
                
                const infos = await stat(join(path, f));
                if (infos.isDirectory()) {
                    this.items.push({ id: f, key, base64: "../css/svg/folder-open.svg" });
                    continue;
                }
                
                const extension = extname(f).toLowerCase();
                if (extension !== ".ts") { continue; }

                this.items.push({ id: f, key, base64: "../css/images/ts.png", extraData: {
                    scriptPath: join("src", "scenes", key),
                }, style: {
                    borderColor: "#2FA1D6",
                    borderStyle: "solid",
                    borderWidth: this._isScriptAttached(key) ? "2px" : "0px",
                } });
            }
        } catch (e) {
            console.error(e);
        } finally {
            this._refreshing = false;
            return super.refresh();
        }
    }

    /**
     * Called on the user double clicks an item.
     * @param item the item being double clicked.
     * @param img the double-clicked image element.
     */
    public async onDoubleClick(item: IAssetComponentItem, img: HTMLImageElement): Promise<void> {
        super.onDoubleClick(item, img);
        return this.openItem(item);
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
     * Opens the given item.
     * @param item defines the item to open.
     */
    public async openItem(item: IAssetComponentItem): Promise<void> {
        const path = normalize(join(WorkSpace.DirPath!, "src", "scenes", item.key));
        const infos = await stat(path);

        if (infos.isDirectory()) {
            ScriptAssets._Path = item.key;
            return this.refresh();
        }

        const extension = extname(path).toLowerCase();
        if (extension === ".ts") {
            const task = this.editor.addTaskFeedback(0, `Opening "${basename(path)}"`);
            const success = shell.openItem(path);

            this.editor.updateTaskFeedback(task, 100, success ? "Done" : "Failed");
            return this.editor.closeTaskFeedback(task, 500);
        }
    }

    /**
     * Called on the user right-clicks on the component's main div.
     * @param event the original mouse event.
     */
    public onComponentContextMenu(event: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="New Script..." icon={<Icon src="plus.svg" />} onClick={() => this._addScript()} />
                <MenuDivider />
                <MenuItem text="Add Folder..." icon={<Icon src="plus.svg" />} onClick={() => this._addNewFolder()} />
            </Menu>,
            { left: event.clientX, top: event.clientY }
        );
    }

    /**
     * Called on the currently dragged item is over the given item.
     * @param item the item having the currently dragged item over.
     */
    protected dragEnter(item: IAssetComponentItem): void {
        super.dragEnter(item);

        const extension = extname(item.key);
        if (extension) { return; }

        if (item.ref) {
            item.ref.style.backgroundColor = "#222222";
        }
    }

    /**
     * Called on the currently dragged item is out the given item.
     * @param item the item having the currently dragged item out.
     */
    protected dragLeave(item: IAssetComponentItem): void {
        super.dragLeave(item);

        const extension = extname(item.key);
        if (extension) { return; }

        if (item.ref) {
            item.ref.style.backgroundColor = "";
        }
    }

    /**
     * Called on the currently dragged item has been dropped.
     * @param item the item having the currently dragged item dropped over.
     * @param droppedItem the item that has been dropped.
     */
    protected async dropOver(item: IAssetComponentItem, droppedItem: IAssetComponentItem): Promise<void> {
        super.dropOver(item, droppedItem);

        if (item === droppedItem) { return; }
        if (item.ref) { item.ref.style.backgroundColor = ""; }

        const root = join(WorkSpace.DirPath!, "src", "scenes");
        const target = join(root, item.key);

        const isDirectory = (await stat(target)).isDirectory();
        if (!isDirectory) { return; }

        const src = join(root, droppedItem.key);
        const dest = join(target, basename(droppedItem.key));

        await move(src, dest);

        this._updateAttachedElements(src, dest);
        this.refresh();
    }

    /**
     * Returns the content of the item's tooltip on the pointer is over the given item.
     * @param item defines the reference to the item having the pointer over.
     */
    protected getItemTooltipContent(item: IAssetComponentItem): Undefinable<JSX.Element> {
        const path = join("src/scenes", item.key);
        const attached: Node[] = [];
        const all = (this.editor.scene!.meshes as Node[])
                         .concat(this.editor.scene!.lights)
                         .concat(this.editor.scene!.cameras)
                         .concat(this.editor.scene!.transformNodes);

        all.forEach((n) => {
            if (!n.metadata?.script) { return; }
            if (n.metadata.script.name !== path) { return; }
            attached.push(n);
        });

        if (!attached.length) { return undefined; }

        const fullPath = join(WorkSpace.DirPath!, path);

        return (
            <>
                <Tag fill={true} interactive={true} intent={Intent.PRIMARY} onClick={() => shell.showItemInFolder(Tools.NormalizePathForCurrentPlatform(fullPath))}>{fullPath}</Tag>
                <Divider />
                <Tag fill={true} interactive={true} intent={Intent.PRIMARY} onClick={() => this.openItem(item)}>Open...</Tag>
                <Divider />
                <b>Attached to:</b><br />
                <ul>
                    {attached.map((b) => <li key={`${b.id}-li`}><Tag interactive={true} key={`${b.id}-tag`} fill={true} intent={Intent.PRIMARY} onClick={() => {
                        this.editor.selectedNodeObservable.notifyObservers(b);
                        this.editor.preview.focusSelectedNode(false);
                    }}>{b.name}</Tag></li>)}
                </ul>
                <Divider />
                <img
                    src={item.base64}
                    style={{
                        width: "256px",
                        height: "256px",
                        objectFit: "contain",
                        backgroundColor: "#222222",
                        transform: "translate(50%)",
                    }}
                ></img>
            </>
        );
    }

    /**
     * Adds a new folder.
     */
    private async _addNewFolder(): Promise<void> {
        const name = await Dialog.Show("New Folder Name", "Please provide a name for the new folder");
        const path = join(this._getCurrentPath(), name);
        const exists = await pathExists(path);
        if (exists) {
            return Alert.Show("Can't Create Folder", `A folder named "${name}" already exists.`);
        }

        // Craete folder
        await mkdir(path);

        this.refresh();
    }

    /**
     * Returns the navbar properties.
     */
    private _getPathBrowser(): IBreadcrumbProps[] {
        const result: IBreadcrumbProps[] = [{ text: this._getBreadCumpText("Scene", "./"), icon: "folder-close", onClick: () => {
            ScriptAssets._Path = "";
            this.refresh();
        } }];

        if (ScriptAssets._Path === "") {
            return result;
        }

        const split = ScriptAssets._Path.replace(/\\/, "/").split("/");
        let previous = "";

        split.forEach((s) => {
            previous = join(previous, s);
            const path = previous;

            result.push({ text: this._getBreadCumpText(s, path), icon: "folder-close", onClick: () => {
                ScriptAssets._Path = normalize(path);
                this.refresh();
            } });
        });

        return result;
    }

    /**
     * Returns the breadcump text.
     */
    private _getBreadCumpText(text: string, path: string): React.ReactNode {
        return (
            <span
                onDragEnter={(ev) => {
                    if (!this.itemBeingDragged) { return; }
                    (ev.target as HTMLSpanElement).style.background = "#222222";
                }}
                onDragLeave={(ev) => {
                    if (!this.itemBeingDragged) { return; }
                    (ev.target as HTMLSpanElement).style.background = "";
                }}
                onDrop={async (ev) => {
                    if (!this.itemBeingDragged) { return; }
                    (ev.target as HTMLSpanElement).style.background = "";

                    const root = join(WorkSpace.DirPath!, "src", "scenes");
                    const target = join(root, path);
                    const src = join(root, this.itemBeingDragged.key);
                    const dest = join(target, basename(this.itemBeingDragged.key));

                    if (src === dest) { return; }

                    await move(src, dest);

                    this._updateAttachedElements(src, dest);
                    this.refresh();
                }}
            >
                {text}
            </span>
        );
    }

    /**
     * Updates the attached elements that can have attached scripts.
     */
    private _updateAttachedElements(from: string, to: string): void {
        from = from.replace(/\\/g, "/").replace(WorkSpace.DirPath!.replace(/\\/g, "/"), "");
        to = to.replace(/\\/g, "/").replace(WorkSpace.DirPath!.replace(/\\/g, "/"), "");

        const all = (this.editor.scene!.meshes as Node[])
                         .concat(this.editor.scene!.lights)
                         .concat(this.editor.scene!.cameras)
                         .concat(this.editor.scene!.transformNodes);

        all.forEach((n) => {
            if (!n.metadata?.script) { return; }
            if (n.metadata.script.name !== from) { return; }
            n.metadata.script.name = to;
        });
    }

    /**
     * Returns the current path being browsed by the assets component.
     */
    private _getCurrentPath(): string {
        return join(WorkSpace.DirPath!, "src", "scenes", ScriptAssets._Path);
    }

    /**
     * Adds a new script.
     */
    private async _addScript(): Promise<void> {
        const name = await Dialog.Show("Script name?", "Please provide a name for the new script");
        const path = join(this._getCurrentPath(), `${name}.ts`);

        const exists = await pathExists(path);
        if (exists) {
            return Alert.Show("Can't Create Script", `A script named "${name}" already exists.`);
        }

        const skeleton = await readFile(join(Tools.GetAppPath(), `assets/scripts/script.ts`), { encoding: "utf-8" });
        await writeFile(path, skeleton);

        await SceneExporter.GenerateScripts(this.editor);

        return this.refresh();
    }

    /**
     * Returns wether or not the given script asset item is attached to a node or not.
     */
    private _isScriptAttached(key: string): boolean {
        const nodes: (Node | Scene)[] = [
            this.editor.scene!,
            ...this.editor.scene!.meshes,
            ...this.editor.scene!.cameras,
            ...this.editor.scene!.lights,
            ...this.editor.scene!.transformNodes,
        ];
        const path = join("src", "scenes", key);

        for (const n of nodes) {
            if (n.metadata?.script?.name === path) {
                return true;
            }
        }

        return false;
    }
}
