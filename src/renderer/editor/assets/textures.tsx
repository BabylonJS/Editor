import { shell } from "electron";
import { extname, basename, join, dirname } from "path";
import { copy, readdir, remove } from "fs-extra";
import * as os from "os";

import { Nullable, Undefinable } from "../../../shared/types";

import * as React from "react";
import { ButtonGroup, Button, Classes, ContextMenu, Menu, MenuItem, Divider, Popover, Position, MenuDivider, Tag } from "@blueprintjs/core";

import { Texture, PickingInfo, StandardMaterial, PBRMaterial, CubeTexture, DynamicTexture, BaseTexture } from "babylonjs";

import { Tools } from "../tools/tools";
import { undoRedo } from "../tools/undo-redo";

import { FilesStore, IFile } from "../project/files";
import { Project } from "../project/project";

import { Icon } from "../gui/icon";
import { Dialog } from "../gui/dialog";
import { Alert } from "../gui/alert";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";

import { PureCubeDialog } from "./textures/pure-cube";

interface _IUsedTextureInfos {
    object: any;
    property: string;
}

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
        const add = 
            <Menu>
                <MenuItem key="add-from-files" text="From Files..." onClick={() => this._addTextures()} />
                <MenuItem key="add-pure-cube" text="Pur Cube Texture..." onClick={() => this._addPureCubeTexture()} />
            </Menu>;
        
        return (
            <>
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        <Popover content={add} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="plus.svg"/>} rightIcon="caret-down" small={true} text="Add"/>
                        </Popover>
                        <Divider />
                        <Button key="clear-unused" icon={<Icon src="recycle.svg" />} small={true} text="Clear Unused" onClick={() => this._clearUnusedTextures()} />
                        <Button key="clear-unused-files" icon={<Icon src="recycle.svg" />} small={true} text="Clear Unused Files..." onClick={() => this._clearUnusedTexturesFiles()} />
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
            const isDyamicTexture = texture instanceof DynamicTexture;

            if (!(texture instanceof Texture) && !(texture instanceof CubeTexture) && !isDyamicTexture) { continue; }
            if (object && object !== texture) { continue; }
            if (isDyamicTexture && !texture.metadata?.photoshop) { continue; }

            const item = this.items.find((i) => i.key === texture.metadata?.editorId);
            if (!object && item) { continue; }

            texture.metadata = texture.metadata ?? { };
            if (!texture.metadata.editorName) {
                texture.metadata.editorName = basename(texture.name);
            }
            if (!texture.metadata.editorId) {
                texture.metadata.editorId = Tools.RandomId();
            }

            const name = basename(texture.name);
            const file = FilesStore.GetFileFromBaseName(name);
            if (!file && !isDyamicTexture) {
                // Maybe pure cube texture, check again
                if (!texture.isCube || texture.isRenderTarget) {
                    continue;
                }
            }

            let base64 = texture.isCube ? "../css/svg/dds.svg" : file?.path ?? "";
            if (isDyamicTexture) {
                base64 = (texture as DynamicTexture).getContext().canvas.toDataURL("image/png");
            }

            const itemData: IAssetComponentItem = { key: texture.metadata.editorId, id: texture.metadata.editorName, base64 };
            if (texture.metadata?.isLocked) {
                itemData.style = { border: "solid red" };
            }

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

        const texture = this._getTexture(item.key);
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

        const texture = this._getTexture(item.key);
        if (!texture || (!(texture instanceof Texture) && !(texture instanceof CubeTexture))) { return; }

        const name = basename(texture.name);
        const file = FilesStore.GetFileFromBaseName(name);
        if (!file) { return; }

        await this.editor.addWindowedPlugin("texture-viewer", undefined, file.path);
    }

    /**
     * Called on the user right-clicks on an item.
     * @param item the item being right-clicked.
     * @param event the original mouse event.
     */
    public onContextMenu(item: IAssetComponentItem, e: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        super.onContextMenu(item, e);

        const texture = this._getTexture(item.key);
        if (!texture || (!(texture instanceof Texture) && !(texture instanceof CubeTexture))) { return; }

        texture.metadata = texture.metadata ?? { };
        texture.metadata.isLocked = texture.metadata.isLocked ?? false;

        const platform = os.platform();
        const explorer = platform === "darwin" ? "Finder" : "File Explorer";

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text={`Show in ${explorer}`} icon="document-open" onClick={() => {
                    const name = basename(texture.name);
                    const file = FilesStore.GetFileFromBaseName(name);
                    if (file) { shell.openItem(dirname(file.path)); }
                }} />
                <MenuItem text="Clone..." icon={<Icon src="clone.svg" />} onClick={() => this._cloneTexture(texture)} />
                <MenuDivider />
                <MenuItem text="Locked" icon={texture.metadata.isLocked ? <Icon src="check.svg" /> : undefined} onClick={() => {
                    texture.metadata.isLocked = !texture.metadata.isLocked;
                    item.style = item.style ?? { };
                    item.style.border = texture.metadata.isLocked ? "solid red": "";
                    super.refresh();
                }} />
                <MenuDivider />
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

        const texture = this._getTexture(item.key);
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
    }

    /**
     * Returns the content of the item's tooltip on the pointer is over the given item.
     * @param item defines the reference to the item having the pointer over.
     */
    protected getItemTooltipContent(item: IAssetComponentItem): Undefinable<JSX.Element> {
        const texture = this._getTexture(item.key);
        if (!texture) { return undefined; }

        const size = texture.getSize();

        return (
            <>
                <Tag fill={true}>{item.id}</Tag>
                <Divider />
                <Tag fill={true}>{join(Project.DirPath!, texture.name)}</Tag>
                <Divider />
                <Tag fill={true}>{size.width}x{size.height}</Tag>
                <Divider />
                <img
                    src={item.base64}
                    style={{
                        width: "100%",
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
     * Gets the texture identified by the given uid.
     */
    private _getTexture(uid: string): Nullable<BaseTexture> {
        for (const texture of this.editor.scene!.textures) {
            if (texture.metadata?.editorId === uid) { return texture; }
        }

        return null;
    }

    /**
     * Called on the user wants to add textures.
     */
    private async _addTextures(): Promise<void> {
        const files = await Tools.ShowNativeOpenMultipleFileDialog();
        await this.onDropFiles(files.map((f) => f));

        return this.refresh();
    }

    /**
     * Called on the user wants to add a pure cube texture.
     */
    private async _addPureCubeTexture(): Promise<void> {
        const texture = await PureCubeDialog.Show(this.editor);
        if (!texture) { return; }

        const files = texture["_files"] as string[] ?? [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            
            // Copy assets
            const dest = join(Project.DirPath!, "files", basename(f));
            if (dest) { await copy(f, dest); }
        }

        this.refresh();
    }

    /**
     * Clones the given texture
     */
    private async _cloneTexture(texture: Texture | CubeTexture): Promise<void> {
        let name = await Dialog.Show("New texture name", "Please provide a name for the cloned texture");

        const textureExtension = extname(texture.name);
        const cloneExtension = extname(name);

        if (cloneExtension !== textureExtension) {
            name += textureExtension;
        }

        // Check existing
        const existing = this.items.find((i) => i.id === name);
        if (existing) {
            return Alert.Show("Can't clone texture", `A texture named "${name}" already exists.`);
        }

        const clone = texture.clone();
        clone.uniqueId = this.editor.scene!.getUniqueId();
        clone.metadata = {
            editorName: name,
        };

        this.refresh();
    }

    /**
     * Removes the given texture.
     */
    private _removeTexture(item: IAssetComponentItem, texture: Texture | CubeTexture): void {
        if (texture.metadata?.isLocked) { return; }

        const used = this._getPropertiesUsingTexture(texture);
        used.forEach((u) => {
            u.object[u.property] = null;
        });

        // Not found, remove.
        texture.dispose();

        const itemIndex = this.items.findIndex((i) => i.key === texture.uid);
        if (itemIndex) {
            this.items.splice(itemIndex, 1);
        }

        texture.dispose();

        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
        }

        this.refresh();
    }

    /**
     * Clears the unused textures in the project.
     */
    private _clearUnusedTextures(): void {
        const toRemove = this.items.map((i) => this._getTexture(i.key));

        toRemove.forEach((texture) => {
            if (!texture || texture.metadata?.isLocked) { return; }

            // Check used
            const used = this._getPropertiesUsingTexture(texture);
            if (used.length) { return; }

            // Not found, remove.
            texture.dispose();

            const itemIndex = this.items.findIndex((i) => i.key === texture.uid);
            if (itemIndex) {
                this.items.splice(itemIndex, 1);
            }
        });

        this.items = [];
        this.refresh();
    }

    /**
     * Clears all the unsed textures files.
     */
    private async _clearUnusedTexturesFiles(): Promise<void> {
        const files = await readdir(join(Project.DirPath!, "files"));
        const textures = files.filter((f) => this._extensions.indexOf(extname(f).toLowerCase()) !== -1);

        this.editor.scene!.textures.forEach((texture) => {
            const extension = extname(texture.name).toLowerCase();
            if (!extension || this._extensions.indexOf(extension) === -1) { return; }

            const index = textures.indexOf(basename(texture.name));
            if (index !== -1) {
                textures.splice(index, 1);
            }
        });

        if (!textures.length) { return; }

        // Remove!
        const step = 100 / textures.length;
        let amount = 0;

        const task = this.editor.addTaskFeedback(0, "Cleaning Textures Files...");

        for (const name of textures) {
            const path = join(Project.DirPath!, "files", name);
            try {
                await remove(path);
            } finally {
                this.editor.updateTaskFeedback(task, amount += step);
            }
        }

        this.editor.updateTaskFeedback(task, 100, "Done");
        this.editor.closeTaskFeedback(task, 1000);
    }

    /**
     * Returns the list of all objects that use the texture.
     */
    private _getPropertiesUsingTexture(texture: BaseTexture): _IUsedTextureInfos[] {
        const result: _IUsedTextureInfos[] = [];

        // Check materials
        for (const m of this.editor.scene!.materials) {
            for (const thing in m) {
                if (m[thing] === texture) {
                    result.push({ object: m, property: thing });
                }
            }
        }

        // Check particle systems
        for (const ps of this.editor.scene!.particleSystems) {
            if (texture === ps.particleTexture) {
                result.push({ object: ps, property: "particleTexture" });
            }

            if (texture === ps.noiseTexture) {
                result.push({ object: ps, property: "noiseTexture" });
            }
        }

        // Check scene
        if (texture === this.editor.scene!.environmentTexture) {
            result.push({ object: this.editor.scene, property: "environmentTexture" });
        }

        return result;
    }
}

Assets.addAssetComponent({
    title: "Textures",
    ctor: TextureAssets,
});
