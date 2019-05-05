import { Node, NullEngine, Scene, SceneLoader, FilesInputStore } from 'babylonjs';
import { GraphExtension, LiteGraph, LGraphCanvas, LGraph, LiteGraphNode, LGraphGroup } from 'babylonjs-editor';

import GUI from './gui';
import GraphNodeCreator from './graph-node-creator';

import Tools from '../tool';
import ContextMenu from '../context-menu';

declare var vscode: {
    postMessage (message: any): void;
};

export class GraphEditor {
    // Public members
    public layout: W2UI.W2Layout;
    public editLayout: W2UI.W2Layout;
    public sidebar: Graph;

    public graphData: any;
    public graph: any;
    public gui: GUI;

    public selectedObject: Scene | Node = null;
    public selectedNode: LiteGraphNode = null;
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
        // Babylon
        this.engine = new NullEngine();
        this.scene = new Scene(this.engine);
        
        // GUI
        this.layout = $('#mainLayout').w2layout({
            name: 'mainLayout',
            panels: [
                { type: 'main', resizable: true, content: '<canvas id="renderCanvas" class="graphcanvas ctxmenu" style="width: 100%; height: 100%;"></canvas>' },
                { type: 'right', resizable: true, size: 400, content: '<div id="editLayout" style="width: 100%; height: 100%;"></div>' }
            ]
        });

        // Extension
        GraphExtension.ClearNodes();
        GraphExtension.RegisterNodes();

        // Context menu
        ContextMenu.Init();

        // Create graph
        this._createGraph();

        // Bind graph events etc.
        this._bindEvents();

        // Node creator widget
        GraphNodeCreator.Init();
        GraphNodeCreator.InitItems();

        // Gui
        this.gui = new GUI(this);
        
        // Finish
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

    // Creates the graph
    private _createGraph (): void {
        this.graphData = new LGraph();
        this.graphData.onNodeAdded = (node) => {
            node.shape = 'round';
            LiteGraphNode.SetColor(node);
        };

        LGraphCanvas.prototype.processContextMenu = (node: Node, ev: MouseEvent) => {
            this.selectedObject = node;
        
            if (node)
                (<any> $(event.target)).contextMenu({ x: ev.offsetX, y: ev.offsetY });
        };
        this.graph = new LGraphCanvas('#renderCanvas', this.graphData);
        this.graph.render_canvas_border = false;
        this.graph.render_execution_order = true;
        this.graph.showSearchBox = () => { };
        this.graph.onNodeSelected = (node) => this.gui.refresh(node);
        this.graph.processContextMenu = ((node, event) => {
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
                    const node = <LiteGraphNode> (id === 'group' ? new LGraphGroup() : LiteGraph.createNode(id));
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
                    const clone = <LiteGraphNode> LiteGraph.createNode(node.type);
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

        this.graph.canvas.addEventListener('contextmenu', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
        });
        this.graph.canvas.addEventListener('click', () => {
            const canvasPos = this.graph.convertEventToCanvas(event);
            const node = this.graphData.getNodeOnPos(canvasPos[0], canvasPos[1]);
            if (node)
                return (this.selectedNode = node);
            
            const group = this.graphData.getGroupOnPos(canvasPos[0], canvasPos[1]);
            if (!group)
                return;

            this.selectedNode = node;
            this.gui.refresh(group);
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

                    if (this.selectedNode)
                        this.graph.onNodeSelected(this.selectedNode);
                    
                    break;
                case 'set-selected-object':
                    this.selectedObject = m.name === 'Scene' ? this.scene : this.scene.getNodeByName(m.name);
                    if (this.selectedObject && this.selectedNode)
                        this.graph.onNodeSelected(this.selectedNode);
                    break;
            }
        });
    }
}
