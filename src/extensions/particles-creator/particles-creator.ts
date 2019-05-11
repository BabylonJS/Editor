import { Scene, Tools } from 'babylonjs';

import Extensions from '../extensions';
import Extension from '../extension';

import { IAssetComponent, AssetElement } from '../typings/asset';

export interface ParticlesCreatorMetadata {
    name: string;
    psData: any;
}

export default class ParticlesCreatorExtension extends Extension<ParticlesCreatorMetadata[]> implements IAssetComponent {
    // Public members
    public id: string = 'particles-systems-editor';
    public assetsCaption: string = 'Particle Systems';

    /**
     * Constructor
     * @param scene: the babylonjs scene
     */
    constructor (scene: Scene) {
        super(scene);
        this.datas = [];
    }

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
        const metadata = this.scene.metadata.particleSystems;
        const index = metadata.indexOf(asset.data);
        if (index !== -1) {
            metadata.splice(index, 1);
        }
    }

    /**
     * On the user adds an asset
     * @param asset the asset to add
     */
    public onAddAsset (asset: AssetElement<any>): void {
        this.scene.metadata.particleSystems.push(asset.data);
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

        this.scene.metadata = this.scene.metadata || { };
        this.scene.metadata.particleSystems = this.scene.metadata.particleSystems || [];
        this.scene.metadata.particleSystems.push(asset.data);

        return asset;
    }

    /**
     * On get all the assets to be drawn in the assets component
     */
    public onGetAssets (): AssetElement<any>[] {
        return this.scene.metadata.particleSystems.map(ps => ({
            name: ps.name,
            data: ps
        }));
    }

    /**
     * On apply the extension
     */
    public onApply (data: ParticlesCreatorMetadata[]): void {
        this.datas = data;
    }

    /**
     * Called by the editor when serializing the scene
     */
    public onSerialize (): ParticlesCreatorMetadata[] {
        const datas: ParticlesCreatorMetadata[] = [];
        this.scene.metadata.particleSystems.forEach(ps => datas.push({
            name: ps.name,
            psData: ps.psData
        }));
        return datas;
    }

    /**
     * On load the extension (called by the editor when loading a scene)
     * @param data the data being loaded
     */
    public onLoad (data: ParticlesCreatorMetadata[]): void {
        this.datas = data;

        this.scene.metadata = this.scene.metadata || { };
        this.scene.metadata.particleSystems = data;
    }
}

// Register
Extensions.Register('ParticlesCreatorExtension', ParticlesCreatorExtension);
