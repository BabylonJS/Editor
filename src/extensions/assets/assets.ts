import { Node, Scene, Mesh } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import { AssetElement } from '../typings/asset';
import { IStringDictionary } from '../typings/typings';

/**
 * Assets type used as alias
 */
export interface ProjectAssets {
    prefabs: AssetElement<any>[];
}

export default class AssetsExtension extends Extension<ProjectAssets> {
    // Public members
    public prefabs: AssetElement<any>[] = [];

    /**
     * Constructor
     * @param scene the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
    }

    /**
     * On apply the extension
     */
    public onApply (data: ProjectAssets): void {
        // Prefabs
        data.prefabs.forEach(p => this.prefabs.push(p));
    }

    /**
     * Instantiate a prefab identified by the given name
     * @param name the name of the prefab to instantiate
     */
    public instantiatePrefab<T extends Node> (name: string): T {
        for (const p of this.prefabs) {
            if (p.name !== name)
                continue;

            // Create prefab
            const source = this.scene.getNodeByID(p.data.nodeIds[0]);
            if (!source)
                return null;

            const master = this._createInstance(source);
            if (!master)
                return null;

            const descendants = source.getDescendants();
            const parentingDict: IStringDictionary<Node> = {
                [source.id]: master
            };

            descendants.forEach(d => {
                const child = this._createInstance(d);
                if (!child)
                    return;
                
                child.parent = parentingDict[d.parent.id];

                parentingDict[d.id] = child;
            });

            return <T> master;
        }

        return null;
    }

    // Creates a new instance of the given node (InstancedMesh or just clone)
    private _createInstance (node: any): Node {
        if (node instanceof Mesh)
            return node.createInstance(node.name + 'Inst');

        if (node.clone) {
            return node.clone(node.name + 'Inst', null);
        }

        return null;
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): ProjectAssets {
        return null;
    }

    /**
     * On load the extension (called by the editor when
     * loading a scene)
     */
    public onLoad (data: ProjectAssets): void
    { }
}

// Register
Extensions.Register('AssetsExtension', AssetsExtension);
