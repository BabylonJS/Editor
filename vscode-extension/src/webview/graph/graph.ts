import { Node, NullEngine, Scene, SceneLoader, FilesInputStore } from 'babylonjs';
import { GraphExtension, LiteGraph, LGraphCanvas, LGraph } from 'babylonjs-editor';

import GUI from './gui';
import Tools from '../tool';

declare var vscode: {
    postMessage (message: any): void;
};

export class GraphEditor {
    // Public members
    public layout: W2UI.W2Layout;
    public editLayout: W2UI.W2Layout;
    public sidebar: W2UI.W2Sidebar;

    public graphData: any;
    public graph: any;
    public gui: GUI;

    public selectedObject: Node = null;
    public selectedNode: any = null;
    public sceneInfos: any = null;

    public engine: NullEngine;
    public scene: Scene;

    // Private members
    private _data: any = null;
    private _lastData: any = null;

    /**
     * Constructor
     */
    constructor () {
        // Babylon.js
        this.engine = new NullEngine();
        this.scene = new Scene(this.engine);
        
        // Create UI
        this.layout = $('#mainLayout').w2layout({
            name: 'mainLayout',
            panels: [
                { type: 'main', resizable: true, content: '<canvas id="renderCanvas" class="graphcanvas ctxmenu" style="width: 100%; height: 100%;"></canvas>' },
                { type: 'right', resizable: true, size: 400, content: '<div id="editLayout" style="width: 100%; height: 100%;"></div>' }
            ]
        });
        
        this.editLayout = $('#editLayout').w2layout({
            name: 'editLayout',
            panels: [
                { type: 'top', resizable: true, size: '50%', content: '<div id="nodes" style="width: 100%; height: 100%;"></div>' },
                { type: 'bottom', resizable: true, size: '50%', content: '<div id="edition" style="width: 100%; height: 100%;"></div>' }
            ]
        });
        
        this.sidebar = $('#nodes').w2sidebar({
            name: 'nodes',
            img: null,
            nodes: []
        });

        // Extension
        GraphExtension.ClearNodes();
        GraphExtension.RegisterNodes();

        // Create graph
        this.graphData = new LGraph();
        this.graphData.onNodeAdded = (node) => {
            node.shape = 'round';
        };

        LGraphCanvas.prototype.processContextMenu = (node: Node, ev: MouseEvent) => {
            this.selectedObject = node;
        
            if (node)
                (<any> $(event.target)).contextMenu({ x: ev.offsetX, y: ev.offsetY });
        };
        this.graph = new LGraphCanvas('#renderCanvas', this.graphData);
        this.graph.canvas.addEventListener('contextmenu', (ev) => { ev.stopPropagation(); ev.preventDefault(); });
        this.graph.render_canvas_area = false;
        this.graph.onNodeSelected = (node) => {
            this.selectedNode = node;
            this.gui.refresh(node);
        };

        // Bind graph events etc.
        this._bindEvents();
        this._createContextMenu();

        this.gui = new GUI(this);

        // Finish
        this._fillSideBar();
        
        vscode.postMessage({ command: 'require-graph' });
        this.resize();
    }

    /**
     * Refreshes the graph data
     */
    public refreshData (): void {
        if (!this._data) {
            return;
        }
        this._data.graph = this.graphData.serialize();
    
        var str = JSON.stringify(this._data.graph);
        if (str === this._lastData) {
            return;
        }
    
        this._lastData = str;
        vscode.postMessage({ command: 'set-graph', graph: this._data });
    }

    /**
     * Resizes the canvas
     */
    public resize (): void {
        const previewPanel = this.layout.get('main');
        this.graph.resize(previewPanel['width'], previewPanel['height']);
    }

    // Fills the sidebar
    private _fillSideBar (): void {
        const keys = Object.keys(LiteGraph.registered_node_types);
        keys.forEach((k) => {
            const folders = {};
            const split = k.split('/');
            const id = split[0];
            const name = split[1];

            // Create folder?
            if (!folders[id]) {
                folders[id] = true;
                this.sidebar.add({ id: id, text: id, group: true });
            }

            // Add
            this.sidebar.add(id, { id: k, text: name, img: 'icon-page' });

            // Event
            this.sidebar.on('dblClick', (ev) => {
                if (ev.object.id === k) {
                    const node = LiteGraph.createNode(k);
                    if (!node)
                        return;

                    if (node.size[0] < 100)
                        node.size[0] = 100;

                    const previewPanel = this.layout.get('main');
                    node.pos = [previewPanel['width'] / 2 - node.size[0] / 2, previewPanel['height'] / 2 - node.size[1] / 2];
                    this.graphData.add(node);
                }
            });
        });
    }

    // Binds the graph events
    private _bindEvents (): void {
        // Events
        this.layout.on({ execute: 'after', type: 'resize' }, () => this.resize());

        document.body.addEventListener('mousemove', () => this.refreshData());

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('message', async (e) => {
            const m = e.data;
        
            switch (m.command) {
                case 'set-graph':
                    var scale = this.graph.scale;
                    var offset = this.graph.offset.slice();
        
                    this._data = m.graph;
                    this.graphData.configure(this._data.graph);
        
                    // Reset state
                    this.graph.offset = offset;
                    this.graph.scale = scale;
        
                    this.graph.dirty_canvas = true;
                    this.graph.dirty_bgcanvas = true;
                    break;
                case 'set-scene-infos':
                    this.sceneInfos = m.infos;

                    // Load scene
                    const str = JSON.stringify(this.sceneInfos);
                    const arr = Tools.ConvertStringToUInt8Array(str);
                    FilesInputStore.FilesToLoad['scene.babylon'] = Tools.CreateFile(arr, 'scene.babylon');
                    this.scene = await SceneLoader.LoadAsync('file:', 'scene.babylon', this.engine);

                    if (this.selectedObject)
                        this.graph.onNodeSelected(this.selectedObject);
                    
                    break;
                case 'set-selected-object':
                    this.selectedObject = m.object;
                    if (this.selectedObject)
                        this.graph.onNodeSelected(this.selectedObject);
                    break;
            }
        });
    }

    // Creates the context menu
    private _createContextMenu (): void {
        (<any> $).contextMenu({
            selector: '.ctxmenu',
            trigger: 'none',
            build: ($trigger, e) => {
                e.preventDefault();
                return {
                    callback: (key) => {
                        switch (key) {
                            case 'clone':
                                const clone = LiteGraph.createNode(this.selectedNode.type);
                                clone.pos = [this.selectedNode.pos[0] + 20, this.selectedNode.pos[1] + 20];
                                Object.assign(clone.properties, this.selectedNode.properties);
                                Object.assign(clone.outputs, this.selectedNode.outputs);
                                this.graphData.add(clone);
                                break;
                            case 'remove':
                                this.graphData.remove(this.selectedNode);
                                this.selectedNode = null;
                                break;
                            default: break;
                        }
                    },
                    items: {
                        'clone': { name: 'Clone', icon: 'fa-edit' },
                        'remove': { name: 'Remove', icon: 'fa-remove' },
                    }
                }
            }
        });
    }
}
