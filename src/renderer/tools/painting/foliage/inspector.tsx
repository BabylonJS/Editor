import * as React from "react";
import { GUI } from "dat.gui";

import Zip from "adm-zip";

import { Nullable } from "../../../../shared/types";

import { Mesh, PickingInfo } from "babylonjs";

import { PrefabAssets } from "../../../editor/assets/prefabs";
import { FoliagePainter } from "../../../editor/painting/foliage/foliage";

import { PaintingInspector } from "../painting-inspector";
import { Spinner } from "@blueprintjs/core";
import { IAssetComponentItem } from "../../../editor/assets/abstract-assets";

export class FoliagePainterInspector extends PaintingInspector<FoliagePainter> {
    private _prefabIds: string[] = ["None"];
    private _prefabsFolder: Nullable<GUI> = null;

    /**
     * Called on the component did mount.
     * @override
     */
    public onUpdate(): void {
        this.selectedObject = new FoliagePainter(this.editor);

        this.addOptions();
        this.addPrefabs();
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

        options.add(this.selectedObject, "radius").min(0).step(0.01).name("Radius");
    }

    /**
     * Adds the meshes editable properties.
     */
    protected addPrefabs(): void {
        this._prefabsFolder = this._prefabsFolder ?? this.tool!.addFolder("Meshes");
        this._prefabsFolder.open();

        // Reset
        this._prefabsFolder.addButton("Reset").onClick(() => {
            this._prefabIds = ["None"];
            this.selectedObject.reset();
            
            this.clearFolder(this._prefabsFolder!);
            this.addPrefabs();
        });

        // Prefabs list
        const assets = this.editor.assets.getAssetsOf(PrefabAssets)!;
        if (!assets) { return; }

        const prefabs = ["None"].concat(assets.map((a) => a.id));

        this._prefabIds.forEach((pid, index) => {
            const propertyName = `Prefab n°${index}`
            const o = { [propertyName]: pid };

            return this._prefabsFolder!.addSuggest(o, propertyName, prefabs, {
                onShowIcon: (i) => {
                    const asset = assets.find((a) => a.id === i);
                    if (!asset) { return undefined; }

                    return <img src={asset.base64} style={{ width: 20, height: 20 }}></img>;
                },
                onShowTooltip: (i) => {
                    const asset = assets.find((a) => a.id === i);
                    if (!asset) { return undefined; }

                    return <img src={asset.base64} style={{ maxWidth: "100%", width: 100, maxHeight: "100%", height: 100 }}></img>;
                },
            }).onChange(async () => {
                this._clearAssetAt(index);

                const a = assets?.find((a) => a.id === o[propertyName]);
                if (!a) { return; }

                const spinner = this._prefabsFolder!.addCustom("35px", <Spinner size={35} />);
                await this._addPrefabToList(a, index);
                this._prefabsFolder!.remove(spinner as any);
            });
        });

        // Add button
        this._prefabsFolder.addButton("Add...").onClick(() => {
            this._prefabIds.push("None");

            this.clearFolder(this._prefabsFolder!);
            this.addPrefabs();
        });
    }

    /**
     * Clears the current asset at the given index.
     */
    private _clearAssetAt(index: number): void {
        if (this.selectedObject.meshes[index]) {
            const existing = this.selectedObject.meshes[index];
            if (existing?.metadata?.waitingFoliage) { existing.dispose(); }
        }

        this.selectedObject.meshes[index] = null;
    }

    /**
     * Adds the given asset to the foliage meshes list.
     */
    private async _addPrefabToList(asset: IAssetComponentItem, index: number): Promise<void> {
        const zip = new Zip(asset.key);

        const configEntry = zip.getEntries().find((e) => e.entryName === "config.json");
        if (!configEntry) { return; }
        
        const configStr = await new Promise<string>((resolve) => {
            zip.readAsTextAsync(configEntry, (d) => resolve(d), "utf-8");
        });
        const prefabConfig = JSON.parse(configStr);

        let existingMesh = prefabConfig.sourceMeshId ? this.editor.scene!.getMeshByID(prefabConfig.sourceMeshId) : null;
        if (!existingMesh) {
            const assets = this.editor.assets.getComponent(PrefabAssets)!;
            if (!assets) { return; }

            const result = await assets.onDropAsset(asset, new PickingInfo());
            if (!result) { return; }

            existingMesh = result.meshes[0];
            if (!existingMesh) { return; }

            existingMesh.metadata = existingMesh.metadata ?? { };
            existingMesh.metadata.waitingFoliage = true;
            existingMesh.doNotSerialize = true;

            this.editor.scene!.removeMesh(existingMesh);
            
            result.meshes.forEach((m) => m !== existingMesh && m.dispose());
            result.animationGroups.forEach((ag) => ag.dispose());
            result.particleSystems.forEach((ps) => ps.dispose());
            result.skeletons.forEach((s) => s !== existingMesh!.skeleton && s.dispose());
        }

        // Check if mesh finally exists.
        if (!existingMesh) { return; }

        if (index > this.selectedObject.meshes.length) {
            this.selectedObject.meshes.push(existingMesh as Mesh);
            this._prefabIds.push(asset.id);
        } else {
            this.selectedObject.meshes[index] = existingMesh as Mesh;
            this._prefabIds[index] = asset.id;
        }

        this.editor.graph.refresh();
    }
}
