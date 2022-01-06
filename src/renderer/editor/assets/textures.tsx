import * as os from "os";
import { clipboard, shell } from "electron";
import { extname, basename, join } from "path";
import { copy, pathExists, readdir, remove } from "fs-extra";

import { Nullable, Undefinable } from "../../../shared/types";

import * as React from "react";
import { ButtonGroup, Button, Classes, ContextMenu, Menu, MenuItem, Divider, Popover, Position, MenuDivider, Tag, Intent } from "@blueprintjs/core";

import { Texture, PickingInfo, StandardMaterial, PBRMaterial, CubeTexture, BaseTexture, BasisTools } from "babylonjs";

import { FSTools } from "../tools/fs";
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

    private _extensions: string[] = [".png", ".jpg", ".jpeg", ".dds", ".env", ".basis"];

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
        const add =
            <Menu>
                <MenuItem key="add-pure-cube" text="Pur Cube Texture..." onClick={() => this._addPureCubeTexture()} />
            </Menu>;

        return (
            <>
                <div className={Classes.FILL} key="materials-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        <Popover content={add} position={Position.BOTTOM_LEFT}>
                            <Button icon={<Icon src="plus.svg" />} rightIcon="caret-down" small={true} text="Add" />
                        </Popover>
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
    public async refresh(): Promise<void> {
        for (const texture of this.editor.scene!.textures) {
            /*
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
            */
           
            if (!texture.name || texture.name.indexOf("data:") === 0) {
                continue;
            }
            
            const filePath = join(this.editor.assetsBrowser.assetsDirectory, texture.name);
            const exists = await pathExists(filePath);

            if (exists) {
                texture.metadata = texture.metadata ?? {};
                if (!texture.metadata.editorName) {
                    texture.metadata.editorName = basename(texture.name);
                }
                if (!texture.metadata.editorId) {
                    texture.metadata.editorId = Tools.RandomId();
                }

                const base64 = texture.isCube ? "../css/svg/dds.svg" : filePath ?? "";

                const itemData: IAssetComponentItem = {
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
     * Called once a project has been loaded, this function is used to clean up
     * unused assets files automatically.
     */
    public async clean(): Promise<void> {
        const files = await readdir(join(Project.DirPath!, "files"));
        const textures = files.filter((f) => this._extensions.indexOf(extname(f).toLowerCase()) !== -1);

        this.editor.scene!.textures.forEach((texture) => {
            let files: string[] = [texture.name];
            if (texture.isCube && !texture.isRenderTarget && texture.metadata?.isPureCube && texture["_files"]) {
                files = texture["_files"];
            }

            files.forEach((f) => {
                const extension = extname(f).toLowerCase();
                if (!extension || this._extensions.indexOf(extension) === -1) { return; }

                const index = textures.indexOf(basename(f));
                if (index !== -1) {
                    textures.splice(index, 1);
                }
            });
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

        const platform = os.platform();
        const explorer = platform === "darwin" ? "Finder" : "File Explorer";
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
                <MenuItem text="Copy Name" icon="clipboard" onClick={() => clipboard.writeText(texture.name, "clipboard")} />
                <MenuItem text="Copy Path" icon="clipboard" onClick={() => clipboard.writeText(`./scenes/${WorkSpace.GetProjectName()}/${texture.name}`, "clipboard")} />
                <MenuDivider />
                <MenuItem text={`Show in ${explorer}`} icon="document-open" onClick={() => {
                    const name = basename(texture.name);
                    const file = FilesStore.GetFileFromBaseName(name);
                    if (file) { shell.showItemInFolder(Tools.NormalizePathForCurrentPlatform(file.path)); }
                }} />
                <MenuDivider />
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
     * Configures the paths of the given texture.
     * @param texture defines the reference to the texture to configure.
     */
    public configureTexturePath(texture: Texture | CubeTexture): void {
        const path = join("files", basename(texture.name));

        texture.name = path;
        if (texture.url) { texture.url = path; }
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
     * Returns the last reference of the texture identified by the given name.
     * @param name defines the name of the texture to find.
     */
    public getLastTextureByName<T extends Texture>(name: string): Nullable<T> {
        let texture: Nullable<T> = null;

        for (const tex of this.editor.scene!.textures) {
            if (basename(tex.name) === name) {
                texture = tex as T;
            }
        }

        return texture;
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

        const ktx2CompressedTextures = WorkSpace.Workspace?.ktx2CompressedTextures;
        const ktxFormat = KTXTools.GetSupportedKtxFormat(this.editor.engine!);

        const compressedTextures: string[] = [];
        const compressedTexturesDest = join(Project.DirPath!, "files/compressed_textures");

        await FSTools.CreateDirectory(compressedTexturesDest);

        for (const texture of this.editor.scene!.textures) {
            if (!texture.name || !(texture instanceof Texture)) {
                this.editor.updateTaskFeedback(task, progress += step);
                continue;
            }

            const file = FilesStore.GetFileFromBaseName(basename(texture.name));
            if (!file) {
                this.editor.updateTaskFeedback(task, progress += step);
                continue;
            }

            texture.metadata ??= {};
            texture.metadata.ktx2CompressedTextures ??= {};

            const isUsingCompressedTexture = texture.metadata?.ktx2CompressedTextures?.isUsingCompressedTexture ?? false;

            if (ktxFormat && ktx2CompressedTextures?.enabled && ktx2CompressedTextures.enabledInPreview) {
                const previousUrl = texture.url;
                const ktxTexturePath = KTXTools.GetKtxFileName(file.name, ktxFormat);

                compressedTextures.push(basename(ktxTexturePath));

                if (!await pathExists(join(compressedTexturesDest, ktxTexturePath))) {
                    await KTXTools.CompressTexture(this.editor, file.path, compressedTexturesDest, ktxFormat);

                    // Update Url
                    texture.updateURL(join(compressedTexturesDest, basename(ktxTexturePath)));
                    texture.url = previousUrl;
                }

                texture.metadata.ktx2CompressedTextures.isUsingCompressedTexture = true;
            } else {
                if (isUsingCompressedTexture) {
                    texture.updateURL(join(Project.DirPath!, texture.name));
                }

                texture.metadata.ktx2CompressedTextures.isUsingCompressedTexture = false;
            }

            this.editor.updateTaskFeedback(task, progress += step);
        }

        // Remove old useless textures
        const dir = await readdir(compressedTexturesDest);
        for (const f of dir) {
            if (compressedTextures.indexOf(f) === -1) {
                await remove(join(compressedTexturesDest, f));
            }
        }

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
            <>
                <Tag fill={true} intent={Intent.PRIMARY}>{item.id}</Tag>
                <Divider />
                <Tag fill={true} interactive={true} intent={Intent.PRIMARY} onClick={() => shell.showItemInFolder(Tools.NormalizePathForCurrentPlatform(fullPath))}>{fullPath}</Tag>
                <Divider />
                <Tag fill={true} intent={Intent.PRIMARY}>{size.width}x{size.height}</Tag>
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
     * Called on the user wants to add a pure cube texture.
     */
    private async _addPureCubeTexture(): Promise<void> {
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
