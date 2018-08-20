import {
    Mesh, AbstractMesh, PickingInfo, Tags,
    Tools as BabylonTools, Vector3, Quaternion,
    InstancedMesh, Animation, Engine
} from 'babylonjs';

import Editor from '../editor';
import SceneFactory from '../scene/scene-factory';

import { IAssetComponent, AssetElement } from '../../shared/asset';
import { IStringDictionary } from '../typings/typings';
import Tools from '../tools/tools';

import { Prefab } from './prefab';
import PrefabsHelpers from './helpers';

export default class PrefabAssetComponent implements IAssetComponent {
    // Public members
    public id: string = 'prefabs';
    public assetsCaption: string = 'Prefabs';

    public datas: AssetElement<Prefab>[] = [];

    public previewCanvas: HTMLCanvasElement = null;
    public previewEngine: Engine = null;

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
        const descendants = <Mesh[]> sourceMesh.getDescendants(false, n => n instanceof Mesh);
        const sourceMeshes = descendants.length > 1 ? [sourceMesh].concat(descendants) : [sourceMesh];

        // Default asset
        const asset = <AssetElement<Prefab>> {
            name: 'Prefab ' + sourceMesh.name,
            data: {
                nodes: sourceMeshes.map(m => m.name),
                nodeIds: sourceMeshes.map(m => m.id),
                instances: { },
                sourceMeshes: sourceMeshes,
                sourceMesh: sourceMesh,
                sourceInstances: { }
            }
        };

        // Configure dictionaries
        sourceMeshes.forEach(m => {
            asset.data.instances[m.name] = [];
            asset.data.sourceInstances[m.name] = [];
        });

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
    public onDragAndDropAsset (targetMesh: AbstractMesh, asset: AssetElement<Prefab>, pickInfo: PickingInfo): void {
        // Parent
        const parent = asset.data.sourceMesh.createInstance(asset.name);
        parent.id = BabylonTools.RandomId();
        parent.position.copyFrom(pickInfo.pickedPoint);

        Tags.AddTagsTo(parent, 'prefab-master');
        asset.data.sourceInstances[asset.data.sourceMesh.name].push(parent);

        // Descendants
        if (asset.data.sourceMeshes.length > 1) {
            asset.data.sourceMeshes.forEach((m, index) => {
                // Skip parent
                if (index === 0)
                    return;
                
                const instance = m.createInstance(asset.name);
                instance.parent = parent;

                // Register instance
                Tags.AddTagsTo(instance, 'prefab');
                asset.data.sourceInstances[m.name].push(instance);
            });
        }

        SceneFactory.AddToGraph(this.editor, parent);
        Tags.RemoveTagsFrom(parent, 'added');

        // Select
        this.editor.scenePicker.setGizmoAttachedMesh(parent);
        this.editor.core.onSelectObject.notifyObservers(parent);
    }

    /**
     * On the user saves the editor project
     */
    public onSerializeAssets (): AssetElement<Prefab>[] {
        return this.datas.map(d => {
            const instances: IStringDictionary<any[]> = { };
            d.data.sourceMeshes.forEach(m => {
                instances[m.name] = [];
                m.instances.forEach(i => (Tags.MatchesQuery(i, 'prefab') || Tags.MatchesQuery(i, 'prefab-master')) && instances[m.name].push(i.serialize()));
            });

            return {
                name: d.name,
                data: {
                    nodes: d.data.sourceMeshes.map(m => m.name),
                    nodeIds: d.data.sourceMeshes.map(m => m.id),
                    instances: instances
                }
            };
        });
    }
    
    /**
     * On the user loads the editor project
     * @param data the previously saved data
     */
    public onParseAssets (data: AssetElement<Prefab>[]): void {
        const scene = this.editor.core.scene;

        this.datas = data;
        this.datas.forEach(d => {
            // Misc.
            d.data.sourceMeshes = [];
            d.data.sourceInstances = { };

            // Get source mesh
            const source = <Mesh> (scene.getMeshByID(d.data.nodeIds[0]) || scene.getMeshByName(d.data.nodes[0]));
            if (!source)
                return;

            d.data.sourceMesh = source;
            d.data.sourceMeshes.push(source);

            // Create master instance
            const parent = source.createInstance(d.data.instances[source.name][0].name);
            d.data.sourceInstances[source.name] = [parent];
            this._configureInstance(d.data.instances[source.name][0], parent);
            Tags.AddTagsTo(parent, 'prefab-master');

            // Recreate instances
            for (let i = 1; i < d.data.nodeIds.length; i++) {
                const mesh = <Mesh> (scene.getMeshByID(d.data.nodeIds[i]) || scene.getMeshByName(d.data.nodes[i]));
                if (!mesh)
                    return;

                d.data.sourceMeshes.push(mesh);
                d.data.sourceInstances[mesh.name] = [];

                d.data.instances[mesh.name].forEach(inst => {
                    const instance = mesh.createInstance(inst.name);
                    instance.parent = parent;
                    this._configureInstance(inst, instance);
                    Tags.AddTagsTo(instance, 'prefab');
                });
            }

            // Clean data
            d.data.instances = { };
        });
    }

    /**
     * On the assets panel requires the assets stored in this
     * asset component
     */
    public async onGetAssets (): Promise<AssetElement<Prefab>[]> {
        // Create engine
        if (!this.previewCanvas) {
            this.previewCanvas = Tools.CreateElement<HTMLCanvasElement>('canvas', 'PrefabAssetComponentCanvas', {
                'width': '50px',
                'height': '50px',
                'visibility': 'hidden'
            });
            document.body.appendChild(this.previewCanvas);
        }

        if (!this.previewEngine)
            this.previewEngine = new Engine(this.previewCanvas);
        
        // Create previews
        for (const d of this.datas) {
            await PrefabsHelpers.CreatePreview(d, this.previewEngine);
        }

        // Dispose
        if (this.previewEngine) {
            this.previewEngine.dispose();
            this.previewEngine = null;
        }

        if (this.previewCanvas) {
            this.previewCanvas.remove();
            this.previewCanvas = null;
        }

        return this.datas;
    }

    // Configures the given instance
    private _configureInstance (data: any, instance: InstancedMesh): void {
        instance.id = BabylonTools.RandomId();
        instance.position = Vector3.FromArray(data.position || data._position);
        instance.scaling = Vector3.FromArray(data.scaling || data._scaling);
        instance.checkCollisions = instance.sourceMesh.checkCollisions;

        if (data.rotationQuaternion || data._rotationQuaternion) {
            instance.rotationQuaternion = Quaternion.FromArray(data.rotationQuaternion || data._rotationQuaternion);
        } else if (data.rotation || data._rotation) {
            instance.rotation = Vector3.FromArray(data.rotation || data._rotation);
        }

        if (data.animations) {
            for (let i = 0; i < data.animations.length; i++) {
                const parsedAnimation = data.animations[i];
                instance.animations.push(Animation.Parse(parsedAnimation));
            }
        }
    }
}
