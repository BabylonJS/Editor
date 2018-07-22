import {
    Observer,
    Scene, Node
} from 'babylonjs';

import { LGraph, LGraphCanvas } from 'litegraph.js';
import '../../../../node_modules/litegraph.js/css/litegraph.css';

import Editor, {
    Layout,
    Toolbar,
    Grid, GridRow,
    EditorPlugin,
} from 'babylonjs-editor';

import Extensions from '../../extensions/extensions';
import GraphExtension, { BehaviorMetadata, BehaviorGraph } from '../../extensions/behavior/graph';

import '../../extensions/behavior/graph';

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
    protected node: Node = null;

    public data: BehaviorGraph = null;
    public datas: BehaviorMetadata = null;
    
    protected resizeObserver: Observer<any> = null;
    protected selectedObjectObserver: Observer<any> = null;

    // Static members
    private static _RegisteredNodes: boolean = false;

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
        this.layout.element.destroy();
        this.toolbar.element.destroy();
        this.grid.element.destroy();

        this.editor.core.onSelectObject.remove(this.selectedObjectObserver);
        this.editor.core.onResize.remove(this.resizeObserver);

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
            { id: 'import', text: 'Import from...', caption: 'Import from...', img: 'icon-add' }
        ];
        this.toolbar.right = 'No object selected';
        this.toolbar.build('GRAPH-EDITOR-TOOLBAR');

        // Add grid
        this.grid = new Grid<GraphGrid>('GRAPH-EDITOR-LIST', {
            toolbarReload: false,
            toolbarSearch: false
        });
        this.grid.columns = [
            { field: 'name', caption: 'Name', size: '80%', editable: { type: 'string' } },
            { field: 'active', caption: 'Active', size: '20%', editable: { type: 'checkbox' } }
        ];
        this.grid.onAdd = () => this.add();
        this.grid.build('GRAPH-EDITOR-LIST');

        // Graph
        this.graphData = new LGraph();
        this.graphData.onPropertyChanged = () => this.data && (this.data.graph = this.graphData.serialize());

        this.graph = new LGraphCanvas("#GRAPH-EDITOR-EDITOR", this.graphData);

        // Events
        this.resizeObserver = this.editor.core.onResize.add(() => this.resize());
        this.selectedObjectObserver = this.editor.core.onSelectObject.add(data => this.objectSelected(data));

        // Select object
        if (this.editor.core.currentSelectedObject)
            this.objectSelected(this.editor.core.currentSelectedObject);
        
        // Request extension
        Extensions.RequestExtension(this.editor.core.scene, 'BehaviorGraphExtension');

        // Register nodes
        if (!BehaviorGraphEditor._RegisteredNodes) {
            GraphExtension.RegisterNodes(this.graphData);
            BehaviorGraphEditor._RegisteredNodes = true;
        }
    }

    /**
     * On the user shows the plugin
     */
    public onShow (): void {

    }

    /**
     * Resizes the view
     */
    protected resize (): void {
        // Layout
        this.layout.element.resize();

        // Graph canvas
        const size = this.layout.getPanelSize('main');
        this.graph.canvas.width = size.width;
        this.graph.canvas.height = size.height;
    }

    /**
     * On the user selected a node
     * @param data the selected node
     */
    protected objectSelected (node: Node): void {
        if (!(node instanceof Node))
            return;

        this.node = node;
        node.metadata = node.metadata || { };

        // Add all graphs
        this.datas = node.metadata['behaviorGraph'];
        if (!this.datas)
            this.datas = node.metadata['behaviorGraph'] = { node: node.name, metadatas: [] };

        // Clear existing data
        this.data = null;

        this.grid.element.clear();
        this.graphData.clear();

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
    }

    /**
     * When the user selects a graph in the grid
     * @param index the index of the selected graph
     */
    protected selectGraph (index: number): void {
        debugger;
        this.data = this.datas.metadatas[index];

        this.graphData.clear();
        this.graphData.configure(this.data.graph);
    }

    /**
     * When the user adds a new graph
     */
    protected add (): void {
        // Create data
        const data: BehaviorGraph = {
            name: 'New Graph',
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
}
