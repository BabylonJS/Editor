import * as React from "react";

import { SubMesh, MultiMaterial } from "babylonjs";

import { MaterialAssets } from "../assets/materials";

import { Inspector } from "../components/inspector";
import { AbstractInspector } from "./abstract-inspector";

export class SubMeshInspector extends AbstractInspector<SubMesh> {
    private _materialName: string = "";

    /**
     * Called on the component did moubnt.
     * @override
     */
    public onUpdate(): void {
        this.addMaterial();
    }

    /**
     * Adds the common editable properties.
     */
    protected addMaterial(): void {
        const folder = this.tool!.addFolder("Material");
        folder.open();

        const mesh = this.selectedObject.getMesh();
        if (!mesh.material || !(mesh.material instanceof MultiMaterial)) {
            folder.addTextBox("Please add a multi material to the root mesh before.");
            return;
        }

        // Add suggest material
        const assets = this.editor.assets.getAssetsOf(MaterialAssets);

        this._materialName = this.selectedObject.getMaterial()?.name ?? "None";
        folder.addSuggest(this, "_materialName", ["None"].concat(assets!.map((a) => a.id)), {
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
        }).name("Material").onChange(() => {
            if (this._materialName === "None") {
                (mesh.material as MultiMaterial).subMaterials[this.selectedObject.materialIndex] = null;
                return;
            }

            const asset = assets?.find((a) => a.id === this._materialName);
            if (!asset) { return; }

            const material = this.editor.scene!.getMaterialByID(asset.key);
            if (!material) { return; }

            (mesh.material as MultiMaterial).subMaterials[this.selectedObject.materialIndex] = material;
        });
    }
}

Inspector.registerObjectInspector({
    ctor: SubMeshInspector,
    ctorNames: ["SubMesh"],
    title: "SubMesh",
});
