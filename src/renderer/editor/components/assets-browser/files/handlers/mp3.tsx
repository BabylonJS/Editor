import * as React from "react";
import { ContextMenu, Menu, Popover } from "@blueprintjs/core";

import { PickingInfo, Sound, Vector3 } from "babylonjs";

import { Icon } from "../../../../gui/icon";

import { AssetsBrowserItemHandler } from "../item-handler";
import { basename } from "path";

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
        ContextMenu.show((
            <Menu>
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
        }, {
            autoplay: false,
        });

        this.props.editor.graph.refresh();
    }
}
