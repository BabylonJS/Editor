import {
    Engine, AbstractMesh, PickingInfo, FilesInputStore,
    SceneLoader, Tags, Tools as BabylonTools, Mesh, MultiMaterial, Material, Texture
} from 'babylonjs';

import { IAssetComponent, AssetElement, IAssetFile } from '../../extensions/typings/asset';
import LibrariesHelpers from './helpers';

import Editor from '../editor';
import Tools from '../tools/tools';
import Dialog from '../gui/dialog';
import SceneFactory from '../scene/scene-factory';
import ProjectExporter from '../project/project-exporter';

interface ImportedMeshMetadata {
    sourceFile: string;
    originalName: string;
}

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
     * Called on the assets panel is being cleared.
     */
    public onClear (): void {
        this.datas = [];
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
    public async onDragAndDropFiles (files: FileList): Promise<void> {
        const availableFormats = ['babylon', 'gltf', 'glb', 'obj', 'stl'];

        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            const ext = Tools.GetFileExtension(file.name);
            if (availableFormats.indexOf(ext.toLowerCase()) !== -1) {
                // Search for existing meshes
                const existingMeshes = <Mesh[]> this.editor.core.scene.meshes.filter((m) => m.metadata && m.metadata.sourceFile && m.metadata.sourceFile.sourceFile === file.name);
                if (existingMeshes.length) {
                    const update = await Dialog.Create('Update existing?', 'File already imported. Do you want to update the existing geometry?');
                    if (update === 'Yes')
                        await this._updateGeometries(existingMeshes, file);
                }

                // Get existing file
                const existing = this.datas.find((d) => d.data.name === file.name);
                if (existing) {
                    const index = this.datas.indexOf(existing);
                    this.datas[index] = existing;
                    continue;
                }

                // Just add.
                this.datas.push({ name: file.name, data: file });
            }
            else {
                FilesInputStore.FilesToLoad[file.name.toLowerCase()] = file;
            }
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
        const ext = Tools.GetFileExtension(asset.data.name).toLowerCase();
        const result = await SceneLoader.ImportMeshAsync('', "file:", asset.data, this.editor.core.scene);

        result.meshes.forEach(m => {
            Tags.AddTagsTo(m, 'added');
            this._configureMesh(m);

            if (m.material) {
                Tags.AddTagsTo(m.material, 'added');
                m.material.id = BabylonTools.RandomId();
                ext === 'obj' && this._updateObjTextures(m.material);
            }
            
            if (m.material instanceof MultiMaterial) {
                m.material.subMaterials.forEach((sm) => {
                    Tags.AddTagsTo(sm, 'added');
                    sm.id = BabylonTools.RandomId();
                    ext === 'obj' && this._updateObjTextures(sm);
                });
            }

            if (!m.parent)
                m.position.copyFrom(pickInfo.pickedPoint.add(m.position));

            // Write mesh's metadatas
            m.metadata = m.metadata || { };
            m.metadata.sourceFile = <ImportedMeshMetadata> {
                sourceFile: asset.data.name,
                originalName: m.name
            };
        });

        result.skeletons.forEach(s => {
            let id = 0;
            while (this.editor.core.scene.getSkeletonById(<any> id)) {
                id++;
            }

            s.id = <any> id;
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

    // Returns the mesh's metadatas.
    private _getMeshMetadata (m: AbstractMesh): ImportedMeshMetadata {
        return m.metadata.sourceFile;
    }

    // Configures the mesh and adds to the scene's tree.
    private _configureMesh (m: AbstractMesh): void {
        m.id = BabylonTools.RandomId();
        this.editor.scenePicker.configureMesh(m);

        if (!m.parent)
            this.editor.graph.addNodeRecursively(this.editor.core.scene, m);
    }

    // Updates the textures generated by the MTL obj file.
    private _updateObjTextures (material: Material): void {
        for (const key in material) {
            const value = material[key];
            if (!(value instanceof Texture))
                continue;

            value.url = value.url.replace(/file:/g, '');
            value.name = value.name.replace(/file:/g, '');
        }
    }

    // Updates the geometries of the existing meshes.
    private async _updateGeometries (meshes: Mesh[], file: File): Promise<void> {
        const scene = await SceneLoader.LoadAsync('file:', file, this.editor.core.engine);

        scene.meshes.forEach((m) => {
            const base = meshes.find((em) => {
                const metadata = this._getMeshMetadata(em);
                return metadata.originalName === m.name;
            });

            if (!base) {
                this.editor.core.scene.addMesh(m, true);
                this._configureMesh(m);
            }

            if (!(m instanceof Mesh) || !(base instanceof Mesh))
                return;
            
            if (!m.geometry)
                return;

            if (base.geometry)
                base.geometry.dispose();
            
            m.geometry.applyToMesh(base);
        });

        scene.dispose();
    }
}
