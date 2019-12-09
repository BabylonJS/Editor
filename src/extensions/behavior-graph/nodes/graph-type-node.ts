import { Vector2, Vector3, Vector4, Color3, Color4 } from 'babylonjs';
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

    private _type: string;

    /**
     * Constructor.
     * @param getDefaultValue the function that returns the effective value to store as a node type.
     */
    constructor (getDefaultValue: () => any) {
        super();

        // Get value (newly created or parsed?)
        this.defaultValue = getDefaultValue();

        // Get transform method
        this._type = GraphNode.GetConstructorName(this.defaultValue).toLowerCase();
        switch (this._type) {
            case 'number':
            case 'string':
            case 'boolean':
                this.addProperty('Value', this.defaultValue);
                break;
            case 'vector2':
                this._type = 'vec2';
                this.addProperty('Value', [this.defaultValue.x, this.defaultValue.y]);
                break;
            case 'vector3':
                this._type = 'vec3';
                this.addProperty('Value', [this.defaultValue.x, this.defaultValue.y, this.defaultValue.z]);
                break;
            case 'vector4':
                this._type = 'vec4';
                this.addProperty('Value', [this.defaultValue.x, this.defaultValue.y, this.defaultValue.z, this.defaultValue.w]);
                break;
            case 'color3':
                this._type = 'col3';
                this.addProperty('Value', [this.defaultValue.r, this.defaultValue.g, this.defaultValue.b]);
                break;
            case 'color4':
                this._type = 'col4';
                this.addProperty('Value', [this.defaultValue.r, this.defaultValue.g, this.defaultValue.b, this.defaultValue.a]);
                break;
            case 'object':
                if (this.defaultValue === null)
                    this._type = undefined;
                else
                    debugger;
                break;
            default: debugger; break; // Should never happen
        }

        // Output
        this.addOutput('Value', this._type);

        // Outputs
        if (this.defaultValue !== null) {
            GraphTypeNode._VectorOuputs.forEach(v => this.defaultValue[v] !== undefined && this.addOutput(v, 'number'));
            GraphTypeNode._ColorOutputs.forEach(v => this.defaultValue[v] !== undefined && this.addOutput(v, 'number'));
        }
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute (): void {
        // Null?
        if (this.defaultValue === null)
            return this.setOutputData(0, null);
        
        // Value
        const value = this.properties['Value'];
        switch (this._type) {
            case 'number':
            case 'string':
            case 'boolean':
                this.setOutputData(0, value);
                break;
            case 'vec2':
                this.setOutputData(0, new Vector2(value[0], value[1]));
                break;
            case 'vec3':
                this.setOutputData(0, new Vector3(value[0], value[1], value[2]));
                break;
            case 'vec4':
                this.setOutputData(0, new Vector4(value[0], value[1], value[2], value[3]));
                break;
            case 'col3':
                this.setOutputData(0, new Color3(value[0], value[1], value[2]));
                break;
            case 'col4':
                this.setOutputData(0, new Color4(value[0], value[1], value[2], value[3]));
                break;
            default: debugger; break; // Should never happen
        }

        if (this.defaultValue !== null) {
            GraphTypeNode._VectorOuputs.forEach((v, index) => this.defaultValue[v] !== undefined && this.setOutputData(index + 1, this.properties['Value'][index]));
            GraphTypeNode._ColorOutputs.forEach((v, index) => this.defaultValue[v] !== undefined && this.setOutputData(index + 1, this.properties['Value'][index]));
        }
    }

    /**
     * Returns the generated code.
     */
    public generateCode (): string {
        return this.defaultValue === null ? 'null' : this.defaultValue.toString();
    }

    /**
     * On the background is drawn, draw custom text.
     * @param ctx the canvas 2d context reference.
     * @param graph the graph canvas reference.
     * @param canvas the canvas reference where to draw the text.
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D): void {
        if (this.flags.collapsed || this.defaultValue === null)
		    return;

        ctx.font = '14px Arial';
        ctx.fillStyle = 'grey';
        ctx.textAlign = 'center';

        const text = this.properties['Value'].toString();
        const measure = ctx.measureText(text);
        if (this.size[0] <= measure.width) this.size[0] = measure.width + 100;

        ctx.fillText(text, this.size[0] * 0.5, this.size[1] + 15);
    }
}
