import { IStringDictionary } from "../../../shared/types";

import { Scene, Mesh } from "babylonjs";

export class SceneExportOptimzer {
    private _scene: Scene;

    private _decals: Mesh[] = [];
    private _mergedDecals: Mesh[] = [];

    /**
     * Constructor.
     * @param scene defines the scene for optimizer before export.
     */
    public constructor(scene: Scene) {
        this._scene = scene;
    }

    /**
     * Optomizes the whole scene.
     */
    public optimize(): void {
        this._optimizeDecals();
    }

    /**
     * Cleans all elements that have been optimized.
     */
    public clean(): void {
        // Decals
        this._decals.forEach((d) => d.doNotSerialize = false);
        this._mergedDecals.forEach((md) => md.dispose());

        this._decals = [];
        this._mergedDecals = [];
    }

    /**
     * Optimizes all the decals.
     */
    private _optimizeDecals(): void {
        this._scene.meshes.forEach((m) => {
            const children = m.getChildMeshes(true, (n) => n.metadata?.isDecal === true) as Mesh[];
            if (children.length < 2) { return; }

            // Collect
            const materials: IStringDictionary<Mesh[]> = { };
            children.forEach((c) => {
                const id = c.material?.id ?? "undefined";
                if (!materials[id]) { materials[id] = [] }

                c.doNotSerialize = true;

                materials[id].push(c);
                this._decals.push(c);
            });

            // Merge
            for (const m in materials) {
                const meshes = materials[m];
                const merged = Mesh.MergeMeshes(meshes, false, true, undefined, false, undefined);
                if (!merged) { continue; }

                merged.setParent(meshes[0].parent);
                merged.material = meshes[0].material;
                this._mergedDecals.push(merged);
            }
        });
    }
}
