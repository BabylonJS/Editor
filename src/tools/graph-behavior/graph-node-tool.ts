import { AbstractEditionTool, Tools } from 'babylonjs-editor';
import { LGraphGroup } from 'litegraph.js';

import { IGraphNode } from '../../extensions/behavior/nodes/types';
import { GraphTypeNode } from '../../extensions/behavior/nodes/graph-type-node';
import { GraphNode } from '../../extensions/behavior/nodes/graph-node';

export default class GraphNodeTool extends AbstractEditionTool<IGraphNode> {
    // Public members
    public divId: string = 'BEHAVIOR-GRAPH-NODE-TOOL';
    public tabName: string = 'Graph Node';

    // Private members
    private _array: number[] = [];

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
        return object instanceof IGraphNode || object instanceof LGraphGroup;
    }

    /**
     * Updates the edition tool
     * @param object the object selected in the graph
     */
    public update(node: IGraphNode): void {
        super.update(node);

        // Group?
        if (node instanceof LGraphGroup)
            return this._setupGroup(node);

        // Description
        if (node.desc)
            this.tool.addTextBox(node.desc);

        // Node type
        if (node instanceof GraphTypeNode) {
            this._setupNodeType(node);
        } else if (node instanceof GraphNode) {
            this._setupNode(node);
        } else {
            // TOOD.
            debugger;
        }
    }

    /**
     * setups a classic node.
     */
    private _setupNode (node: GraphNode): void {
        if (!node.description.properties)
            return;
        
        for (const property of node.description.properties) {
            const value = node.properties[property.name];

            // Enum
            if (property.enums) {
                this.tool.add(node.properties, property.name, property.enums).name(property.name).onChange(r => {
                    if (property.enumsTarget)
                        node.properties[property.name] = property.enumsTarget[r];
                });
                continue;
            }

            // Other
            const ctor = Tools.GetConstructorName(value).toLowerCase();

            switch (ctor) {
                // Primitives
                case 'number':
                case 'string':
                case 'boolean':
                    this.tool.add(node.properties, property.name).name(property.name);
                    break;

                // Vectors
                case 'array':
                    switch (value.length) {
                        case 2:
                        case 3:
                        case 4:
                            const names = ['x', 'y', 'z', 'w'];
                            value.forEach((v, index) => {
                                const o = { v: v };
                                this.tool.add(o, 'v').name(names[index]).onChange(r => node.properties.value[index] = r);
                            });
                            break;
                    }
                    break;
            }
        }
    }

    /**
     * Setups a type node to just edit its value.
     */
    private _setupNodeType (node: GraphTypeNode): void {
        const value = node.properties.value;
        const ctor = Tools.GetConstructorName(value).toLowerCase();

        switch (ctor) {
            // Primitives
            case 'number':
            case 'string':
            case 'boolean':
                this.tool.add(node.properties, 'value').name('Value');
                break;

            // Vectors
            case 'array':
                switch (value.length) {
                    case 2:
                    case 3:
                    case 4:
                        const names = ['x', 'y', 'z', 'w'];
                        value.forEach((v, index) => {
                            const o = { v: v };
                            this.tool.add(o, 'v').name(names[index]).onChange(r => node.properties.value[index] = r);
                        });
                        break;
                }
                break;
        }
    }

    /**
     * Setups the group node.
     */
    private _setupGroup (node: any): void {
        this.tool.add(node, 'title').name('Title').onChange(_ => node.graph.setDirtyCanvas(true, true));
        this.tool.addHexColor(node, 'color').onChange(_ => node.graph.setDirtyCanvas(true, true));
    }
}
