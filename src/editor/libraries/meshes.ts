import { AbstractMesh, PickingInfo, FilesInputStore, SceneLoader, Tags, Tools as BabylonTools } from 'babylonjs';

import { IAssetComponent, AssetElement, IAssetFile } from '../../extensions/typings/asset';

import Editor from '../editor';
import Tools from '../tools/tools';
import SceneFactory from '../scene/scene-factory';
import ProjectExporter from '../project/project-exporter';

export default class MeshesLibrary implements IAssetComponent {
    /**
     * The id of the component.
     */
    public id: string = 'meshes-library';
    /**
     * The caption to draw in the assets component.
     */
    public assetsCaption: string = 'Meshes';
    /**
     * The size of the asset elements in the component.
     */
    public size: number = 100;

    /**
     * The files list in formats .babylon, .gltf and .glb
     */
    public files: File[] = [];

    /**
     * Constructor.
     */
    constructor (public editor: Editor) {
        // Empty.
    }

    /**
     * On the assets panel requires the assets stored in this
     * asset component
     */
    public onGetAssets (): AssetElement<any>[] {
        return this.files.map(f => ({
            img: null,
            name: f.name,
            data: f
        }));
    }

    /**
     * Called on the user drag'n'drops files in the assets component.
     */
    public onDragAndDropFiles (files: FileList): void {
        const availableFormats = ['babylon', 'gltf', 'glb'];

        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            const ext = Tools.GetFileExtension(file.name);
            if (availableFormats.indexOf(ext.toLowerCase()) !== -1)
                this.files.push(files.item(i));
            else
                FilesInputStore.FilesToLoad[file.name.toLowerCase()] = file;
        }
    }

    /**
     * On the user removes a prefab from his library
     * @param asset the asset to remove
     */
    public onRemoveAsset (asset: AssetElement<File>): void {
        const index = this.files.indexOf(asset.data);
        if (index !== -1)
            this.files.splice(index, 1);
    }

    /**
     * On the user saves the editor project
     */
    public onSerializeAssets (): AssetElement<string>[] {
        return this.files.map(f => ({
            name: f.name,
            data: f.name
        }));
    }

    /**
     * On the user loads the editor project
     * @param data the previously saved data
     */
    public async onParseAssets (data: AssetElement<string>[]): Promise<void> {
        await Tools.ImportScript('babylonjs-loaders');

        for (const d of data) {
            const b = await Tools.LoadFile<ArrayBuffer>(`${ProjectExporter.ProjectPath}${this.id}/${d.data}`, true);
            if (!b.byteLength)
                continue;
            
            const f = Tools.CreateFile(new Uint8Array(b), d.data);
            this.files.push(f);
        }
    }

    /**
     * On the user drops an asset in the scene
     * @param targetMesh the mesh under the pointer
     * @param asset the asset being dropped
     * @param pickInfo the pick info once the user dropped the asset
     */
    public async onDragAndDropAsset (targetMesh: AbstractMesh, asset: AssetElement<File>, pickInfo: PickingInfo): Promise<void> {
        // Import meshes
        const result = await SceneLoader.ImportMeshAsync('', "file:", asset.data, this.editor.core.scene);

        result.meshes.forEach(m => {
            Tags.AddTagsTo(m, 'added');
            m.id = BabylonTools.RandomId();
            SceneFactory.AddToGraph(this.editor, m);

            if (m.material) {
                Tags.AddTagsTo(m.material, 'added');
                m.material.id = BabylonTools.RandomId();
            }
        });
        result.skeletons.forEach(s => {
            s.id = BabylonTools.RandomId();
            Tags.AddTagsTo(s, 'added');
        });
        result.particleSystems.forEach(ps => {
            Tags.AddTagsTo(ps, 'added');
            ps.id = BabylonTools.RandomId();
            SceneFactory.AddToGraph(this.editor, ps);
        });
    }

    /**
     * Called by the editor when serializing the project (used when saving project).
     */
    public onSerializeFiles (): IAssetFile[] {
        return this.files.map(f => ({ name: f.name, file: f }));
    }
}
