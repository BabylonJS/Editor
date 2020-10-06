import { shell } from "electron";
import { join, extname, basename, dirname } from "path";
import { copy, readdir, remove } from "fs-extra";
import * as os from "os";

import { Undefinable } from "../../../shared/types";

import * as React from "react";
import { ButtonGroup, Button, Classes, Divider, ContextMenu, Menu, MenuItem, MenuDivider } from "@blueprintjs/core";

import { Sound, PickingInfo, Vector3 } from "babylonjs";

import { Project } from "../project/project";
import { IFile, FilesStore } from "../project/files";

import { Icon } from "../gui/icon";

import { Tools } from "../tools/tools";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";

export class SoundAssets extends AbstractAssets {
    /**
     * Defines the size of assets to be drawn in the panel. Default is 100x100 pixels.
     * @override
     */
    protected size: number = 50;

    private _extensions: string[] = [".mp3", ".wav", ".wave"];

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const node = super.render();

        return (
            <>
                <div className={Classes.FILL} key="sounds-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        <Button key="add-meshes" icon={<Icon src="plus.svg" />} small={true} text="Add..." onClick={() => this._addSounds()} />
                        <Divider />
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
        for (const s of this.editor.scene!.mainSoundTrack.soundCollection) {
            s.metadata = s.metadata ?? { };
            if (!s.metadata.id) { s.metadata.id = Tools.RandomId(); }

            const item = this.items.find((i) => i.key === s.metadata.id);
            if (item) { continue; }

            this.items.push({ key: s.metadata.id, id: s.name, base64: "../css/svg/volume-up.svg" });
        }

        return super.refresh();
    }

    /**
     * Called once a project has been loaded, this function is used to clean up
     * unused assets files automatically.
     */
    public async clean(): Promise<void> {
        if (!Project.DirPath) { return; }

        const usedSounds: string[] = [];
        const existingFiles = (await readdir(join(Project.DirPath, "files"))).filter((f) => this._extensions.indexOf(extname(f).toLowerCase()) !== -1);
        const soundtracks = (this.editor.scene!.soundTracks ?? []).concat([this.editor.scene!.mainSoundTrack]).filter((st) => st);

        for (const soundtrack of soundtracks) {
            for (const sound of soundtrack.soundCollection) {
                const name = basename(sound.name);
                const existingIndex = usedSounds.indexOf(name);
                if (existingIndex === -1) {
                    usedSounds.push(name);
                }
            }
        }

        for (const file of existingFiles) {
            const index = usedSounds.indexOf(file);
            if (index === -1) {
                try {
                    await remove(join(Project.DirPath!, "files", file));
                } finally {
                    const fileRef = FilesStore.GetFileFromBaseName(file);
                    if (fileRef) {
                        FilesStore.RemoveFileFromPath(fileRef.path);
                    }
                }
            }
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

            // Register file
            const path = join(Project.DirPath!, "files", file.name);
            FilesStore.List[path] = { path, name: file.name };

            // Create sound
            const sound = new Sound(file.name, file.path, this.editor.scene!, () => {
                sound.name = join("files", basename(file.name));
            }, {
                autoplay: false,
            });

            // Copy assets
            const dest = join(Project.DirPath!, "files", file.name);
            if (dest) { await copy(file.path, dest); }
        }
    }

    /**
     * Called on the user drops an asset in editor. (typically the preview canvas).
     * @param item the item being dropped.
     * @param pickInfo the pick info generated on the drop event.
     * @override
     */
    public onDropAsset(item: IAssetComponentItem, pickInfo: PickingInfo): void {
        if (!pickInfo.pickedMesh) { return; }

        const sound = this._getSound(item);
        if (!sound) { return; }

        if (sound["_connectedTransformNode"]) {
            sound.detachFromMesh();
            sound.setPosition(Vector3.Zero());
        }

        sound.attachToMesh(pickInfo.pickedMesh);
        sound.setPosition(Vector3.Zero());
        sound.spatialSound = true;
        
        this.editor.graph.refresh();
    }

    /**
     * Called on the user double clicks an item.
     * @param item the item being double clicked.
     * @param img the double-clicked image element.
     */
    public async onDoubleClick(item: IAssetComponentItem, img: HTMLImageElement): Promise<void> {
        super.onDoubleClick(item, img);

        const sound = this._getSound(item);
        if (!sound) { return; }

        this.editor.inspector.setSelectedObject(sound);
    }

    /**
     * Called on the user right-clicks on an item.
     * @param item the item being right-clicked.
     * @param event the original mouse event.
     */
    public onContextMenu(item: IAssetComponentItem, e: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        super.onContextMenu(item, e);

        const sound = this._getSound(item);
        if (!sound) { return; }

        const platform = os.platform();
        const explorer = platform === "darwin" ? "Finder" : "File Explorer";

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text={`Show in ${explorer}`} icon="document-open" onClick={() => {
                    const name = basename(sound.name);
                    const file = FilesStore.GetFileFromBaseName(name);
                    if (file) { shell.openItem(dirname(file.path)); }
                }} />
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._removeSound(item, sound)} />
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

        const sound = this._getSound(item);
        if (sound) {
            this._removeSound(item, sound);
        }
    }

    /**
     * Called on the user wants to add textures.
     */
    private async _addSounds(): Promise<void> {
        const files = await Tools.ShowNativeOpenMultipleFileDialog();
        await this.onDropFiles(files);
        return this.refresh();
    }

    /**
     * Removes the given sound.
     */
    private _removeSound(item: IAssetComponentItem, sound: Sound): void {
        sound.dispose();

        const index = this.items.indexOf(item);
        if (index !== -1) {
            this.items.splice(index, 1);
        }

        this.refresh();
        this.editor.graph.refresh();
    }

    /**
     * Returns the sound according to the given item.
     */
    private _getSound(item: IAssetComponentItem): Undefinable<Sound> {
        return this.editor.scene!.mainSoundTrack.soundCollection.find((s) => s.metadata?.id === item.key);
    }
}

Assets.addAssetComponent({
    title: "Sounds",
    identifier: "sounds",
    ctor: SoundAssets,
});
