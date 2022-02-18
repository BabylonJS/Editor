import { clipboard, shell } from "electron";
import { copy, pathExists } from "fs-extra";
import { extname, basename, join, dirname } from "path";

import { Nullable, Undefinable } from "../../../shared/types";

import * as React from "react";
import {
    ButtonGroup, Button, Classes, ContextMenu, Menu, MenuItem, Divider, MenuDivider, Tag,
    Icon as BPIcon,
} from "@blueprintjs/core";

import {
    Texture, PickingInfo, StandardMaterial, PBRMaterial, CubeTexture, BaseTexture, BasisTools,
    DynamicTexture,
} from "babylonjs";

import { Tools } from "../tools/tools";
import { KTXTools } from "../tools/ktx";
import { undoRedo } from "../tools/undo-redo";

import { Project } from "../project/project";
import { WorkSpace } from "../project/workspace";
import { FilesStore } from "../project/files";

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

    /**
     * Registers the component.
     */
    public static Register(): void {
        BasisTools.WasmModuleURL = "libs/basis_transcoder.wasm";
        BasisTools.JSModuleURL = `file://${join(__dirname, "../../../../../html/libs/basis_transcoder.js")}`;

        Assets.addAssetComponent({
            title: "Textures",
            identifier: "textures",
            ctor: TextureAssets,
        });
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        // const add =
        //     <Menu>
        //         <MenuItem key="add-pure-cube" text="Pur Cube Texture..." onClick={() => this._addPureCubeTexture()} />
        //     </Menu>;

        return (
            <>
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        {/* <Popover content={add} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="plus.svg" />} rightIcon="caret-down" small={true} text="Add" />
                        </Popover>
                        <Divider /> */}
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
    public async refresh(): Promise<void> {
        /*
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

            if (texture.name.indexOf("data:") === 0) { continue; }

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
            } else {
                const extension = extname(texture.name).toLowerCase();
                switch (extension) {
                    case ".basis": base64 = "../css/svg/file-archive.svg"; break;
                    default: break;
                }
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
        */

        for (const texture of this.editor.scene!.textures) {
            if (!texture.name || texture.name.indexOf("data:") === 0) {
                continue;
            }

            const isDyamicTexture = texture instanceof DynamicTexture;
            if (isDyamicTexture && !texture.metadata?.photoshop) {
                continue;
            }

            const filePath = join(this.editor.assetsBrowser.assetsDirectory, texture.name);
            const exists = await pathExists(filePath);

            if (exists || isDyamicTexture) {
                texture.metadata = texture.metadata ?? {};
                if (!texture.metadata.editorName) {
                    texture.metadata.editorName = basename(texture.name);
                }
                if (!texture.metadata.editorId) {
                    texture.metadata.editorId = Tools.RandomId();
                }

                let style: Undefinable<React.CSSProperties> = undefined;
                if (texture.isCube) {
                    style = { filter: "invert(1)" };
                }

                let base64 = texture.isCube ? "../css/svg/dds.svg" : filePath ?? "../css/svg/file.svg";
                if (isDyamicTexture) {
                    base64 = (texture as DynamicTexture).getContext().canvas.toDataURL("image/png");
                } else {
                    const extension = extname(texture.name).toLowerCase();
                    switch (extension) {
                        case ".basis": base64 = "../css/images/ktx.png"; break;
                        default: break;
                    }
                }

                const itemData: IAssetComponentItem = {
                    style,
                    base64,
                    key: texture.metadata.editorId,
                    id: texture.metadata.editorName,
                };

                if (texture.metadata?.isLocked) {
                    itemData.style = { border: "solid red" };
                }

                const existingItemIndex = this.items.findIndex((i) => i.key === texture.metadata?.editorId);
                if (existingItemIndex !== -1) {
                    this.items[existingItemIndex] = itemData;
                } else {
                    this.items.push(itemData);
                }
            }

            this.updateAssetObservable.notifyObservers();
        }

        await this.refreshCompressedTexturesFiles();

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

        texture.metadata = texture.metadata ?? {};
        texture.metadata.isLocked = texture.metadata.isLocked ?? false;

        const extension = extname(texture.name).toLowerCase();

        let setAsEnvironmentTexture: React.ReactNode;
        if (extension === ".env" || extension === ".dds") {
            setAsEnvironmentTexture = (
                <MenuItem text="Set As Environment Texture" icon={texture === this.editor.scene!.environmentTexture ? <Icon src="check.svg" /> : undefined} onClick={() => {
                    const oldTexture = this.editor.scene!.environmentTexture;
                    if (oldTexture === texture) { return; }

                    undoRedo.push({
                        description: `Set texture "${texture?.name ?? "undefined"}" as environment texture instead of "${oldTexture?.name ?? "undefined"}"`,
                        common: () => this.editor.inspector.refresh(),
                        undo: () => this.editor.scene!.environmentTexture = oldTexture,
                        redo: () => this.editor.scene!.environmentTexture = texture,
                    });
                }} />
            )
        }

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text="Copy Name" icon={<BPIcon icon="clipboard" color="white" />} onClick={() => clipboard.writeText(texture.name, "clipboard")} />
                <MenuItem text="Copy Path" icon={<BPIcon icon="clipboard" color="white" />} onClick={() => clipboard.writeText(`./scenes/${WorkSpace.GetProjectName()}/${texture.name}`, "clipboard")} />
                <MenuItem text="Show In Assets Browser" icon={<BPIcon icon="document-open" color="white" />} onClick={() => this.editor.assetsBrowser.revealPanelAndShowFile(texture.name)} />
                <MenuDivider />
                {/* <MenuItem text={`Show in ${explorer}`} icon="document-open" onClick={() => {
                    const name = basename(texture.name);
                    const file = FilesStore.GetFileFromBaseName(name);
                    if (file) { shell.showItemInFolder(Tools.NormalizePathForCurrentPlatform(file.path)); }
                }} />
                <MenuDivider /> */}
                <MenuItem text="Clone..." icon={<Icon src="clone.svg" />} onClick={() => this._cloneTexture(texture)} />
                <MenuDivider />
                <MenuItem text="Locked" icon={texture.metadata.isLocked ? <Icon src="check.svg" /> : undefined} onClick={() => {
                    texture.metadata.isLocked = !texture.metadata.isLocked;
                    item.style = item.style ?? {};
                    item.style.border = texture.metadata.isLocked ? "solid red" : "";
                    super.refresh();
                }} />
                {setAsEnvironmentTexture}
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
                description: `Set "${texture.name}" as diffuse texture for material "${material.name}" instead of "${oldTexture?.name ?? "undefined"}"`,
                redo: () => material!.diffuseTexture = texture,
                undo: () => material!.diffuseTexture = oldTexture,
            });
            return;
        }

        if (material instanceof PBRMaterial) {
            const oldTexture = material.albedoTexture;
            undoRedo.push({
                description: `Set "${texture.name}" as diffuse texture for material "${material.name}" instead of "${oldTexture?.name ?? "undefined"}"`,
                redo: () => material!.albedoTexture = texture,
                undo: () => material!.albedoTexture = oldTexture,
            });
            return;
        }
    }

    /**
     * Called on the user pressed the delete key on the asset.
     * @param item defines the item being deleted.
     */
    public onDeleteAsset(item: IAssetComponentItem): void {
        super.onDeleteAsset(item);

        const texture = this._getTexture(item.key);
        if (!texture || (!(texture instanceof Texture) && !(texture instanceof CubeTexture))) { return; }

        this._removeTexture(item, texture);
    }

    /**
     * In case of using compressed textures, refreshes the associoated compressed textures
     * files for each existing texture in the project.
     */
    public async refreshCompressedTexturesFiles(): Promise<void> {
        if (!WorkSpace.HasWorkspace()) {
            return;
        }

        const task = this.editor.addTaskFeedback(0, "Updating compressed textures...");
        const step = 100 / this.editor.scene!.textures.length;

        let progress = 0;

        const promises: Promise<void>[] = [];

        const ktx2CompressedTextures = WorkSpace.Workspace?.ktx2CompressedTextures;
        const ktxFormat = KTXTools.GetSupportedKtxFormat(this.editor.engine!);

        for (const texture of this.editor.scene!.textures) {
            const extension = extname(texture.name);
            if (!extension || !texture.name || texture.name.indexOf("data:") === 0 || !(texture instanceof Texture)) {
                this.editor.updateTaskFeedback(task, progress += step);
                continue;
            }

            texture.metadata ??= {};
            texture.metadata.ktx2CompressedTextures ??= {};

            const isUsingCompressedTexture = texture.metadata?.ktx2CompressedTextures?.isUsingCompressedTexture ?? false;

            if (ktxFormat && ktx2CompressedTextures?.enabled && ktx2CompressedTextures.enabledInPreview) {
                if (promises.length > 5) {
                    await Promise.all(promises);
                    promises.splice(0);
                }

                const compressedTexturesDest = join(this.editor.assetsBrowser.assetsDirectory, dirname(texture.name));
                if (!(await pathExists(compressedTexturesDest))) {
                    continue;
                }

                const previousUrl = texture.url;
                const ktxTexturePath = KTXTools.GetKtxFileName(texture.name, ktxFormat);

                promises.push(new Promise<void>(async (resolve) => {
                    if (!(await pathExists(join(compressedTexturesDest, basename(ktxTexturePath))))) {
                        const texturePath = join(this.editor.assetsBrowser.assetsDirectory, texture.name);
                        await KTXTools.CompressTexture(this.editor, texturePath, compressedTexturesDest, ktxFormat);
                    }

                    // Update Url
                    if (!texture.metadata.ktx2CompressedTextures.isUsingCompressedTexture) {
                        texture.updateURL(join(compressedTexturesDest, basename(ktxTexturePath)));
                        texture.url = previousUrl;
                    }

                    texture.metadata.ktx2CompressedTextures.isUsingCompressedTexture = true;

                    resolve();
                }));
            } else {
                if (isUsingCompressedTexture) {
                    texture.updateURL(join(this.editor.assetsBrowser.assetsDirectory, texture.name));
                }

                texture.metadata.ktx2CompressedTextures.isUsingCompressedTexture = false;
            }

            this.editor.updateTaskFeedback(task, progress += step);
        }

        await Promise.all(promises);

        this.editor.closeTaskFeedback(task, 1000);
    }

    /**
     * Returns the content of the item's tooltip on the pointer is over the given item.
     * @param item defines the reference to the item having the pointer over.
     */
    protected getItemTooltipContent(item: IAssetComponentItem): Undefinable<JSX.Element> {
        const texture = this._getTexture(item.key);
        if (!texture) { return undefined; }

        const size = texture.getSize();
        const fullPath = join(Project.DirPath!, texture.name);

        return (
            <div style={{ width: "256px", height: "350px" }}>
                <Tag fill intent="primary">{item.id}</Tag>
                <Divider />
                <Tag fill interactive={true} intent="primary" onClick={() => shell.showItemInFolder(Tools.NormalizePathForCurrentPlatform(fullPath))}>{fullPath}</Tag>
                <Divider />
                <Tag fill intent="primary">{size.width}x{size.height}</Tag>
                <Divider />
                <img
                    src={item.base64}
                    style={{
                        width: "256px",
                        height: "256px",
                        objectFit: "contain",
                        backgroundColor: "#222222",
                        left: "50%",
                    }}
                ></img>
            </div>
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
     * Called on the user wants to add a pure cube texture.
     */
    public async _addPureCubeTexture(): Promise<void> {
        const texture = await PureCubeDialog.Show(this.editor);
        if (!texture) { return; }

        const files = texture["_files"] as string[] ?? [];

        // Copy files
        for (let i = 0; i < files.length; i++) {
            const f = files[i];

            // Copy assets
            const dest = join(Project.DirPath!, "files", basename(f));
            if (dest) { await copy(f, dest); }

            FilesStore.List[f] = { path: f, name: basename(f) };
        }

        // Change Urls
        files.forEach((f, index) => {
            files[index] = join("files", basename(f));
        });

        this.refresh();
    }

    /**
     * Clones the given texture
     */
    private async _cloneTexture(texture: Texture | CubeTexture): Promise<void> {
        let name = await Dialog.Show("New texture name", "Please provide a name for the cloned texture");

        const cloneExtension = extname(name);
        const textureExtension = extname(texture.name);

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
        if (this.editor.preview.state.isIsolatedMode) {
            return;
        }

        const toRemove = this.items.map((i) => this._getTexture(i.key));

        toRemove.forEach((texture) => {
            if (!texture || texture.metadata?.isLocked) { return; }

            // Check used
            const used = this._getPropertiesUsingTexture(texture);
            if (used.length) { return; }

            // Not found, remove.
            texture.dispose();
            this.editor.console.logInfo(`Removed unused texture "${texture.metadata?.editorName ?? texture.name}"`);

            const itemIndex = this.items.findIndex((i) => i.key === texture.uid);
            if (itemIndex) {
                this.items.splice(itemIndex, 1);
            }
        });

        this.items = [];
        this.refresh();
    }

    /**
     * Returns the list of all objects that use the texture.
     */
    private _getPropertiesUsingTexture(texture: BaseTexture): _IUsedTextureInfos[] {
        const result: _IUsedTextureInfos[] = [];

        // Check materials
        for (const m of this.editor.scene!.materials) {
            for (const thing in m) {
                const value = m[thing];

                if (value === texture) {
                    result.push({ object: m, property: thing });
                }

                // In case of PBR materials.
                for (const thing2 in value) {
                    const value2 = value[thing2];
                    if (value2 === texture) {
                        result.push({ object: m, property: `${thing}.${thing2}` });
                    }
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
