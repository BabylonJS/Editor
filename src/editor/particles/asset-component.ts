import { Scene, Tools } from 'babylonjs';
import { IAssetComponent, AssetElement, AssetContextMenu } from '../../extensions/typings/asset';

import Editor from '../editor';

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
