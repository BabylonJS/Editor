import {
    Engine, Scene, ArcRotateCamera, PointLight, Vector3, Node,
    Observer, Tags,
    SceneSerializer, SceneLoader, FilesInput
} from 'babylonjs';

import Editor, {
    EditorPlugin, Tools,
    Grid, GridRow, Layout,
    Prefab, PrefabNodeType,
} from 'babylonjs-editor';

export interface PrefabRow extends GridRow {
    name: string;
}

export default class PrefabEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
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
        // UI
        this.nodesGrid.element.destroy();
        this.layout.element.destroy();

        this.scene.dispose();
        this.engine.dispose();

        // Events
        this.editor.core.onResize.remove(this.onResize);
        this.editor.core.onSelectObject.remove(this.onResize);
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
            { type: 'left', resizable: true, size: '50%', content: '<div id="PREFAB-EDITOR-GRID" style="width: 100%; height: 100%;"></div>' },
            { type: 'main', resizable: true, size: '50%', content: '<canvas id="PREFAB-EDITOR-PREVIEW" style="width: 100%; height: 100%;"></canvas>' }
        ];
        this.layout.build(this.divElement.id);

        // Grid
        this.nodesGrid = new Grid<PrefabRow>('PREFAB-EDITOR-GRID', {
            toolbarEdit: false
        });
        this.nodesGrid.columns = [{ field: 'name', caption: 'Name', size: '90%' }];
        this.nodesGrid.build('PREFAB-EDITOR-GRID');

        // Scene
        this.engine = new Engine(<HTMLCanvasElement> $('#PREFAB-EDITOR-PREVIEW')[0]);
        this._createBaseSceneElements();
        this.engine.runRenderLoop(() => this.scene.render());

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
        if (!Tags.HasTags(node) || !Tags.MatchesQuery(node, 'prefab-master'))
            return;
        
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
        this._createNewScene(node['sourceMesh'] || node);
    }

    /**
     * Once the user selects an asset in the assets panel of the editor
     * @param asset the selected asset
     */
    protected async assetSelected (prefab: Prefab): Promise<void> {
        if (!prefab.isPrefab)
            return;

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
        this._createNewScene(<Node> prefab.sourceNode);
    }

    // Creates a new scene with the selected node prefab
    private async _createNewScene (node: Node): Promise<void> {
        // Create new scene
        this._createBaseSceneElements();

        // Check availability
        if (!(node instanceof Node))
            return this.layout.lockPanel('main', 'Cannot create preview');

        // Load scene with prefabs
        const serializedObject = SceneSerializer.SerializeMesh(node, false, true);
        const file = Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(serializedObject)), 'prefab.babylon');

        FilesInput.FilesToLoad[file.name.toLowerCase()]= file;
        await SceneLoader.ImportMeshAsync(null, 'file:' ,'prefab.babylon', this.scene);
        delete FilesInput.FilesToLoad[file.name.toLowerCase()];

        if (this.scene.lights.length === 0)
            this.pointLight = new PointLight('PrefabEditorLight', new Vector3(15, 15, 15), this.scene);

        // Place master prefab
        const master = this.scene.getNodeByID(node.id);
        master['position'] = Vector3.Zero();
    }

    // Creates the base scene elements (camera)
    private _createBaseSceneElements (): void {
        if (this.scene)
            this.scene.dispose();
        
        this.scene = new Scene(this.engine);
        this.scene.clearColor.set(0, 0, 0, 1);

        this.camera = new ArcRotateCamera('PrefabEditorCamera', Math.PI / 2, Math.PI / 2, 15, Vector3.Zero(), this.scene);
        this.camera.attachControl(this.engine.getRenderingCanvas(), false, false);
    }
}
