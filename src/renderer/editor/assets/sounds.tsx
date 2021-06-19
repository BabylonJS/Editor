import { Undefinable } from "../../../shared/types";

import * as React from "react";
import { ButtonGroup, Button, Classes } from "@blueprintjs/core";

import { Sound, PickingInfo, Vector3 } from "babylonjs";

import { Tools } from "../tools/tools";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";

export class SoundAssets extends AbstractAssets {
    /**
     * Defines the size of assets to be drawn in the panel. Default is 100x100 pixels.
     * @override
     */
    protected size: number = 50;

    /**
     * Registers the component.
     */
    public static Register(): void {
        Assets.addAssetComponent({
            title: "Sounds",
            identifier: "sounds",
            ctor: SoundAssets,
        });
    }

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
            s.metadata = s.metadata ?? {};
            if (!s.metadata.id) {
                s.metadata.id = Tools.RandomId();
            }

            const item = this.items.find((i) => i.key === s.metadata.id);
            if (item) {
                continue;
            }

            this.items.push({
                id: s.name,
                key: s.metadata.id,
                base64: "../css/svg/volume-up.svg",
            });
        }

        return super.refresh();
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
