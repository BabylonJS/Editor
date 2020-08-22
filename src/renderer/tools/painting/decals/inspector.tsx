import * as React from "react";

import { MaterialAssets } from "../../../editor/assets/materials";
import { IAssetComponentItem } from "../../../editor/assets/abstract-assets";

import { DecalsPainter } from "../../../editor/painting/decals/decals";

import { PaintingInspector } from "../painting-inspector";

export class DecalsPainterInspector extends PaintingInspector<DecalsPainter> {
    private _materialName: string = "";

    /**
     * Called on the component did mount.
     * @override
     */
    public onUpdate(): void {
        this.selectedObject = new DecalsPainter(this.editor);
        this.addOptions();
    }

    /**
     * Called on the component will unmount.
     * @override
     */
    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this.selectedObject?.dispose();
    }

    /**
     * Adds the common editable properties.
     */
    protected addOptions(): void {
        const options = this.tool!.addFolder("Options");
        options.open();

        // Add options
        options.add(this.selectedObject, "angle").min(-Math.PI).max(Math.PI).step(0.01).name("Angle");
        options.add(this.selectedObject, "size").min(0).step(0.01).name("Size");
        options.add(this.selectedObject, "width").min(0).step(0.01).name("Width");
        options.add(this.selectedObject, "height").min(0).step(0.01).name("Height");
        options.add(this.selectedObject, "receiveShadows").name("Receive Shadows");

        // Add suggest material
        let assets: IAssetComponentItem[];

        this._materialName = this.selectedObject.material?.name ?? "None";
        options.addSuggest(this, "_materialName", undefined, {
            onShowIcon: (i) => {
                const asset = assets?.find((a) => a.id === i);
                if (!asset) { return undefined; }
                
                return <img src={asset.base64} style={{ width: 20, height: 20 }}></img>;
            },
            onShowTooltip: (i) => {
                const asset = assets?.find((a) => a.id === i);
                if (!asset) { return undefined; }
                
                return <img src={asset.base64} style={{ maxWidth: "100%", width: 100, maxHeight: "100%", height: 100 }}></img>;
            },
            onUpdate: () => ["None"].concat((assets = this.editor.assets.getAssetsOf(MaterialAssets)!).map((a) => a.id)),
        }).name("Material").onChange(() => {
            if (this._materialName === "None") {
                this.selectedObject!.material = null;
                return;
            }

            const asset = assets?.find((a) => a.id === this._materialName);
            if (!asset) { return; }

            const material = this.editor.scene!.getMaterialByID(asset.key);
            if (!material) { return; }

            this.selectedObject!.material = material;
        });
    }
}
