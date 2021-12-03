import { basename } from "path";
import { clipboard } from "electron";

import * as React from "react";
import { ContextMenu, Menu, MenuDivider, MenuItem, Popover, Icon as BPIcon } from "@blueprintjs/core";

import { PickingInfo, Sound, Vector3 } from "babylonjs";

import { Icon } from "../../../../gui/icon";

import { Tools } from "../../../../tools/tools";

import { AssetsBrowserItemHandler } from "../item-handler";

export class SoundItemHandler extends AssetsBrowserItemHandler {
    /**
     * Computes the image to render.
     */
    public computePreview(): React.ReactNode {
        const icon = (
            <Icon
                src="volume-up.svg"
                style={{
                    width: "100%",
                    height: "100%",
                }}
            />
        );

        return (
            <Popover content={this._getSoundPopoverContent()}>
                {icon}
            </Popover>
        );
    }

    /**
     * Returns the popover content to play the sound.
     */
    private _getSoundPopoverContent(): JSX.Element {
        return (
            <div style={{ width: "300px" }}>
                <audio src={this.props.absolutePath} controls />
            </div>
        )
    }

    /**
     * Called on the user right clicks on the item.
     * @param ev defines the reference to the event object.
     */
    public onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        const sounds = this.props.editor.scene!.mainSoundTrack.soundCollection.filter((s) => {
            return s.name === this.props.relativePath && !s.spatialSound;
        });

        ContextMenu.show((
            <Menu>
                <MenuItem text={sounds.length ? "Unload" : "Load"} icon={<BPIcon icon={sounds.length ? "remove" : "add"} color="white" />} onClick={() => this._loadOrUnloadSound(sounds)} />
                <MenuDivider />
                <MenuItem text="Copy Path" icon={<BPIcon icon="clipboard" color="white" />} onClick={() => clipboard.writeText(this.props.relativePath, "clipboard")} />
                <MenuItem text="Copy Absolute Path" icon={<BPIcon icon="clipboard" color="white" />} onClick={() => clipboard.writeText(this.props.absolutePath, "clipboard")} />
                <MenuDivider />
                {this.getCommonContextMenuItems()}
            </Menu>
        ), {
            top: ev.clientY,
            left: ev.clientX,
        });
    }

    /**
     * Called on the 
     * @param ev defines the reference to the event object.
     * @param pick defines the picking info generated while dropping in the preview.
     */
    public onDropInPreview(_: React.DragEvent<HTMLElement>, pick: PickingInfo): void {
        if (!pick.pickedMesh) {
            return;
        }

        const existingSounds = this.props.editor.scene!.mainSoundTrack.soundCollection.filter((s) => s.name === this.props.relativePath);
        if (existingSounds.find((s) => s["_connectedTransformNode"] === pick.pickedMesh)) {
            return;
        }

        const sound = new Sound(basename(this.props.absolutePath), this.props.absolutePath, this.props.editor.scene!, () => {
            sound.name = this.props.relativePath;
            sound.attachToMesh(pick.pickedMesh!);
            sound.setPosition(Vector3.Zero());

            this.props.editor.graph.refresh();
        }, {
            autoplay: false,
        });

        sound.metadata = {
            id: Tools.RandomId(),
        };
    }

    /**
     * Called on the user wants to load or unload a sound asset in the scene from the context menu.
     */
    private _loadOrUnloadSound(sounds: Sound[]): void {
        if (sounds?.length) {
            sounds.forEach((s) => this.props.editor.scene!.mainSoundTrack.removeSound(s));
            return this.props.editor.graph.refresh();
        }

        const sound = new Sound(basename(this.props.absolutePath), this.props.absolutePath, this.props.editor.scene!, () => {
            sound!.name = this.props.relativePath;
            this.props.editor.graph.refresh();
        }, {
            autoplay: false,
        });
    }
}
