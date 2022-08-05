import { join } from "path";
import { readJSON } from "fs-extra";

import * as React from "react";
import { ContextMenu, Menu } from "@blueprintjs/core";

import { PickingInfo, Mesh, Vector3, ParticleSystem } from "babylonjs";

import { Icon } from "../../../../gui/icon";

import { Tools } from "../../../../tools/tools";

import { AssetsBrowserItemHandler } from "../item-handler";

export class ParticlesSystemItemHandler extends AssetsBrowserItemHandler {
    /**
     * Computes the image to render.
     */
    public computePreview(): React.ReactNode {
        this.props.onSetTitleColor("#48aff0");

        return (
            <Icon
                src="wind.svg"
                style={{
                    width: "100%",
                    height: "100%",
                }}
            />
        );
    }

    /**
     * Called on the user clicks on the asset.
     * @param ev defines the reference to the event object.
     */
    public onClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
        const existing = this.props.editor.scene!.particleSystems.find((ps) => ps["metadata"]?.editorPath === this.props.relativePath);
        if (existing) {
            this.props.editor.inspector.setSelectedObject(existing);
        }
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
     * Called on the user drops the asset in the editor's preview canvas.
     * @param ev defines the reference to the event object.
     * @param pick defines the picking info generated while dropping in the preview.
     */
    public async onDropInPreview(_: DragEvent, pick: PickingInfo): Promise<void> {
        const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });

        const emitter = new Mesh(json.name, this.props.editor.scene!);
        emitter.id = Tools.RandomId();
        emitter.position.copyFrom(pick.pickedPoint ?? Vector3.Zero());

        const ps = ParticleSystem.Parse(json, this.props.editor.scene!, join(this.props.editor.assetsBrowser.assetsDirectory, "/"));
        ps.emitter = emitter;
        ps.id = Tools.RandomId();
        ps["metadata"] = json.metadata ?? {
            editorPath: this.props.relativePath,
        };

        this.props.editor.graph.refresh();
    }
}
