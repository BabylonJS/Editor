import {
    Engine, Scene, ArcRotateCamera, PointLight, Vector3, Node,
    Observer, Tags,
    SceneSerializer, SceneLoader, FilesInput, InstancedMesh,
    ParticleSystem
} from 'babylonjs';

import Editor, {
    EditorPlugin, Tools,
    Grid, GridRow, Layout, Toolbar,
    Prefab, PrefabNodeType,
} from 'babylonjs-editor';

export interface PrefabRow extends GridRow {
    name: string;
}

export default class PrefabEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public nodesGrid: Grid<PrefabRow> = null;

    public engine: Engine = null;
    public scene: Scene = null;
    public camera: ArcRotateCamera = null;
    public pointLight: PointLight = null;

    // Protected members
    protected selectedAsset: Prefab = null;
    protected selectedPrefab: Node = null;

    protected onResize: Observer<any> = null;
    protected onObjectSelected: Observer<any> = null;
    protected onAssetSelected: Observer<any> = null;

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Prefab Editor');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        // Engine
        this.scene.dispose();
        this.engine.dispose();

        // UI
        this.toolbar.element.destroy();
        this.nodesGrid.element.destroy();
        this.layout.element.destroy();

        // Events
        this.editor.core.onResize.remove(this.onResize);
        this.editor.core.onSelectObject.remove(this.onObjectSelected);
        this.editor.core.onSelectAsset.remove(this.onAssetSelected);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Layout
        this.layout = new Layout(this.divElement.id);
        this.layout.panels = [
            { type: 'top', resizable: false, size: 30, content: '<div id="PREFAB-EDITOR-TOOLBAR" style="width: 100%; height: 100%;"></div>' },
            { type: 'left', resizable: true, size: '50%', content: '<div id="PREFAB-EDITOR-GRID" style="width: 100%; height: 100%;"></div>' },
            { type: 'main', resizable: true, size: '50%', content: '<canvas id="PREFAB-EDITOR-PREVIEW" style="width: 100%; height: 100%;"></canvas>' }
        ];
        this.layout.build(this.divElement.id);

        // Toolbar
        this.toolbar = new Toolbar('PREFAB-EDITOR-TOOLBAR');
        this.toolbar.build('PREFAB-EDITOR-TOOLBAR');
        this.toolbar.notifyMessage('<h2>No prefab selected</h2>');
        this.toolbar.notifyMessage('No prefab selected');

        // Grid
        this.nodesGrid = new Grid<PrefabRow>('PREFAB-EDITOR-GRID', {
            toolbarEdit: false,
            toolbarAdd: false
        });
        this.nodesGrid.columns = [{ field: 'name', caption: 'Name', size: '90%' }];
        this.nodesGrid.onDelete = ids => this.deleteInstances(ids);
        this.nodesGrid.build('PREFAB-EDITOR-GRID');

        // Scene
        this._createBaseSceneElements();

        // Events
        this.onResize = this.editor.core.onResize.add(() => this.resize());
        this.onObjectSelected = this.editor.core.onSelectObject.add(node => this.objectSelected(node));
        this.onAssetSelected = this.editor.core.onSelectAsset.add(asset => this.assetSelected(asset));
    }

    /**
     * On resize the component
     */
    public resize (): void {
        this.layout.element.resize();
        this.engine.resize();
    }

    /**
     * Once the user selects an object in the scene
     * @param node the selected node
     */
    protected objectSelected (node: Node): void {
        if (!Tags.HasTags(node) || !Tags.MatchesQuery(node, 'prefab-master')) {
            this.selectedPrefab = null;
            this.selectedAsset = null;
            this.toolbar.notifyMessage('<h2>No prefab selected</h2>');
            this._createNewScene(null);
            return;
        }
        
        const descendants = [node].concat(node.getDescendants());

        // Misc.
        this.selectedPrefab = node;
        this.selectedAsset = null;

        // Update grid
        this.nodesGrid.element.clear();
        descendants.forEach((d, index) => this.nodesGrid.addRecord({
            name: d.name,
            recid: index
        }));
        this.nodesGrid.element.refresh();

        // Create new scene
        this._createNewScene(node['sourceMesh'] || node, <InstancedMesh> node);

        // Notify
        this.toolbar.notifyMessage(`Selected object: <h2>${node.name}</h2>`);
    }

    /**
     * Once the user selects an asset in the assets panel of the editor
     * @param asset the selected asset
     */
    protected async assetSelected (prefab: Prefab): Promise<void> {
        if (!prefab || !prefab.isPrefab) {
            this.selectedPrefab = null;
            this.selectedAsset = null;
            this.toolbar.notifyMessage('<h2>No prefab selected</h2>');
            this._createNewScene(null);
            return;
        }

        // Misc.
        this.selectedPrefab = null;
        this.selectedAsset = prefab;

        // Update grid
        this.nodesGrid.element.clear();
        prefab.nodes.forEach((n, index) => this.nodesGrid.addRecord({
            name: n,
            recid: index
        }));
        this.nodesGrid.element.refresh();

        // Create new scene
        this._createNewScene(<Node> prefab.sourceNode, null);

        // Notify
        const asset = this.editor.assets.prefabs.datas.find(d => d.data === prefab);
        this.toolbar.notifyMessage(`Selected asset: <h2>${asset.name}</h2>`);
    }

    /**
     * On the user deletes nodes from the prefab
     * @param ids the ids of the items to delete
     */
    protected deleteInstances (ids: number[]): void {
        // The user selected an object in scene?
        // So remove nodes only from the selected prefab in the scene
        if (this.selectedPrefab) {
            const descendants = [this.selectedPrefab].concat(this.selectedPrefab.getDescendants());
            const asset = this.editor.assets.prefabs.getAssetFromNode(<PrefabNodeType> this.selectedPrefab);

            // Remove each selected prefab instance
            for (let descendantIndex = 0; descendantIndex < ids.length; descendantIndex++) {
                // Get instance
                const inst = descendants[ids[descendantIndex]];
                const prefabSource = inst['sourceMesh'] || inst;

                // Removed source instance?
                if (prefabSource === asset.data.sourceNode) {
                    // Remove all
                    for (const si in asset.data.sourceInstances) {
                        const instances = asset.data.sourceInstances[si];

                        for (let instanceIndex = 0; instanceIndex < instances.length; instanceIndex++) {
                            const i = instances[instanceIndex];
                            if ((<InstancedMesh> i).parent === inst || (<ParticleSystem> i).emitter === i) {
                                i.dispose();
                                instances.splice(instanceIndex, 1);
                                instanceIndex--;
                            }
                        }
                    }

                    // Dispose instance
                    inst.dispose();
                    const sourceInstances = asset.data.sourceInstances[prefabSource.id] || asset.data.sourceInstances[prefabSource.name];
                    const index = sourceInstances.indexOf(<PrefabNodeType> inst);
                    sourceInstances.splice(index, 1);

                    this.nodesGrid.element.clear();
                    break;
                }

                // Dispose instance
                inst.dispose();

                // Remove from source instances
                const sourceInstances = asset.data.sourceInstances[prefabSource.id] || asset.data.sourceInstances[prefabSource.name];
                const index = sourceInstances.indexOf(<PrefabNodeType> inst);
                if (index !== -1)
                    sourceInstances.splice(index, 1);

                // Remove from preview
                const previewNode = this.scene.getNodeByID(inst.id) || this.scene.getNodeByName(inst.name) || this.scene.getParticleSystemByID(inst.id);
                if (previewNode)
                    previewNode.dispose();
            }

            // Remove node from graph?
            if (this.nodesGrid.element.records.length === 0) {
                this._createNewScene(null);
                this.editor.graph.tree.remove(this.selectedPrefab.id);
                this.selectedPrefab = null;
            }
            else {
                this.objectSelected(this.selectedPrefab);
            }
        }
        // The user selected an asset?
        // So remove all nodes from scene instances of the node in the asset
        else {
            for (let instanceIndex = 0, offset = 0; instanceIndex < ids.length; instanceIndex++) {
                const index = ids[instanceIndex - offset];
                const source = this.selectedAsset.sourceNodes[index];

                if (source === this.selectedAsset.sourceNode) {
                    // Remove all
                    this.selectedAsset.sourceNodes = [];
                    this.selectedAsset.nodes = [];
                    this.selectedAsset.nodeIds = [];
                    break;
                }

                // Remove references from scene and asset
                const sourceInstances = this.selectedAsset.sourceInstances[source.id] || this.selectedAsset.sourceInstances[source.name];
                sourceInstances.forEach(si => {
                    si.dispose();
                    const graphNode = this.editor.graph.getByData(si);
                    if (graphNode)
                        this.editor.graph.tree.remove(graphNode.id);
                });
                sourceInstances.splice(0, sourceInstances.length);

                this.selectedAsset.sourceNodes.splice(index, 1);
                this.selectedAsset.nodes.splice(index, 1);
                this.selectedAsset.nodeIds.splice(index, 1);

                // Remove from preview
                const previewNode = this.scene.getNodeByID(source.id) || this.scene.getNodeByName(source.name) || this.scene.getParticleSystemByID(source.id);
                if (previewNode)
                    previewNode.dispose();
                
                // Offset in ids
                offset--;
            }

            // Remove node from graph and asset?
            if (this.selectedAsset.sourceNodes.length === 0) {
                const asset = this.editor.assets.prefabs.getAssetFromNode(<PrefabNodeType> this.selectedAsset.sourceNode);
                this.editor.assets.prefabs.onRemoveAsset(asset);
                this._createNewScene(null);
            }
            else {
                this.assetSelected(this.selectedAsset);
            }
        }
    }

    // Creates a new scene with the selected node prefab
    private async _createNewScene (node: Node, instance?: InstancedMesh): Promise<void> {
        // Create new scene
        this._createBaseSceneElements();

        // Check availability
        if (!(node instanceof Node)) {
            return this.layout.lockPanel('main', 'Cannot create preview');
        }

        this.layout.unlockPanel('main');

        // Get meshes names
        const meshesNames = instance ? [<Node> instance].concat(instance.getDescendants()).map(d => (<InstancedMesh> d).sourceMesh.name):
                                       [node].concat(node.getDescendants()).map(d => d.name);

        // Load scene with prefabs
        const serializedObject = SceneSerializer.SerializeMesh(node, false, true);
        const file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedObject)), 'prefab.babylon');

        FilesInput.FilesToLoad[file.name.toLowerCase()]= file;
        await SceneLoader.ImportMeshAsync(null, 'file:' ,'prefab.babylon', this.scene);
        delete FilesInput.FilesToLoad[file.name.toLowerCase()];

        // Clear unused meshes
        for (let i = 0; i < this.scene.meshes.length; i++) {
            const m = this.scene.meshes[i];

            if (meshesNames.indexOf(m.name) === -1) {
                m.dispose();
                i--;
            }
        }

        if (this.scene.lights.length === 0)
            this.pointLight = new PointLight('PrefabEditorLight', new Vector3(15, 15, 15), this.scene);

        // Place master prefab
        const master = this.scene.getNodeByID(node.id);
        master['position'] = Vector3.Zero();
    }

    // Creates the base scene elements (camera)
    private _createBaseSceneElements (): void {
        if (this.engine)
            this.engine.dispose();

        if (this.scene)
            this.scene.dispose();
        
        this.engine = new Engine(<HTMLCanvasElement> $('#PREFAB-EDITOR-PREVIEW')[0]);

        this.scene = new Scene(this.engine);
        this.scene.clearColor.set(0, 0, 0, 1);

        this.camera = new ArcRotateCamera('PrefabEditorCamera', Math.PI / 2, Math.PI / 2, 15, Vector3.Zero(), this.scene);
        this.scene.render();

        this.camera.attachControl(this.engine.getRenderingCanvas(), false, false);

        // Render loop
        this.engine.runRenderLoop(() => this.scene.render());
    }
}
