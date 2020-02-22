import { extname, basename, join } from "path";
import { copy } from "fs-extra";

import * as React from "react";
import { ButtonGroup, Button, Classes, ContextMenu, Menu, MenuItem, Divider } from "@blueprintjs/core";

import { Texture, PickingInfo, StandardMaterial, PBRMaterial, CubeTexture } from "babylonjs";

import { Tools } from "../tools/tools";
import { undoRedo } from "../tools/undo-redo";

import { FilesStore, IFile } from "../project/files";
import { Project } from "../project/project";

import { Icon } from "../gui/icon";
import { Dialog } from "../gui/dialog";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";

export class TextureAssets extends AbstractAssets {
    /**
     * Defines the size of assets to be drawn in the panel. Default is 100x100 pixels.
     * @override
     */
    protected size: number = 50;

    private _extensions: string[] = [".png", ".jpg", ".jpeg", ".dds", ".env"];

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        return (
            <>
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        <Button key="add-textures" icon={<Icon src="plus.svg" />} small={true} text="Add..." onClick={() => this._addTextures()} />
                        <Divider />
                        <Button key="clear-unused" icon={<Icon src="recycle.svg" />} small={true} text="Clear Unused" onClick={() => this._clearUnusedTextures()} />
                    </ButtonGroup>
                </div>
                {super.render()}
            </>
        );
    }

    /**
     * Refreshes the component.
     * @override
     */
    public async refresh(object?: Texture): Promise<void> {
        for (const texture of this.editor.scene!.textures) {
            if (!(texture instanceof Texture) && !(texture instanceof CubeTexture)) { continue; }
            if (object && object !== texture) { continue; }

            const item = this.items.find((i) => i.key === texture.uniqueId.toString());
            if (!object && item) { continue; }

            texture.metadata = texture.metadata ?? { };
            if (!texture.metadata.editorName) {
                texture.metadata.editorName = basename(texture.name);
            }

            const name = basename(texture.name);
            const file = FilesStore.GetFileFromBaseName(name);
            if (!file) { continue; }

            const base64 = texture.isCube ? "./css/svg/dds.svg" : file.path;

            const itemData = { key: texture.uniqueId.toString(), id: texture.metadata.editorName, base64 };
            if (item) {
                const index = this.items.indexOf(item);
                if (index !== -1) { this.items[index] = itemData; }
            } else {
                this.items.push(itemData);
            }

            this.updateAssetObservable.notifyObservers();
        }

        return super.refresh();
    }

    /**
     * Called on the user clicks on an item.
     * @param item the item being clicked.
     * @param img the clicked image element.
     */
    public onClick(item: IAssetComponentItem, img: HTMLImageElement): void {
        super.onClick(item, img);

        const texture = this.editor.scene?.getTextureByUniqueID(parseInt(item.key));
        if (!texture) { return; }

        this.editor.selectedTextureObservable.notifyObservers(texture);
    }

    /**
     * Called on the user double clicks an item.
     * @param item the item being double clicked.
     * @param img the double-clicked image element.
     */
    public async onDoubleClick(item: IAssetComponentItem, img: HTMLImageElement): Promise<void> {
        super.onDoubleClick(item, img);

        const texture = this.editor.scene!.getTextureByUniqueID(parseInt(item.key));
        if (!texture || (!(texture instanceof Texture) && !(texture instanceof CubeTexture))) { return; }

        const name = basename(texture.name);
        const file = FilesStore.GetFileFromBaseName(name);
        if (!file) { return; }

        await this.editor.addWindowedPlugin("texture-viewer", undefined, { path: file.path });
    }

    /**
     * Called on the user right-clicks on an item.
     * @param item the item being right-clicked.
     * @param event the original mouse event.
     */
    public onContextMenu(item: IAssetComponentItem, e: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        super.onContextMenu(item, e);

        const texture = this.editor.scene!.getTextureByUniqueID(parseInt(item.key));
        if (!texture || (!(texture instanceof Texture) && !(texture instanceof CubeTexture))) { return; }

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Clone..." icon={<Icon src="clone.svg" />} onClick={() => this._cloneTexture(texture)} />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._removeTexture(item, texture)} />
            </Menu>,
            { left: e.clientX, top: e.clientY },
        );
    }

    /**
     * Called on the user drops an asset in editor. (typically the preview canvas).
     * @param item the item being dropped.
     * @param pickInfo the pick info generated on the drop event.
     * @override
     */
    public onDropAsset(item: IAssetComponentItem, pickInfo: PickingInfo): void {
        super.onDropAsset(item, pickInfo);

        if (!pickInfo.pickedMesh) { return; }

        const material = pickInfo.pickedMesh.material;
        if (!material) { return; }

        const texture = this.editor.scene!.getTextureByUniqueID(parseInt(item.key));
        if (!texture) { return; }

        if (material instanceof StandardMaterial) {
            const oldTexture = material.diffuseTexture;
            undoRedo.push({
                redo: () => material!.diffuseTexture = texture,
                undo: () => material!.diffuseTexture = oldTexture,
            });
            return;
        }

        if (material instanceof PBRMaterial) {
            const oldTexture = material.albedoTexture;
            undoRedo.push({
                redo: () => material!.albedoTexture = texture,
                undo: () => material!.albedoTexture = oldTexture,
            });
            return;
        }
    }

    /**
     * Called on the user drops files in the assets component and returns true if the files have been computed.
     * @param files the list of files being dropped.
     */
    public async onDropFiles(files: IFile[]): Promise<void> {
        for (const file of files) {
            const extension = extname(file.name).toLowerCase();
            if (this._extensions.indexOf(extension) === -1) { continue; }

            // Get file
            if (!FilesStore.GetFileFromBaseName(file.name)) {
                // Register file
                const path = join(Project.DirPath!, "files", file.name);
                FilesStore.List[path] = { path, name: file.name };
            }

            // Create texture
            let texture: Texture | CubeTexture;
            switch (extension) {
                case ".dds":
                case ".env":
                    texture = CubeTexture.CreateFromPrefilteredData(file.path, this.editor.scene!);
                    break;
                default:
                    texture = new Texture(file.path, this.editor.scene!);
                    break;
            }

            texture.onLoadObservable.addOnce(() => {
                const path = join("files", basename(texture.name));

                texture.name = path;
                if (texture.url) { texture.url = path; }
            });

            // Copy assets
            const dest = join(Project.DirPath!, "files", file.name);
            if (dest) { await copy(file.path, dest); }
        }

        return this.refresh();
    }

    /**
     * Called on the user wants to add textures.
     */
    private async _addTextures(): Promise<void> {
        const files = await Tools.ShowNativeOpenMultipleFileDialog();
        this.onDropFiles(files.map((f) => f));
    }

    /**
     * Clones the given texture
     */
    private async _cloneTexture(texture: Texture | CubeTexture): Promise<void> {
        const name = await Dialog.Show("New texture name", "Please provide a name for the cloned texture");
        
        const clone = texture.clone();
        clone.uniqueId = this.editor.scene!.getUniqueId();
        clone.metadata = Tools.CloneObject(clone.metadata);
        clone.metadata.editorName = name;

        this.refresh();
    }

    /**
     * Removes the given texture.
     */
    private _removeTexture(item: IAssetComponentItem, texture: Texture | CubeTexture): void {
        texture.dispose();

        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
        }
    }

    /**
     * Clears the unused textures in the project.
     */
    private _clearUnusedTextures(): void {
        const toRemove = this.items.map((i) => this.editor.scene!.getTextureByUniqueID(parseInt(i.key)));

        toRemove.forEach((texture) => {
            if (!texture) { return; }

            // Check materials
            for (const m of this.editor.scene!.materials) {
                const activeTextures = m.getActiveTextures();
                if (activeTextures.indexOf(texture) !== -1) {
                    return;
                }
            }

            // Check scene
            if (texture === this.editor.scene!.environmentTexture) { return; }

            // Not found, remove.
            texture.dispose();

            const itemIndex = this.items.findIndex((i) => i.key === texture.uniqueId.toString());
            if (itemIndex) {
                this.items.splice(itemIndex, 1);
            }
        });

        this.refresh();
    }
}

Assets.addAssetComponent({
    title: "Textures",
    ctor: TextureAssets,
});
