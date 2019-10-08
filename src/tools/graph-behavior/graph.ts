import {
    Observer, SerializationHelper,
    Scene, Node,
    Tools as BabylonTools
} from 'babylonjs';

import { LGraph, LGraphCanvas, LiteGraph, LGraphGroup } from 'litegraph.js';

import Editor, {
    Layout, Toolbar, Grid, GridRow,
    Dialog, EditorPlugin, Tools,
    Picker, ProjectRoot,
    ContextMenu
} from 'babylonjs-editor';

import GraphTool from './graph-tool';
import GraphNodeTool from './graph-node-tool';
import GraphNodeCreator from './graph-node-creator';

import Extensions from '../../extensions/extensions';
import GraphExtension, { GraphNodeMetadata, NodeGraph, GraphData, BehaviorGraphMetadata } from '../../extensions/behavior/graph';

import '../../extensions/behavior/graph';
import { IGraphNode } from '../../extensions/behavior/nodes/types';

export interface GraphGrid extends GridRow {
    name: string;
    active: boolean;
}

export default class BehaviorGraphEditor extends EditorPlugin {
    // Public members
    public layout: Layout = null;
    public toolbar: Toolbar = null;
    public grid: Grid<GraphGrid> = null;

    public graphData: LGraph = null;
    public graph: LGraphCanvas = null;

    public extension: GraphExtension = null;

    // Protected members
    protected node: (Node | Scene) & { [index: string]: any } = null;

    protected data: GraphData = null;
    protected datas: GraphNodeMetadata = null;
    
    protected selectedObjectObserver: Observer<any> = null;
    protected selectedAssetObserver: Observer<any> = null;

    // Private members
    private _savedState: any = { };
    private _mouseMoveEvent: (ev: MouseEvent) => void = null;

    // Static members
    private static _CopiedGraph: NodeGraph = null;

    /**
     * On load the extension for the first time
     */
    public static OnLoaded (editor: Editor): void {
        editor.inspector.addTool(new GraphNodeTool());
        editor.inspector.addTool(new GraphTool());
        GraphNodeCreator.Init();
    }

    /**
     * Constructor
     * @param name: the name of the plugin 
     */
    constructor(public editor: Editor) {
        super('Graph Editor');
    }

    /**
     * Closes the plugin
     */
    public async close (): Promise<void> {
        // Remove document event
        document.removeEventListener('mousemove', this._mouseMoveEvent);

        // Stop
        this.playStop(true);
        
        // Clear
        this.layout.element.destroy();
        this.toolbar.element.destroy();
        this.grid.element.destroy();

        // Events
        this.editor.core.onSelectObject.remove(this.selectedObjectObserver);
        this.editor.core.onSelectAsset.remove(this.selectedAssetObserver);

        this.node && this.editor.inspector.setObject(this.node);

        await super.close();
    }

