import { LGraph, LiteGraph } from 'litegraph.js';
import { AbstractEditionTool, Tools } from 'babylonjs-editor';

import { LiteGraphNode } from '../../extensions/behavior/graph-nodes/typings';

export default class GraphNodeTool extends AbstractEditionTool<LiteGraphNode> {
    // Public members
    public divId: string = 'BEHAVIOR-GRAPH-NODE-TOOL';
    public tabName: string = 'Graph Node';

    // Private members
    private _mode: string = '';

    /**
     * Constructor
     * @param editor the path finder editor
     */
    constructor () {
        super();
    }

    /**
     * Returns if the object is supported
     * @param object the object selected in the graph
     */
    public isSupported(object: any): boolean {
        return object instanceof LiteGraphNode || (object.graph && object.graph instanceof LGraph);
    }

    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    public update(node: LiteGraphNode): void {
        super.update(node);

        // Description
        const ctor = Tools.GetConstructorName(node);
        for (const key in LiteGraph.registered_node_types) {
            if (LiteGraph.registered_node_types[key].name === ctor) {
                const desc = LiteGraph.registered_node_types[key].desc || LiteGraph.registered_node_types[key].Desc;

                this.tool.addFolder(desc);
                break;
            }
        }

        // Common
        const common = this.tool.addFolder('Common');
        common.open();

        common.add(node, 'title').name('Title');

        const modes: string[] = ['ALWAYS', 'ON_EVENT', 'NEVER', 'ON_TRIGGER'];
        this._mode = modes[node.mode];
        common.add(this, '_mode', modes).name('Mode').onChange(r => {
            node.mode = LiteGraph[r];

            switch (node.mode) {
                case LiteGraph.ALWAYS: node.color = '#FFF'; node.bgColor = '#AAA'; break;
                case LiteGraph.ON_EVENT: node.color = '#AAF'; node.bgColor = '#44A'; break;
                case LiteGraph.ON_TRIGGER: node.color = '#AFA'; node.bgColor = '#4A4'; break;
                case LiteGraph.NEVER: node.color = '#FAA'; node.bgColor = '#A44'; break;
                default: break;
            }
        });


        // Properties
        if (Object.keys(node.properties).length === 0) {
            this.tool.addFolder('No properties');
            return;
        }

        const properties = this.tool.addFolder('Properties');
        properties.open();

        const keys = Object.keys(node.properties);

        keys.forEach(k => {
            switch (typeof node.properties[k]) {
                case 'number': properties.add(node.properties, k).step(0.001).name(k); break;
                case 'string': properties.add(node.properties, k).name(k); break;
                case 'boolean': properties.add(node.properties, k).name(k); break;
                default: break;
            }
        });
    }
}
