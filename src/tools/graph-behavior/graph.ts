import {
    Observer,
    Scene,
    Node,
    Tools as BabylonTools
} from 'babylonjs';

import { LGraph, LGraphCanvas, LiteGraph } from 'litegraph.js';

import Editor, {
    Layout, Toolbar, Grid, GridRow,
    Dialog, EditorPlugin, Tools,
    Tree, Picker, ProjectRoot,
    ContextMenu, ContextMenuItem,
    VSCodeSocket
} from 'babylonjs-editor';

import GraphNodeTool from './graph-tool';

import Extensions from '../../extensions/extensions';
import GraphExtension, { GraphNodeMetadata, NodeGraph, GraphData, BehaviorGraphMetadata } from '../../extensions/behavior/graph';

import '../../extensions/behavior/graph';
import { LiteGraphNode } from '../../extensions/behavior/graph-nodes/typings';
import { RenderStart, RenderLoop } from '../../extensions/behavior/graph-nodes/render/engine';

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
    
    protected resizeObserver: Observer<any> = null;
    protected selectedObjectObserver: Observer<any> = null;
    protected selectedAssetObserver: Observer<any> = null;

    // Private members
    private _savedState: any = { };
    private _contextMenu: {
        mainDiv: HTMLDivElement;
        layout: Layout,
        search: HTMLInputElement;
        tree: Tree
    } = {
        mainDiv: null,
        layout: null,
        search: null,
        tree: null
    };

    // Static members
    private static _CopiedGraph: NodeGraph = null;

    /**
     * On load the extension for the first time
     */
    public static OnLoaded (editor: Editor): void {
        editor.edition.addTool(new GraphNodeTool());
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
        this.playStop(true);
        
        // Clear
        this.layout.element.destroy();
        this.toolbar.element.destroy();
        this.grid.element.destroy();

        this._contextMenu.mainDiv && this._contextMenu.mainDiv.remove();
        this._contextMenu.layout &&  this._contextMenu.layout.element.destroy();
        // this._contextMenu.tree && this._contextMenu.tree.destroy();
        this._contextMenu.search && this._contextMenu.search.remove();

        // Events
        this.editor.core.onSelectObject.remove(this.selectedObjectObserver);
        this.editor.core.onSelectAsset.remove(this.selectedAssetObserver);
        this.editor.core.onResize.remove(this.resizeObserver);

        this.node && this.editor.edition.setObject(this.node);

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
            { type: 'main', content: '<canvas id="GRAPH-EDITOR-EDITOR" class="graphcanvas" style="width: 100%; height: 100%;"></canvas>', resizable: true }
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
            this.graphData._nodes.forEach(n => n instanceof RenderStart && (n.started = false));
        };
        this.graphData.onNodeAdded = (node: LiteGraphNode) => {
            node.shape = 'round';
            LiteGraphNode.SetColor(node);
        };

        this.graph = new LGraphCanvas("#GRAPH-EDITOR-EDITOR", this.graphData);
        this.graph.canvas.classList.add('ctxmenu');
        this.graph.canvas.addEventListener('mousedown', (ev: MouseEvent) => {
            if (ev.button !== 2 && this._contextMenu.mainDiv)
                this._contextMenu.mainDiv.style.visibility = 'hidden';
        });
        this.graph.canvas.addEventListener('mousemove', () => {
            if (this.data) {
                this.data.graph = this.graphData.serialize();
                VSCodeSocket.RefreshBehaviorGraph(this.data);
            }
        });
        this.graph.render_canvas_area = false;
        this.graph.onNodeSelected = (node) => this.editor.edition.setObject(node);
        this.graph.processContextMenu = ((node, event) => {
            if (!node)
                return this.processContextMenu(node, event);

            ContextMenu.Show(event, {
                clone: { name: 'Clone', callback: () => {
                    const clone = <LiteGraphNode> LiteGraph.createNode(node.type);
                    clone.pos = [event.offsetX, event.offsetY];

                    Object.assign(clone.properties, node.properties);
                    Object.assign(clone.outputs, node.outputs);

                    this.graphData.add(clone);
                } },
                remove: { name: 'Remove', callback: () => {
                    this.graphData.remove(node);
                } },
            });
        });

        GraphExtension.ClearNodes();
        GraphExtension.RegisterNodes();

        // Context menu
        this.createContextMenu();

        // Metadatas
        this.editor.core.scene.metadata = this.editor.core.scene.metadata || { };
        this.editor.core.scene.metadata.behaviorGraphs = this.editor.core.scene.metadata.behaviorGraphs || [];

        // Events
        this.resizeObserver = this.editor.core.onResize.add(() => this.resize());
        this.selectedObjectObserver = this.editor.core.onSelectObject.add(data => this.objectSelected(data));
        this.selectedAssetObserver = this.editor.core.onSelectAsset.add(data => this.assetSelected(data));
        
        // Select object
        this.objectSelected(this.editor.core.currentSelectedObject);
        
        // Request extension
        this.extension = Extensions.RequestExtension(this.editor.core.scene, 'BehaviorGraphExtension');
        this.editor.assets.addTab(this.extension);

        // Sockets
        VSCodeSocket.OnUpdateBehaviorGraph = async (d: GraphData) => {
            const graphs = <GraphData[]> this.editor.core.scene.metadata.behaviorGraphs;
            const effective = graphs.find(g => g.id === d.id);

            if (!effective) {
                // Just refresh
                VSCodeSocket.RefreshBehaviorGraph(graphs);
                return;
            }
            else {
                // Just update
                effective.graph = d.graph;
            }

            if (this.data && this.data.id === d.id) {
                const scale = this.graph.scale;
                const offset = this.graph.offset.slice();

                LiteGraphNode.Loaded = false;
                this.graphData.configure(this.data.graph);
                LiteGraphNode.Loaded = true;

                this.graph.offset = offset;
                this.graph.scale = scale;

                this.graph.dirty_canvas = true;
                this.graph.dirty_bgcanvas = true;
            }
        };
    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {
        this.resize();
    }

    /**
     * Resizes the view
     */
    protected resize (): void {
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
            case 1: BehaviorGraphEditor._CopiedGraph = this.datas.metadatas[recid]; break;
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

            this.resize();

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
        this.resize();

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

        LiteGraphNode.Loaded = false;
        this.graphData.configure(this.data.graph);
        LiteGraphNode.Loaded = true;

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
            graph: new LGraph().serialize()
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

                if (this._savedState.material && this.node.material)
                    this.node.material.dispose();

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
            this.node.material && (this.node.material = this.node.material.clone(this.node.material.name)) && (this._savedState.material = this.node.material);

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
            const nodes = <LiteGraphNode[]> this.graphData._nodes;
            nodes.forEach(n => {
                if (n instanceof RenderStart)
                    return this.editor.core.scene.onAfterRenderObservable.addOnce(() => n.onExecute());

                if (n instanceof RenderLoop)
                    return this.editor.core.scene.onAfterRenderObservable.addOnce(() => n.onExecute());
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

    /**
     * Creates the context menu of the canvas
     */
    protected createContextMenu (): void {
        // Create main div
        const mainDiv = Tools.CreateElement<HTMLDivElement>('div', 'GRAPH-CANVAS-CONTEXT-MENU', {
            width: '300px',
            height: '300px',
            position: 'relative',
            overflow: 'hidden',
            zoom: '0.8',
            visibility: 'hidden',
            opacity: '0.95',
            'box-shadow': '1px 2px 4px rgba(0, 0, 0, .5)',
            'border-radius': '25px',
        });
        document.body.appendChild(mainDiv);

        // Layout
        const layout = new Layout('GRAPH-CANVAS-CONTEXT-MENU');
        layout.panels = [{
            title: 'Options',
            type: 'main',
            overflow: 'hidden',
            content: `
                <input id="GRAPH-CANVAS-CONTEXT-MENU-SEARCH" type="text" placeHolder="Search" style="width: 100%; height: 40px;" />
                <div id="GRAPH-CANVAS-CONTEXT-MENU-TREE" style="width: 100%; height: 100%; overflow: auto;"></div>`
        }];
        layout.build('GRAPH-CANVAS-CONTEXT-MENU');

        // Create tree
        const tree = new Tree('GRAPH-CANVAS-CONTEXT-MENU-TREE');
        tree.wholerow = true;
        tree.keyboard = true;
        tree.build('GRAPH-CANVAS-CONTEXT-MENU-TREE');

        // Search div
        const searchDiv = $('#GRAPH-CANVAS-CONTEXT-MENU-SEARCH');
        searchDiv.keyup(() => {
            tree.search(<string> searchDiv.val());
            
            // Select first match
            const nodes = tree.element.jstree().get_json();
            for (const n of nodes) {
                if (n.state.hidden)
                    continue;

                for (const c of n.children) {
                    if (c.state.hidden)
                        continue;

                    const selected = tree.getSelected();
                    if (!selected || selected.id !== c.id)
                        tree.select(c.id);
                    break;
                }

                break;
            }
        });

        // Save
        this._contextMenu = {
            mainDiv: mainDiv,
            layout: layout,
            search: <HTMLInputElement> searchDiv[0],
            tree: tree
        };
    }

    /**
     * Processes the context menu of the canvas
     * @param node the node under pointer
     * @param event the mouse event
     */
    protected processContextMenu (node: LiteGraphNode, event: MouseEvent): void {
        const zoom = parseFloat(this._contextMenu.mainDiv.style.zoom);
        this._contextMenu.mainDiv.style.left = (event.pageX + 10) / zoom + 'px';
        this._contextMenu.mainDiv.style.top = (event.pageY + 300 > window.innerHeight) ? (window.innerHeight - 300) / zoom + 'px' : event.pageY / zoom + 'px';
        this._contextMenu.mainDiv.style.visibility = '';

        // Tree
        this._contextMenu.tree.clear();
        this._contextMenu.search.value = '';

        if (node) {
            this._contextMenu.mainDiv.style.height = '120px';

            // Draw ouputs
            if (node.onGetOutputs) {
                const outputs = node.onGetOutputs();
                const parent = this._contextMenu.tree.add({ id: 'graph-outputs', text: 'Outputs', img: 'icon-helpers' });

                outputs.forEach(o => {
                    this._contextMenu.tree.add({ id: 'graph-outputs' + o[0], text: o[0], data: o, img: 'icon-export' }, parent.id);
                });

                this._contextMenu.mainDiv.style.height = '300px';
            }

            // Draw inputs
            if (node.onGetInputs) {
                const inputs = node.onGetInputs();
                const parent = this._contextMenu.tree.add({ id: 'graph-inputs', text: 'Inputs', img: 'icon-helpers' });

                inputs.forEach(i => {
                    this._contextMenu.tree.add({ id: 'graph-inputs' + i[0], text: i[0], data: i, img: 'icon-export' }, parent.id);
                });

                this._contextMenu.mainDiv.style.height = '300px';
            }

            // Draw misc
            this._contextMenu.tree.add({ id: 'graph-clone', text: 'Clone', img: 'icon-export' });
            this._contextMenu.tree.add({ id: 'graph-remove', text: 'Remove', img: 'icon-error' });
        }
        else {
            // Add new node
            const nodes = LiteGraph.registered_node_types;
            for (const n in nodes) {
                const split = n.split('/');
                const parent = this._contextMenu.tree.get(split[0]) || this._contextMenu.tree.add({ id: split[0], text: split[0], img: 'icon-behavior-editor' });

                this._contextMenu.tree.add({ id: n, text: split[1], img: 'icon-behavior-editor' }, parent.id);
            }

            this._contextMenu.mainDiv.style.height = '300px';
        }

        // On the user clicks on an item
        this._contextMenu.tree.onClick = (id, data) => {
            switch (id) {
                case 'graph-clone':
                    const clone = <LiteGraphNode> LiteGraph.createNode(node.type);
                    clone.pos = [event.offsetX, event.offsetY];

                    Object.assign(clone.properties, node.properties);
                    Object.assign(clone.outputs, node.outputs);

                    this.graphData.add(clone);
                    break;
                case 'graph-remove':
                    this.graphData.remove(node);
                    break;
                
                default:
                    if (!data)
                        return;

                    // Input
                    if (id.indexOf('graph-inputs') === 0) {
                        node.addInput(data[0], data[1]);
                    }
                    // Outputs
                    else if (id.indexOf('graph-outputs') === 0) {
                        node.addOutput(data[0], data[1]);
                    }
                    else
                        return;
            }

            this._contextMenu.mainDiv.style.visibility = 'hidden';
        };

        // On the user dbl clicks an item
        this._contextMenu.tree.onDblClick = (id) => {
            // Create node
            const node = <LiteGraphNode> LiteGraph.createNode(id);
            if (!node)
                return;
            
            if (node.size[0] < 100)
                node.size[0] = 100;

            node.pos = [event.offsetX, event.offsetY];

            // Add and close context menu
            this.graphData.add(node);
            this._contextMenu.mainDiv.style.visibility = 'hidden';
        };

        // Focus on search
        setTimeout(() => this._contextMenu.search.focus(), 1);

        // Enter (once a node is selected)
        const enterCallback = (ev: KeyboardEvent) => {
            if (ev.keyCode !== 13)
                return;
            
            const selected = this._contextMenu.tree.getSelected();
            if (!selected)
                return;
            
            this._contextMenu.tree.onDblClick(selected.id, selected.data);
            this._contextMenu.tree.onClick(selected.id, selected.data);

            window.removeEventListener('keyup', enterCallback);
        };

        window.addEventListener('keyup', enterCallback);

        // Mouse up (close or not the context menu)
        const mouseUpCallback = (ev: MouseEvent) => {
            let parent = <HTMLDivElement> ev.target;
            while (parent) {
                if (parent.id === this._contextMenu.mainDiv.id)
                    break;

                parent = <HTMLDivElement> parent.parentNode;
            }

            if (!parent) {
                this._contextMenu.mainDiv.style.visibility = 'hidden';
                window.removeEventListener('mousedown', mouseUpCallback);
                this.graph.canvas.removeEventListener('mousedown', mouseUpCallback);
                window.removeEventListener('keyup', enterCallback);
            }
        };

        window.addEventListener('mousedown', mouseUpCallback);
        this.graph.canvas.addEventListener('mousedown', mouseUpCallback);
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
                this.editor.assets.refresh();
                this.objectSelected(this.node);
            });
        }
    }
}
