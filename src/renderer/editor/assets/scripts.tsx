import { shell } from "electron";
import { readdir, pathExists, mkdir, writeFile, stat, readFile } from "fs-extra";
import { join, extname, normalize, basename } from "path";
import Glob from "glob";

import * as React from "react";
import { ButtonGroup, Button, Classes, Breadcrumbs, Boundary, IBreadcrumbProps, Divider } from "@blueprintjs/core";

import { WorkSpace } from "../project/workspace";

import { Icon } from "../gui/icon";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";
import { Dialog } from "../gui/dialog";
import { Tools } from "../tools/tools";

export class ScriptAssets extends AbstractAssets {
    /**
     * Defines the size of assets to be drawn in the panel. Default is 100x100 pixels.
     * @override
     */
    protected size: number = 50;

    private static _Path: string = "";

    /**
     * Returns the list of all available scripts.
     */
    public static GetAllScripts(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            Glob(join(WorkSpace.DirPath!, "src", "scenes", WorkSpace.GetProjectName(), "**", "*.ts"), { }, (err, files) => {
                if (err) { return reject(err); }
                resolve(files.filter((f) => f.indexOf("index.ts") === -1).map((f) => f.replace(/\\/g, "/").replace(WorkSpace.DirPath!.replace(/\\/g, "/"), "")));
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

        const path = this._getCurrentPath();
        if (!(await pathExists(path))) {
            await mkdir(path);
        }

        const files = await readdir(path);
        for (const f of files) {
            const infos = await stat(join(path, f));
            if (infos.isDirectory()) {
                this.items.push({ id: f, key: join(ScriptAssets._Path, f), base64: "./css/svg/folder-open.svg" });
                continue;
            }
            
            const extension = extname(f).toLowerCase();
            if (extension !== ".ts") { continue; }

            this.items.push({ id: f, key: join(ScriptAssets._Path, f), base64: "./css/images/ts.png" });
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

        const path = normalize(join(WorkSpace.DirPath!, "src", "scenes", WorkSpace.GetProjectName(), item.key));
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
     * Returns the navbar properties.
     */
    private _getPathBrowser(): IBreadcrumbProps[] {
        const result: IBreadcrumbProps[] = [{ text: "Scene", icon: "folder-close", onClick: () => {
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

            result.push({ text: s, icon: "folder-close", onClick: () => {
                ScriptAssets._Path = normalize(path);
                this.refresh();
            } });
        });

        return result;
    }

    /**
     * Returns the current path being browsed by the assets component.
     */
    private _getCurrentPath(): string {
        return join(WorkSpace.DirPath!, "src", "scenes", WorkSpace.GetProjectName(), ScriptAssets._Path);
    }

    /**
     * Adds a new script.
     */
    private async _addScript(): Promise<void> {
        const name = await Dialog.Show("Script name?", "Please provide a name for the new script");
        const path = this._getCurrentPath();

        const skeleton = await readFile(join(Tools.GetAppPath(), `assets/scripts/script.ts`), { encoding: "utf-8" });
        await writeFile(join(path, `${name}.ts`), skeleton);

        return this.refresh();
    }
}

Assets.addAssetComponent({
    title: "Scripts",
    ctor: ScriptAssets,
});
