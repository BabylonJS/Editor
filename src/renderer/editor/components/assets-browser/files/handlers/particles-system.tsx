import { join } from "path";
import { readJSON } from "fs-extra";

import * as React from "react";

import { PickingInfo, Mesh, Vector3, ParticleSystem } from "babylonjs";

import { Icon } from "../../../../gui/icon";

import { Tools } from "../../../../tools/tools";

import { AssetsBrowserItemHandler } from "../item-handler";

export class ParticlesSystemItemHandler extends AssetsBrowserItemHandler {
    /**
     * Computes the image to render.
     */
    public computePreview(): React.ReactNode {
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
     * Called on the user drops the asset in the editor's preview canvas.
     * @param ev defines the reference to the event object.
     * @param pick defines the picking info generated while dropping in the preview.
     */
    public async onDropInPreview(_: React.DragEvent<HTMLElement>, pick: PickingInfo): Promise<void> {
        const json = await readJSON(this.props.absolutePath, { encoding: "utf-8" });

        if (this.props.editor.scene!.particleSystems.find((ps) => ps["metadata"]?.editorPath === this.props.relativePath)) {
            return;
        }

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