    /**
     * Creates the plugin
     */
    public async create(): Promise<void> {
        // Layout
        this.layout = new Layout(this.divElement.id);
        this.layout.panels = [
            { type: 'top', resizable: false, size: 30, content: '<div id="GRAPH-EDITOR-TOOLBAR" style="width: 100%; height: 100%"></div>' },
            { type: 'left', content: '<div id="GRAPH-EDITOR-LIST" style="width: 100%; height: 100%;"></div>', size: 250, overflow: 'auto', resizable: true },
            { type: 'main', content: '<canvas id="GRAPH-EDITOR-EDITOR" class="graphcanvas" style="width: 100%; height: 100%; position: absolute; top: 0;"></canvas>', resizable: true }
        ];
        this.layout.build(this.divElement.id);

        // Add toolbar
        this.toolbar = new Toolbar('GRAPH-EDITOR-TOOLBAR');
        this.toolbar.items = [
            { id: 'add-new', text: 'Add New Graph', caption: 'Add New Graph', img: 'icon-add' },
            { type: 'break' },
            { id: 'paste', text: 'Paste', caption: 'Paste', img: 'icon-export' },
            { type: 'break' },
            { id: 'play-stop', text: 'Start / Stop', caption: 'Start / Stop', img: 'icon-play-game' },
            { type: 'break' },
            { id: 'import', text: 'Import from...', caption: 'Import from...', img: 'icon-add' }
        ];
        this.toolbar.onClick = id => this.toolbarClicked(id);
        this.toolbar.right = 'No object selected';
        this.toolbar.build('GRAPH-EDITOR-TOOLBAR');

        // Add grid
        this.grid = new Grid<GraphGrid>('GRAPH-EDITOR-LIST', {
            toolbarReload: false,
            toolbarSearch: false,
            toolbarEdit: false
        });
        this.grid.columns = [
            { field: 'name', caption: 'Name', size: '80%', editable: { type: 'string' } },
            { field: 'active', caption: 'Active', size: '20%', editable: { type: 'checkbox' } }
        ];
        this.grid.contextMenuItems = [
            { id: 1, text: 'Copy', icon: 'icon-export' },
            { id: 2, text: 'Clone', icon: 'icon-export' }
        ]
        this.grid.onAdd = () => this._importFrom([this._getSerializedMetadatasFile()]);
        this.grid.onClick = ids => this.selectGraph(ids[0]);
        this.grid.onDelete = (ids) => this.delete(ids);
        this.grid.onChange = (id, value) => this.change(id, value);
        this.grid.onContextMenu = (id, recid) => this.gridContextMenuClicked(id, recid);
        this.grid.build('GRAPH-EDITOR-LIST');

        // Graph
        System.import('./node_modules/litegraph.js/css/litegraph.css');

        this.graphData = new LGraph();
        this.graphData.onStopEvent = () => {
            this.graphData._nodes.forEach(n => {
                n.description && n.description.onStop && n.description.onStop(
                    n,
                    this.graphData.scriptObject,
                    this.graphData.scriptScene
                );
                n.store = { };
            });
        };
        this.graphData.onNodeAdded = (node: IGraphNode) => {
            node.shape = 'round';
            // LiteGraphNode.SetColor(node); TOOD.
        };

        this.graph = new LGraphCanvas("#GRAPH-EDITOR-EDITOR", this.graphData);
        this.graph.canvas.classList.add('ctxmenu');
        document.addEventListener('mousemove', this._mouseMoveEvent = (ev) => {
            if (!this.data)
                return;
 
            this.data.graph = JSON.parse(JSON.stringify(this.graphData.serialize()));
            this.data.variables = this.graphData.variables;
        });
        this.graph.canvas.addEventListener('click', () => {
            const canvasPos = this.graph.convertEventToCanvas(event);
            const node = this.graphData.getNodeOnPos(canvasPos[0], canvasPos[1]);
            if (node)
                return;
            
            const group = this.graphData.getGroupOnPos(canvasPos[0], canvasPos[1]);
            return this.editor.inspector.setObject(group || this.graph);
        });
        
        this.graph.render_canvas_border = false;
        this.graph.render_execution_order = true;
        this.graph.onNodeSelected = (node) => this.editor.inspector.setObject(node);
        this.graph.showSearchBox = () => { };
        this.graph.processContextMenu = ((node, event) => {
            // Add.
            if (!node) {
                // Group?
                const group = this.graphData.getGroupOnPos(event.canvasX, event.canvasY);
                if (group) {
                    return ContextMenu.Show(event, {
                        remove: { name: 'Remove', callback: () => {
                            if (group.removable === false)
                                return;
                            
                            this.graphData.remove(group);
                        } }
                    });
                }
                
                GraphNodeCreator.OnConfirmSelection = (id) => {
                    const node = <IGraphNode> (id === 'group' ? new LGraphGroup() : LiteGraph.createNode(id));
                    if (!node)
                        return;
                    
                    node.pos = this.graph.convertEventToCanvas(event);
                    if (node.size[0] < 100)
                        node.size[0] = 100;
        
                    this.graphData.add(node);
                    GraphNodeCreator.Hide();
                };

                return GraphNodeCreator.Show();
            }

            // Node
            ContextMenu.Show(event, {
                clone: { name: 'Clone', callback: () => {
                    const clone = <IGraphNode> LiteGraph.createNode(node.type);
                    clone.pos = [node.pos[0] + 10, node.pos[1] + 10];

                    Object.assign(clone.properties, node.properties);
                    this.graphData.add(clone);
                } },
                remove: { name: 'Remove', callback: () => {
                    if (node.removable === false)
                        return;
                    
                    this.graphData.remove(node);
                } },
            });
        });

        GraphExtension.ClearNodes();
        GraphExtension.RegisterNodes();

        // Node creator widget
        GraphNodeCreator.InitItems();

        // Metadatas
        this.editor.core.scene.metadata = this.editor.core.scene.metadata || { };
        this.editor.core.scene.metadata.behaviorGraphs = this.editor.core.scene.metadata.behaviorGraphs || [];

        // Events
        this.selectedObjectObserver = this.editor.core.onSelectObject.add(data => this.objectSelected(data));
        this.selectedAssetObserver = this.editor.core.onSelectAsset.add(data => this.assetSelected(data));

        // Select object
        this.objectSelected(this.editor.core.currentSelectedObject);
        
        // Request extension
        this.extension = Extensions.RequestExtension(this.editor.core.scene, 'BehaviorGraphExtension');
        this.editor.assets.addTab(this.extension);
    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {
        this.onResize();
    }

    /**
     * Called on the window, layout etc. is resized.
     */
    public onResize (): void {
        // Layout
        this.layout.element.resize();

        // Graph canvas
        const size = this.layout.getPanelSize('main');
        this.graph.resize(size.width, size.height);
    }

    /**
     * When the user clicks on the toolbar
     * @param id: the id of the clicked item
     */
    protected toolbarClicked (id: string): void {
        switch (id) {
            case 'add-new': this.add(); break;
            case 'paste':
                if (BehaviorGraphEditor._CopiedGraph) {
                    const graphs = this.editor.core.scene.metadata.behaviorGraphs;

                    // Clone graph
                    const clonedGraph = Object.assign({ }, graphs.find(g => g.id === BehaviorGraphEditor._CopiedGraph.graphId));
                    clonedGraph.id = BabylonTools.RandomId();

                    graphs.push(clonedGraph);

                    // Add metadata
                    const clone = Object.assign({ }, BehaviorGraphEditor._CopiedGraph);
                    clone.graphId = clonedGraph.id;

                    this.datas.metadatas.push(clone);

                    // Finish
                    this.editor.assets.refresh(this.extension.id);
                    this.objectSelected(this.node);
                }
                break;
            case 'play-stop': this.playStop(); break;
            case 'import': this._importFrom(); break;
        }
    }

    /**
     * When the user clicks on a context menu item of the grid
     * @param id the id of the clicked item
     * @param recid the id of the selected item
     */
    protected gridContextMenuClicked (id: number, recid: number): void {
        switch (id) {
            case 1:
                BehaviorGraphEditor._CopiedGraph = this.datas.metadatas[recid];
                break;
            case 2:
                const graphs = this.editor.core.scene.metadata.behaviorGraphs;
                const metadata = this.datas.metadatas[recid];

                // Clone graph
                const clonedGraph = Object.assign({ }, graphs.find(g => g.id === metadata.graphId));
                clonedGraph.id = BabylonTools.RandomId();
                clonedGraph.name += ' Cloned';

                graphs.push(clonedGraph);
                
                // Add metadata
                const clone = Object.assign({ }, this.datas.metadatas[recid]);
                clone.graphId = clonedGraph.id;

                this.datas.metadatas.push(clone);

                // Finish
                this.editor.assets.refresh(this.extension.id);
                this.objectSelected(this.node);
                break;
            default: break;
        }
    }

    /**
     * On the user selects an asset in the editor
     * @param asset the selected asset
     */
    protected assetSelected (asset: GraphData): void {
        this.node = null;
        if (!asset)
            return this.objectSelected(null);

        if (asset.graph) {
            this.layout.hidePanel('left');

            this.toolbar.updateItem('paste', { hidden: true });
            this.toolbar.updateItem('play-stop', { hidden: true });

            this.onResize();

            this.datas = {
                node: 'Unknown',
                nodeId: 'Unknown',
                metadatas: [{ active: true, graphId: asset.id }]
            };

            this.selectGraph(0);

            this.layout.unlockPanel('left');
            this.layout.unlockPanel('main');
        }
    }

    /**
     * On the user selected a node
     * @param data the selected node
     */
    protected objectSelected (node: Node | Scene): void {
        if (!node || !(node instanceof Node) && !(node instanceof Scene)) {
            this.layout.lockPanel('left');
            this.layout.lockPanel('main', 'No Node Selected');

            this.toolbar.updateItem('paste', { hidden: true });
            this.toolbar.updateItem('play-stop', { hidden: true });

            return;
        }

        // Stop running graph
        this.playStop(true);

        // Configure node
        this.node = node;
        node.metadata = node.metadata || { };

        // Add all graphs
        this.datas = node.metadata.behaviorGraph;
        if (!this.datas) {
            this.datas = node.metadata.behaviorGraph = {
                node: node instanceof Scene ? 'Scene' : node.name,
                nodeId: node instanceof Scene ? 'Scene': node.id,
                metadatas: []
            };
        }

        // Clear existing data
        this.data = null;
        this.grid.element.clear();

        // Graph data
        this.graphData.clear();
        this.graphData.scriptObject = node;
        this.graphData.scriptScene = this.editor.core.scene;

        // Add rows
        const graphs = this.editor.core.scene.metadata.behaviorGraphs;

        this.datas.metadatas.forEach((d, index) => {
            const graph = graphs.find(s => s.id === d.graphId);

            this.grid.addRecord({
                recid: index,
                name: graph.name,
                active: d.active
            });
        });

        this.grid.element.refresh();
        
        // Select first graph
        if (this.datas.metadatas.length > 0) {
            this.selectGraph(0);
            this.grid.select([0]);
        }

        // Show grid
        this.layout.showPanel('left');
        this.onResize();

        // Refresh right text
        this._updateToolbarText();

        // Unlock / lock
        this.layout.unlockPanel('left');

        if (this.datas.metadatas.length === 0)
            this.layout.lockPanel('main', 'No Graph Selected');
        else
            this.layout.unlockPanel('main');

        this.toolbar.updateItem('paste', { hidden: false });
        this.toolbar.updateItem('play-stop', { hidden: false });
    }

    /**
     * When the user selects a graph in the grid
     * @param index the index of the selected graph
     */
    protected selectGraph (index: number): void {
        const graphs = this.editor.core.scene.metadata.behaviorGraphs;
        this.data = graphs.find(s => s.id === this.datas.metadatas[index].graphId);

        // Stop running graph
        this.playStop(true);

        // Configure
        GraphExtension.ClearNodes();
        GraphExtension.RegisterNodes(this.node);

        this.graphData.clear();

        IGraphNode.Loaded = false;
        this.graphData.configure(JSON.parse(JSON.stringify(this.data.graph)));
        this.graphData.variables = this.data.variables || [];
        IGraphNode.Loaded = true;

        // Refresh right text
        this._updateToolbarText();
    }

    /**
     * When the user adds a new graph
     */
    protected async add (): Promise<void> {
        // Configure
        GraphExtension.ClearNodes();
        GraphExtension.RegisterNodes(this.node);

        // Create data
        const name = await Dialog.CreateWithTextInput('Graph Name');
        const data: GraphData = {
            name: name,
            id: BabylonTools.RandomId(),
            graph: JSON.parse(JSON.stringify(new LGraph().serialize())),
            variables: []
        };

        this.editor.core.scene.metadata.behaviorGraphs.push(data);

        if (this.node) {
            // Add metadata to node
            this.datas.metadatas.push({
                active: true,
                graphId: data.id
            });

            // Add to grid
            this.grid.addRow({
                recid: this.datas.metadatas.length - 1,
                name: data.name,
                active: true
            });

            // Select latest script
            this.grid.selectNone();
            this.grid.select([this.datas.metadatas.length - 1]);
            this.selectGraph(this.datas.metadatas.length - 1);

            // Update in graph
            this.editor.graph.configure();
        }
        else {
            this.assetSelected(data);
        }

        // Unlock
        this.layout.unlockPanel('main');

        // Update assets
        this.editor.assets.refresh(this.extension.id);
    }

    /**
     * The user wants to delete a script
     * @param ids: the ids to delete
     */
    protected delete (ids: number[]): void {
        this.playStop(true);

        let offset = 0;
        ids.forEach(id => {
            this.datas.metadatas.splice(id - offset, 1);
            offset++;
        });

        // Update
        this.objectSelected(this.node);

        // Update assets
        this.editor.assets.refresh(this.extension.id);

        // Update in graph
        this.editor.graph.configure();
    }

    /**
     * On the user changes the name of the script
     * @param id: the id of the script
     * @param value: the new value
     */
    protected change (id: number, value: string | boolean): void {
        if (typeof value === 'string') {
            const graphs = this.editor.core.scene.metadata.behaviorGraphs;

            const graph = graphs.find(s => s.id === this.datas.metadatas[id].graphId);
            graph.name = value;

            // Refresh right text and assets
            this._updateToolbarText();
            this.editor.assets.refresh(this.extension.id);
        }
        else
            this.datas.metadatas[id].active = value;
    }

    /**
     * Plays or stops the current graph
     */
    protected playStop (stop: boolean = false): void {
        if (stop || this.graphData.status === LGraph.STATUS_RUNNING) {
            // Reset node
            if (this.node) {
                this.editor.core.scene.stopAnimation(this.node);

                if (this._savedState.material) {
                    SerializationHelper.Parse(() => this.node.material, this._savedState.material, this.editor.core.scene, 'file:');
                    delete this._savedState.material;
                }

                for (const obj in this._savedState)
                    this.node[obj] = this._savedState[obj];
            }

            // Clear
            this._savedState = { };
            this.graphData.stop();

            this.toolbar.updateItem('play-stop', {
                img: 'icon-play-game',
                checked: false
            });

            this.editor.core.disableObjectSelection = false;
        }
        else {
            // Save
            this.node.position && (this._savedState.position = this.node.position.clone());
            this.node.rotation && (this._savedState.rotation = this.node.rotation.clone());
            this.node.scaling && (this._savedState.scaling = this.node.scaling.clone());
            this.node.rotationQuaternion && (this._savedState.rotationQuaternion = this.node.rotationQuaternion.clone());
            // this.node.material && (this.node.material = this.node.material.clone(this.node.material.name)) && (this._savedState.material = this.node.material);
            this.node.material && (this._savedState.material = this.node.material.serialize());

            const keys = Object.keys(this.node);
            keys.forEach(k => {
                // No private members
                if (k[0] === '_')
                    return;
                
                // Primitive type
                const type = typeof this.node[k];

                if (type === 'number' || type === 'string' || type === 'boolean') {
                    this._savedState[k] = this.node[k];
                    return;
                }

                // Constructor
                const ctor = Tools.GetConstructorName(this.node[k]);
                
                if (ctor === 'Vector3' || ctor === 'Vector3' || ctor === 'Vector4') {
                    this._savedState[k] = this.node[k].clone();
                    return;
                } 


                if (ctor === 'Color3' || ctor === 'Color4') {
                    this._savedState[k] = this.node[k].clone();
                    return;
                }
            });

            // Start
            const nodes = <IGraphNode[]> this.graphData._nodes;
            nodes.forEach(n => {
                // if (n instanceof RenderStart)
                //     return this.editor.core.scene.onAfterRenderObservable.addOnce(() => n.onExecute());

                // if (n instanceof RenderLoop)
                //     return this.editor.core.scene.onAfterRenderObservable.addOnce(() => n.onExecute());
                // TODO.
            });

            this.graphData.start();

            // Update toolbar
            this.toolbar.updateItem('play-stop', {
                img: 'icon-error',
                checked: true
            });

            this.editor.core.disableObjectSelection = true;
        }
    }

    // Updates the toolbar text (attached object + edited objec)
    private _updateToolbarText (): void {
        this.toolbar.element.right = `<h2>${this.data ? this.data.name : ''}</h2> Attached to "${this.node instanceof Scene ? 'Scene' : this.node ? this.node.name : ''}"`;
        this.toolbar.element.render();
    }
    
    // Returns the serialized metadatas file
    private _getSerializedMetadatasFile (): File {
        const result = {
            customMetadatas: {
                BehaviorGraphExtension: this.extension.onSerialize()
            }
        };
        
        return Tools.CreateFile(Tools.ConvertStringToUInt8Array(JSON.stringify(result)), 'editorproject');
    }

    // Imports graph from
    private async _importFrom(files?: File[]): Promise<void> {
        let importFromFile = false;

        if (!files) {
            importFromFile = true;
            files = await Tools.OpenFileDialog();
        }
        
        for (const f of files) {
            if (Tools.GetFileExtension(f.name) !== 'editorproject')
                continue;

            // Read and parse
            const content = await Tools.ReadFileAsText(f);
            const project = <ProjectRoot> JSON.parse(content);

            if (!project.customMetadatas || !project.customMetadatas.BehaviorGraphExtension)
                continue;

            const metadatas = <BehaviorGraphMetadata> project.customMetadatas.BehaviorGraphExtension;
            const graphs = this.editor.core.scene.metadata.behaviorGraphs;

            const picker = new Picker('Import Scripts From ' + f.name + '...');
            picker.search = true;
            picker.addItems(metadatas.graphs);
            picker.open(items => {
                items.forEach(i => {
                    // Add script
                    const graph = importFromFile ? metadatas.graphs[i.id] : graphs[i.id];
                    const id = importFromFile ? BabylonTools.RandomId() : graph.id;

                    if (importFromFile) {
                        graph.id = id;
                        graphs.push(graph);
                    }

                    // Add link to current node
                    if (this.datas) {
                        this.datas.metadatas.push({
                            active: true,
                            graphId: id
                        });
                    }
                });

                // Refresh assets
                this.editor.assets.refresh(this.extension.id);
                this.editor.graph.configure();
                this.objectSelected(this.node);
            });
        }
    }
}
