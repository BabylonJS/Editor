import {
    Observer,
    Scene,
    Node
} from 'babylonjs';

import { LGraph, LGraphCanvas, LiteGraph } from 'litegraph.js';

import Editor, {
    Layout,
    Toolbar,
    Grid, GridRow,
    Dialog,
    EditorPlugin,
    Tools,
    Tree,
} from 'babylonjs-editor';

import GraphNodeTool from './graph-tool';

import Extensions from '../../extensions/extensions';
import GraphExtension, { BehaviorMetadata, BehaviorGraph } from '../../extensions/behavior/graph';

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

    // Protected members
    protected node: (Node | Scene) & { [index: string]: any } = null;

    protected data: BehaviorGraph = null;
    protected datas: BehaviorMetadata = null;
    
    protected resizeObserver: Observer<any> = null;
    protected selectedObjectObserver: Observer<any> = null;

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
    private static _CopiedGraph: BehaviorGraph = null;

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
        this._contextMenu.tree && this._contextMenu.tree.destroy();
        this._contextMenu.search && this._contextMenu.search.remove();

        // Events
        this.editor.core.onSelectObject.remove(this.selectedObjectObserver);
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
            { id: 'save', text: 'Save', caption: 'Save', img: 'icon-export', },
            { id: 'paste', text: 'Paste', caption: 'Paste', img: 'icon-export' },
            { type: 'break' },
            { id: 'play-stop', text: 'Start / Stop', caption: 'Start / Stop', img: 'icon-play-game' },
            //{ type: 'break' },
            //{ id: 'import', text: 'Import from...', caption: 'Import from...', img: 'icon-add' }
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
        this.grid.onAdd = () => this.add();
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
        this.graph.canvas.addEventListener('mousedown', (ev: MouseEvent) => {
            if (ev.button !== 2 && this._contextMenu.mainDiv)
                this._contextMenu.mainDiv.style.visibility = 'hidden';
        });
        this.graph.render_canvas_area = false;
        this.graph.onNodeSelected = (node) => this.editor.edition.setObject(node);
        this.graph.processContextMenu = (node, event) => this.processContextMenu(node, event);

        GraphExtension.ClearNodes();
        GraphExtension.RegisterNodes();

        // Context menu
        this.createContextMenu();

        // Events
        this.resizeObserver = this.editor.core.onResize.add(() => this.resize());
        this.selectedObjectObserver = this.editor.core.onSelectObject.add(data => this.objectSelected(data));

        // Select object
        if (this.editor.core.currentSelectedObject)
            this.objectSelected(this.editor.core.currentSelectedObject);
        
        // Request extension
        Extensions.RequestExtension(this.editor.core.scene, 'BehaviorGraphExtension');
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
            case 'save': this.data && (this.data.graph = this.graphData.serialize()); break;
            case 'paste':
                if (BehaviorGraphEditor._CopiedGraph) {
                    this.datas.metadatas.push(Object.assign({ }, BehaviorGraphEditor._CopiedGraph));
                    this.objectSelected(this.node);
                }
                break;
            case 'play-stop': this.playStop(); break;
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
                const clone = Object.assign({ }, this.datas.metadatas[recid]);
                clone.name += ' Cloned';
                
                this.datas.metadatas.push(clone);
                this.objectSelected(this.node);
                break;
            default: break;
        }
    }

    /**
     * On the user selected a node
     * @param data the selected node
     */
    protected objectSelected (node: Node | Scene): void {
        if (!(node instanceof Node) && !(node instanceof Scene)) {
            this.layout.lockPanel('left');
            this.layout.lockPanel('main', 'Please Select A Node');
            return;
        }

        // Stop running graph
        this.playStop(true);

        // Configure node
        this.node = node;
        node.metadata = node.metadata || { };

        // Add all graphs
        this.datas = node.metadata['behaviorGraph'];
        if (!this.datas)
            this.datas = node.metadata['behaviorGraph'] = { node: node instanceof Scene ? 'Scene' : node.name, metadatas: [] };

        // Clear existing data
        this.data = null;
        this.grid.element.clear();

        // Graph data
        this.graphData.clear();
        this.graphData.scriptObject = node;
        this.graphData.scriptScene = this.editor.core.scene;
        // Add rows
        this.datas.metadatas.forEach((d, index) => {
            this.grid.addRecord({
                recid: index,
                name: d.name,
                active: d.active
            });
        });

        this.grid.element.refresh();

        // Select first graph
        if (this.datas.metadatas.length > 0) {
            this.selectGraph(0);
            this.grid.select([0]);
        }

        // Refresh right text
        this.toolbar.element.right = `Attached to "${node instanceof Scene ? 'Scene' : node.name}"`;
        this.toolbar.element.render();

        // Unlock / lock
        this.layout.unlockPanel('left');

        if (this.datas.metadatas.length === 0)
            this.layout.lockPanel('main', 'Please add a graph');
        else
            this.layout.unlockPanel('main');
    }

    /**
     * When the user selects a graph in the grid
     * @param index the index of the selected graph
     */
    protected selectGraph (index: number): void {
        this.data = this.datas.metadatas[index];

        // Stop running graph
        this.playStop(true);

        // Configure
        GraphExtension.ClearNodes();
        GraphExtension.RegisterNodes(this.node);

        this.graphData.clear();
        this.graphData.configure(this.data.graph);
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
        const data: BehaviorGraph = {
            name: name,
            active: true,
            graph: new LGraph().serialize()
        };
        this.datas.metadatas.push(data);

        // Add to grid
        this.grid.addRow({
            recid: this.datas.metadatas.length - 1,
            name: data.name,
            active: true
        });

        // Select latest script
        this.grid.select([this.datas.metadatas.length - 1]);
        this.selectGraph(this.datas.metadatas.length - 1);

        // Unlock
        this.layout.unlockPanel('main');
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
    }

    /**
     * On the user changes the name of the script
     * @param id: the id of the script
     * @param value: the new value
     */
    protected change (id: number, value: string | boolean): void {
        if (typeof value === 'string')
            this.datas.metadatas[id].name = value;
        else
            this.datas.metadatas[id].active = value;
    }

    /**
     * Plays or stops the current graph
     */
    protected playStop (stop: boolean = false): void {
        if (stop || this.graphData.status === LGraph.STATUS_RUNNING) {
            for (const obj in this._savedState)
                this.node[obj] = this._savedState[obj];
            
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
            this.node.material && (this._savedState.material = this.node.material.clone(this.node.material.name));

            const keys = Object.keys(this.node);
            keys.forEach(k => {
                const type = typeof this.node[k];

                if (type === 'number' || type === 'string' || type === 'boolean')
                    this._savedState[k] = this.node[k];
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
        const zoom = 0.8;
        const mainDiv = Tools.CreateElement<HTMLDivElement>('div', 'GRAPH-CANVAS-CONTEXT-MENU', {
            width: '300px',
            height: '300px',
            position: 'relative',
            overflow: 'hidden',
            'box-shadow': '1px 2px 4px rgba(0, 0, 0, .5)',
            'border-radius': '25px',
            zoom: zoom.toString(),
            visibility: 'hidden'
        });
        document.body.appendChild(mainDiv);

        // Layout
        const layout = new Layout('GRAPH-CANVAS-CONTEXT-MENU');
        layout.panels = [{
            title: 'Add a new node',
            type: 'main',
            overflow: 'hidden',
            content: `
                <input id="GRAPH-CANVAS-CONTEXT-MENU-SEARCH" type="text" placeHolder="Search" style="width: 100%; height: 40px;" />
                <div id="GRAPH-CANVAS-CONTEXT-MENU-TREE" style="width: 100%; height: 100%; overflow: auto;"></div>`
        }];
        layout.build('GRAPH-CANVAS-CONTEXT-MENU');

        // Create tree
        const tree = new Tree('GRAPH-CANVAS-CONTEXT-MENU-TREE');
        tree.build('GRAPH-CANVAS-CONTEXT-MENU-TREE');

        const nodes = LiteGraph.registered_node_types;
        for (const n in nodes) {
            const split = n.split('/');
            const parent = tree.get(split[0]);

            if (!parent)
                tree.add({ id: split[0], text: split[0], img: 'icon-behavior-editor' });
            else
                tree.add({ id: n, text: split[1], img: 'icon-behavior-editor' }, parent.id);
        }

        // Search div
        const searchDiv = $('#GRAPH-CANVAS-CONTEXT-MENU-SEARCH');
        searchDiv.keyup(() => tree.search(<string> searchDiv.val()));

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
        this._contextMenu.mainDiv.style.left = event.pageX / zoom + 'px';
        this._contextMenu.mainDiv.style.top = (event.pageY + 300 > window.innerHeight) ? (window.innerHeight - 300) / zoom + 'px' : event.pageY / zoom + 'px';
        this._contextMenu.mainDiv.style.visibility = '';

        // Tree
        this._contextMenu.tree.onDblClick = (id) => {
            // Create node
            const node = LiteGraph.createNode(id);
            if (!node)
                return;
            
            node.pos = [event.offsetX, event.offsetY];

            // Add and close context menu
            this.graphData.add(node);
            this._contextMenu.mainDiv.style.visibility = 'hidden';
        };

        // Search
        setTimeout(() => this._contextMenu.search.focus(), 1);

        // Mouse up
        const mouseUpCallbac = (ev: MouseEvent) => {
            let parent = <HTMLDivElement> ev.target;
            while (parent) {
                if (parent.id === this._contextMenu.mainDiv.id)
                    break;

                parent = <HTMLDivElement> parent.parentNode;
            }

            if (!parent) {
                this._contextMenu.mainDiv.style.visibility = 'hidden';
                window.removeEventListener('mousedown', mouseUpCallbac);
            }
        };

        window.addEventListener('mousedown', mouseUpCallbac);
    }
}
