import {
    Observer,
    Scene, Node
} from 'babylonjs';

import { LGraph, LGraphCanvas, LiteGraph } from 'litegraph.js';

import Editor, {
    Layout,
    Toolbar,
    Grid, GridRow,
    Dialog,
    EditorPlugin,
} from 'babylonjs-editor';

import GraphNodeTool from './graph-tool';

import Extensions from '../../extensions/extensions';
import GraphExtension, { BehaviorMetadata, BehaviorGraph } from '../../extensions/behavior/graph';

import '../../extensions/behavior/graph';
import { RenderStart } from '../../extensions/behavior/graph-nodes/core/engine';
import { LiteGraphNode } from '../../extensions/behavior/graph-nodes/typings';

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
    protected node: Node & { [index: string]: any } = null;

    protected data: BehaviorGraph = null;
    protected datas: BehaviorMetadata = null;
    
    protected resizeObserver: Observer<any> = null;
    protected selectedObjectObserver: Observer<any> = null;

    // Private members
    private _savedState: any = { };

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
        
        this.layout.element.destroy();
        this.toolbar.element.destroy();
        this.grid.element.destroy();

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
        this.grid.onAdd = () => this.add();
        this.grid.onClick = ids => this.selectGraph(ids[0]);
        this.grid.onDelete = (ids) => this.delete(ids);
        this.grid.onChange = (id, value) => this.change(id, value);
        this.grid.build('GRAPH-EDITOR-LIST');

        // Graph
        System.import('./node_modules/litegraph.js/css/litegraph.css');

        this.graphData = new LGraph();
        this.graphData.onNodeAdded = (node: LiteGraphNode) => {
            node.shape = 'round';

            switch (node.mode) {
                case LiteGraph.ALWAYS: node.color = '#FFF'; node.bgColor = '#AAA'; break;
                case LiteGraph.ON_EVENT: node.color = '#AAF'; node.bgColor = '#44A'; break;
                case LiteGraph.ON_TRIGGER: node.color = '#AFA'; node.bgColor = '#4A4'; break;
                case LiteGraph.NEVER: node.color = '#FAA'; node.bgColor = '#A44'; break;
                default: break;
            }
        };
        this.graphData.onStopEvent = () => RenderStart.Started = false;

        this.graph = new LGraphCanvas("#GRAPH-EDITOR-EDITOR", this.graphData);
        this.graph.onNodeSelected = (node) => this.editor.edition.setObject(node);

        GraphExtension.ClearNodes();
        GraphExtension.RegisterNodes();

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
            case 'play-stop': this.playStop(); break;
        }
    }

    /**
     * On the user selected a node
     * @param data the selected node
     */
    protected objectSelected (node: Node): void {
        if (!(node instanceof Node)) {
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
            this.datas = node.metadata['behaviorGraph'] = { node: node.name, metadatas: [] };

        // Clear existing data
        this.data = null;
        this.grid.element.clear();

        // Graph data
        this.graphData.clear();
        this.graphData.scriptObject = node;

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
        this.toolbar.element.right = `Attached to "${node.name}"`;
        this.toolbar.element.render();

        // Unlock
        this.layout.unlockPanel('left');
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
        }
        else {
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

            this.graphData.start();

            this.toolbar.updateItem('play-stop', {
                img: 'icon-error',
                checked: true
            });
        }
    }
}
