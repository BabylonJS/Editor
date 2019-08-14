import { LGraphCanvas } from 'litegraph.js';

import { GraphNode } from './graph-node';
import { IGraphNode } from './types';

/**
 * Registers the given node in order to be used as a type node.
 * @param path the path of the node in the context menu.
 * @param name the name of the node.
 * @param description description of the node to draw in node edition tool.
 * @param getDefaultValue the function that returns the default value of the type to work as a constant.
 */
export function registerTypeNode (path: string, name: string, description: string, getDefaultValue: () => any): void {
    GraphNode.RegisterNode(path, (class extends GraphTypeNode {
        static Title = name;
        static Desc = description;
        title = name;
        desc = description;
        constructor () {
            super(getDefaultValue);
        }
    }));
}

export class GraphTypeNode extends IGraphNode {
    private static _VectorOuputs = ['x', 'y', 'z', 'w'];
    private static _ColorOutputs = ['r', 'g', 'b', 'a'];

    /**
     * The default value of the type.
     */
    public defaultValue: any;

    /**
     * Constructor.
     * @param getDefaultValue the function that returns the effective value to store as a node type.
     */
    constructor (getDefaultValue: () => any) {
        super();

        // Get value (newly created or parsed?)
        this.defaultValue = getDefaultValue();

        // Get transform method
        let type = GraphNode.GetConstructorName(this.defaultValue).toLowerCase();
        switch (type) {
            case 'number':
            case 'string':
                this.addProperty('Value', this.defaultValue);
                break;
            case 'vector2':
                type = 'vec2';
                this.addProperty('Value', GraphNode.vector3ToVec3(this.defaultValue));
                break;
            case 'vector3':
                type = 'vec3';
                this.addProperty('Value', GraphNode.vector3ToVec3(this.defaultValue));
                break;
            case 'vector4':
                type = 'vec4';
                this.addProperty('Value', GraphNode.vector4ToVec4(this.defaultValue));
                break;
            case 'color3':
                type = 'col3';
                this.addProperty('Value', GraphNode.color3ToCol3(this.defaultValue));
                break;
            case 'color4':
                type = 'col4';
                this.addProperty('Value', GraphNode.color4ToCol4(this.defaultValue));
                break;
            default: debugger; break; // Should never happen
        }

        // Output
        this.addOutput('Value', type);

        // Outputs
        GraphTypeNode._VectorOuputs.forEach(v => this.defaultValue[v] !== undefined && this.addOutput(v, 'number'));
        GraphTypeNode._ColorOutputs.forEach(v => this.defaultValue[v] !== undefined && this.addOutput(v, 'number'));
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute (): void {
        this.setOutputData(0, this.properties['Value']);

        GraphTypeNode._VectorOuputs.forEach((v, index) => this.defaultValue[v] !== undefined && this.setOutputData(index + 1, this.properties['Value'][index]));
        GraphTypeNode._ColorOutputs.forEach((v, index) => this.defaultValue[v] !== undefined && this.setOutputData(index + 1, this.properties['Value'][index]));
    }

    /**
     * On the background is drawn, draw custom text.
     * @param ctx the canvas 2d context reference.
     * @param graph the graph canvas reference.
     * @param canvas the canvas reference where to draw the text.
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D): void {
        if (this.flags.collapsed)
		    return;

        ctx.font = '14px Arial';
        ctx.fillStyle = 'grey';
        ctx.textAlign = 'center';

        const text = this.properties['Value'].toString();
        const measure = ctx.measureText(text);
        if (this.size[0] <= measure.width) this.size[0] = measure.width + 100;

        ctx.fillText(text, this.size[0] * 0.5, this.size[1] * 0.5 + 7);
    }
}
