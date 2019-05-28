import { Tools, AbstractMesh, PickingInfo, Mesh, ParticleSystem, Tags } from 'babylonjs';
import { IAssetComponent, AssetElement } from '../../extensions/typings/asset';

import Editor from '../editor';
import SceneFactory from '../scene/scene-factory';

export interface ParticlesCreatorMetadata {
    name: string;
    psData: any;
}

export default class ParticlesAssetComponent implements IAssetComponent {
    // Public members
    public id: string = 'particles';
    public assetsCaption: string = 'Particles';

    public datas: AssetElement<ParticlesCreatorMetadata>[] = [];

    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (public editor: Editor)
    { }

    /**
     * On the user renames the asset
     * @param asset the asset being renamed
     * @param name the new name of the asset
     */
    public onRenameAsset (asset: AssetElement<ParticlesCreatorMetadata>, name: string): void {
        asset.data.name = name;
    }

    /**
     * On the user wants to remove the asset
     * @param asset the asset to remove
     */
    public onRemoveAsset (asset: AssetElement<any>): void {
        // Remove from library
        const index = this.datas.indexOf(asset);
        if (index !== -1)
            this.datas.splice(index, 1);

        // Update assets
        this.editor.assets.refresh(this.id);
    }

    /**
     * On the user adds an asset
     * @param asset the asset to add
     */
    public onAddAsset (asset: AssetElement<any>): void {
        this.datas.push(asset);
    }

    /**
     * Creates a new particle systems set asset
     */
    public async onCreateAsset (name: string): Promise<AssetElement<any>> {
        const set = await new Promise<string>((resolve) => {
            Tools.LoadFile('./assets/templates/particles-creator/default-set.json', (data) => resolve(<string> data));
        });

        const asset = {
            name: name,
            data: <ParticlesCreatorMetadata> {
                name: name,
                psData: JSON.parse(set)
            }
        };
        this.datas.push(asset);

        return asset;
    }

    /**
     * On get all the assets to be drawn in the assets component
     */
    public onGetAssets (): AssetElement<any>[] {
        return this.datas;
    }

    /**
     * On the user double clicks on asset
     * @param asset the asset being double-clicked by the user
     */
    public onDoubleClickAsset (asset: AssetElement<any>): void {
        this.editor.addEditPanelPlugin('particles-creator', false, 'Particles System Creator...', asset.data);
    }

    /**
     * On the user drops an asset in the scene
     * @param targetMesh the mesh under the pointer
     * @param asset the asset being dropped
     * @param pickInfo the pick info once the user dropped the asset
     */
    public onDragAndDropAsset (targetMesh: AbstractMesh, asset: AssetElement<ParticlesCreatorMetadata>, pickInfo: PickingInfo): void {
        const m = new Mesh(asset.name, this.editor.core.scene);
        m.position = pickInfo.pickedPoint.clone();
        SceneFactory.AddToGraph(this.editor, m);

        asset.data.psData.systems.forEach(s => {
            const rootUrl = s.textureName ? (s.textureName.indexOf('data:') === 0 ? '' : 'file:') : '';
            const ps = ParticleSystem.Parse(s, this.editor.core.scene, rootUrl, true);
            ps.id = Tools.RandomId();
            ps.emitter = m;
            ps.preventAutoStart = false;
            ps.start();

            Tags.AddTagsTo(ps, 'added');
            this.editor.graph.add({
                id: ps.id,
                data: ps,
                img: 'icon-particles',
                text: ps.name
            }, m.id);
        });
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerializeAssets (): AssetElement<ParticlesCreatorMetadata>[] {
        return this.datas.map(d => ({
            name: d.name,
            data: d.data
        }));
    }

    /**
     * On the user loads the editor project
     * @param data the previously saved data
     */
    public onParseAssets (data: AssetElement<ParticlesCreatorMetadata>[]): void {
        this.datas = data;
    }
}
