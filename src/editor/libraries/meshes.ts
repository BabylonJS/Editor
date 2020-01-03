import {
    Engine, AbstractMesh, PickingInfo, FilesInputStore,
    SceneLoader, Tags, Tools as BabylonTools
} from 'babylonjs';

import { IAssetComponent, AssetElement, IAssetFile } from '../../extensions/typings/asset';
import LibrariesHelpers from './helpers';

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
    public datas: AssetElement<File>[] = [];

    private _previewCanvas: HTMLCanvasElement = null;
    private _previewEngine: Engine = null;

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
        // Create engine
        if (!this._previewCanvas) {
            this._previewCanvas = Tools.CreateElement<HTMLCanvasElement>('canvas', 'PrefabAssetComponentCanvas', {
                'width': '100px',
                'height': '100px',
                'visibility': 'hidden'
            });
            document.body.appendChild(this._previewCanvas);
        }

        if (!this._previewEngine)
            this._previewEngine = new Engine(this._previewCanvas);

        // Previews
        for (const d of this.datas) {
            setTimeout(() => this._createPreview(d), 0);
        }

        // Return assets
        return this.datas;
    }

    // Creates a preview data.
    private async _createPreview (asset: AssetElement<File>): Promise<void> {
        const adp = this.editor.assets.getAssetPreviewData(asset);
        if (adp) {
            adp.img.src = '';
            w2utils.lock(adp.parent, '', true);
        }

        const b64 = await LibrariesHelpers.CreateFilePreview(asset, this._previewEngine);
        asset.img = b64;

        if (adp) {
            adp.img.src = b64;
            w2utils.unlock(adp.parent);
        }
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
                this.datas.push({ name: file.name, data: file });
            else
                FilesInputStore.FilesToLoad[file.name.toLowerCase()] = file;
        }
    }

    /**
     * On the user removes a prefab from his library
     * @param asset the asset to remove
     */
    public onRemoveAsset (asset: AssetElement<File>): void {
        const index = this.datas.indexOf(asset);
        if (index !== -1)
            this.datas.splice(index, 1);
    }

    /**
     * On the user saves the editor project
     */
    public onSerializeAssets (): AssetElement<string>[] {
        return this.datas.map(d => ({
            name: d.name,
            data: d.name,
            img: d.img
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
            this.datas.push({ name: d.data, data: f, img: d.img });
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
            this.editor.scenePicker.configureMesh(m);

            if (m.material) {
                Tags.AddTagsTo(m.material, 'added');
                m.material.id = BabylonTools.RandomId();
            }

            if (!m.parent)
                m.position.copyFrom(pickInfo.pickedPoint.add(m.position));
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
        return this.datas.map(f => ({ name: f.name, file: f.data }));
    }
}
