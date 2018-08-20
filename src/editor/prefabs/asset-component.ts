import { Mesh, AbstractMesh, PickingInfo, Tags } from 'babylonjs';

import Editor from '../editor';
import { IAssetComponent, AssetElement } from '../../shared/asset';

import { Prefab } from './prefab';

export default class PrefabAssetComponent implements IAssetComponent {
    // Public members
    public id: string = 'prefabs';
    public assetsCaption: string = 'Prefabs';

    public datas: AssetElement<Prefab>[] = [];

    /**
     * Constructor
     * @param editor the editor reference
     */
    constructor (public editor: Editor)
    { }

    /**
     * Creates a new prefab
     * @param sourceMesh the source mesh for the new prefab asset. Can be a single mesh or a root mesh
     */
    public createPrefab (sourceMesh: Mesh): AssetElement<Prefab> {
        // TODO: manage root mesh
        const asset = <AssetElement<Prefab>> {
            name: 'New Prefab ' + sourceMesh.name,
            data: {
                node: sourceMesh.name,
                nodeId: sourceMesh.id,
                instances: [],
                sourceMesh: sourceMesh,
                sourceInstances: []
            }
        };

        // Add asset
        this.onAddAsset(asset);
        this.editor.assets.refresh(this.id);

        return asset;
    }

    /**
     * On the user adds a new prefab asset
     * @param asset the asset to add in the collection
     */
    public onAddAsset (asset: AssetElement<Prefab>): void {
        this.datas.push(asset);
    }

    /**
     * On the user drops an asset in the scene
     * @param targetMesh the mesh under the pointer
     * @param asset the asset being dropped
     * @param pickInfo the pick info once the user dropped the asset
     */
    public onDragAndDropAsset? (targetMesh: AbstractMesh, asset: AssetElement<Prefab>, pickInfo: PickingInfo): void {
        const instance = asset.data.sourceMesh.createInstance(asset.name);
        instance.position.copyFrom(pickInfo.pickedPoint);

        // Register instance
        Tags.AddTagsTo(instance, 'prefab');
        asset.data.sourceInstances.push(instance);
    }

    /**
     * On the user saves the editor project
     */
    public onSerializeAssets (): AssetElement<Prefab>[] {
        return this.datas.map(d => {
            const instances: any[] = [];
            d.data.sourceInstances.forEach(i => Tags.MatchesQuery(i, 'prefab') && instances.push(i));

            return {
                name: d.name,
                data: {
                    node: d.data.node,
                    nodeId: d.data.nodeId,
                    instances: instances.map(si => si.serialize())
                }
            }
        });
    }
    
    /**
     * On the user loads the editor project
     * @param data the previously saved data
     */
    public onParseAssets (data: AssetElement<Prefab>[]): void {
        this.datas = data;
    }

    /**
     * On the assets panel requires the assets stored in this
     * asset component
     */
    public onGetAssets (): AssetElement<Prefab>[] {
        return this.datas;
    }
}
