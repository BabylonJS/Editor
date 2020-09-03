import { join, extname } from "path";
import { copy, writeFile, remove } from "fs-extra";
import Zip from "adm-zip";

import { Nullable, Undefinable } from "../../../shared/types";

import * as React from "react";
import { ButtonGroup, Button, Classes, ContextMenu, Menu, MenuItem } from "@blueprintjs/core";

import { PickingInfo, AnimationGroup, Skeleton, IParticleSystem, AbstractMesh } from "babylonjs";

import { undoRedo } from "../tools/undo-redo";

import { Icon } from "../gui/icon";

import { IFile } from "../project/files";
import { Project } from "../project/project";
import { IBabylonFile } from "../project/typings";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";

import { MaterialAssets } from "./materials";

import { Prefab } from "../prefab/prefab";

export class PrefabAssets extends AbstractAssets {
    /**
     * Defines the list of all avaiable meshes in the assets component.
     */
    public static Prefabs: IFile[] = [];

    private _extensions: string[] = [".meshprefab"];

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const node = super.render();

        return (
            <>
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
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
        for (const m of PrefabAssets.Prefabs) {
            if (this.items.find((i) => i.key === m.path)) { continue; }

            // Get preview
            const zipPath = join(Project.DirPath!, "prefabs", m.name);
            const zip = new Zip(zipPath);
            const entries = zip.getEntries();
            const previewEntry = entries.find((e) => e.entryName === "preview.png");

            let base64 = "../css/svg/logo-babylon.svg";
            if (previewEntry) {
                try {
                    const buffer = await new Promise<Nullable<Buffer>>((resolve, reject) => {
                        zip.readFileAsync(previewEntry, (data, err) => {
                            if (err) { return reject(err); }
                            resolve(data);
                        })
                    });

                    if (buffer) {
                        base64 = "data:image/png;base64," + buffer.toString("base64");
                    }
                } catch (e) {
                    
                }
            }

            this.items.push({ id: m.name, key: m.path, base64 });
        }

        return super.refresh();
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
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._handleRemovePrefab(item)} />
            </Menu>,
            { left: e.clientX, top: e.clientY },
        );
    }

    /**
     * Called on the user drops files in the assets component and returns true if the files have been computed.
     * @param files the list of files being dropped.
     */
    public async onDropFiles(files: IFile[]): Promise<void> {
        for (const file of files) {
            const extension = extname(file.name).toLowerCase();
            if (this._extensions.indexOf(extension) === -1) { continue; }

            const existing = PrefabAssets.Prefabs.find((m) => m.name === file.name);

            // Copy asset
            const dest = join(Project.DirPath!, "prefabs", file.name);
            await copy(file.path, dest);

            if (!existing) {
                PrefabAssets.Prefabs.push({ name: file.name, path: dest });
            }
        }
    }

    /**
     * Called on the user drops an asset in editor. (typically the preview canvas).
     * @param item the item being dropped.
     * @param pickInfo the pick info generated on the drop event.
     * @override
     */
    public async onDropAsset(item: IAssetComponentItem, pickInfo: PickingInfo): Promise<Undefinable<{
        meshes: AbstractMesh[];
        particleSystems: IParticleSystem[];
        skeletons: Skeleton[];
        animationGroups: AnimationGroup[];
    }>> {
        super.onDropAsset(item, pickInfo);

        // TODO: manage complete prefab system. Here, only .meshprefab is supported at the moment.

        const task = this.editor.addTaskFeedback(0, "Loading Prefab...");
        const zip = new Zip(item.key);

        // Materials
        const materialsAssets = this.editor.assets.getComponent(MaterialAssets);
        const materialsEntries = zip.getEntries().filter((e) => e.entryName.indexOf("materials") === 0);

        for (const m of materialsEntries) {
            const tempMaterialPath = join(Project.DirPath!, "prefabs", `${item.id}_material_temp.zip`);

            try {
                // Write temp material file
                await writeFile(tempMaterialPath, zip.readFile(m));
                
                // Read material zip
                const materialZip = new Zip(tempMaterialPath);

                const jsonEntry = materialZip.getEntries().find((e) => e.entryName === "material.json");
                if (!jsonEntry) { throw "Can't find the material preset json file."; }

                const json = JSON.parse(materialZip.readAsText(jsonEntry));
                if (materialsAssets && !this.editor.scene!.getMaterialByID(json.id)) {
                    materialsAssets.loadMaterialFromZip(tempMaterialPath);
                }
            } catch(e) {
                this.editor.console.logError(e.message);
            } finally {
                await remove(tempMaterialPath);
            }
        }

        // Mesh
        this.editor.updateTaskFeedback(task, 50, "Done");
        const tempJsonPath = join(Project.DirPath!, "prefabs", `${item.id}_json_temp.json`);
        
        let result: any;
        try {
            const jsonEntry = zip.getEntries().find((e) => e.entryName === "prefab.json");
            if (!jsonEntry) { throw "Can't find the mesh preset json file."; }

            const configEntry = zip.getEntries().find((e) => e.entryName === "config.json");
            if (!configEntry) { throw "Can't find the prefab configuration JSON file."; }

            const json = JSON.parse(zip.readAsText(jsonEntry)) as IBabylonFile;
            Prefab.HandleIds(json);

            // Load meshes
            await writeFile(tempJsonPath, JSON.stringify(json), { encoding: "utf-8" });
            result = await Prefab.LoadMeshPrefab(this.editor, json, Project.DirPath!, item.id);

            if (pickInfo.pickedPoint) { result.meshes[0]?.position.copyFrom(pickInfo.pickedPoint!); }
        } catch (e) {
            this.editor.console.logError(e.message);
        } finally {
            await remove(tempJsonPath);
        }

        // Finally refresh all!
        this.editor.graph.refresh();
        this.editor.assets.refresh();

        this.editor.updateTaskFeedback(task, 100, "Done");
        this.editor.closeTaskFeedback(task, 500);

        return result;
    }

    /**
     * Called on the user wants to remove a mesh from the library.
     */
    private _handleRemovePrefab(item: IAssetComponentItem): void {
        undoRedo.push({
            common: () => this.refresh(),
            redo: () => {
                const meshIndex = PrefabAssets.Prefabs.findIndex((m) => m.path === item.key);
                if (meshIndex !== -1) { PrefabAssets.Prefabs.splice(meshIndex, 1); }

                const itemIndex = this.items.indexOf(item);
                if (itemIndex !== -1) { this.items.splice(itemIndex, 1); }
            },
            undo: () => {
                PrefabAssets.Prefabs.push({ name: item.id, path: item.key });
                this.items.push(item);
            },
        });
    }
}

Assets.addAssetComponent({
    title: "Prefabs (Beta)",
    identifier: "prefabs",
    ctor: PrefabAssets,
});
