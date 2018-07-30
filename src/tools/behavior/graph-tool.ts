import { LGraph } from 'litegraph.js';
import { AbstractEditionTool } from 'babylonjs-editor';

import { LiteGraphNode } from '../../extensions/behavior/graph-nodes/typings';

export default class GraphNodeTool extends AbstractEditionTool<LiteGraphNode> {
    // Public members
    public divId: string = 'BEHAVIOR-GRAPH-NODE-TOOL';
    public tabName: string = 'Graph Node';

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

        // Check
        if (Object.keys(node.properties).length === 0) {
            this.tool.addFolder('No properties');
            return;
        }

        // Properties
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
