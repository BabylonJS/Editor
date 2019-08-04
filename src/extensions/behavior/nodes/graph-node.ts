import { Vector3, Vector2 } from 'babylonjs';

import { IGraphNode, IGraphNodeDescriptor } from './types';

/**
 * Defines the type of the function to call on a GraphNode.
 */
export type GraphMethodCallType = (...args: any[]) => any;

/**
 * Registers the given node in order to be used.
 * @param description the description object of the node to add in the collection.
 */
export function registerNode (description: IGraphNodeDescriptor): void {
    // Register
    GraphNode.RegisterNode(description.path, class extends GraphNode {
        title = description.name;
        desc = description.description;
        constructor () {
            super(description);
        }
    });
}

/**
 * Registers the given node in order to be used as a type node.
 * @param path the path of the node in the context menu.
 * @param name the name of the node.
 * @param description description of the node to draw in node edition tool.
 * @param getDefaultValue the function that returns the default value of the type to work as a constant.
 */
export function registerTypeNode (path: string, name: string, description: string, getDefaultValue: () => any): void {
    GraphNode.RegisterNode(path, (class extends GraphTypeNode {
        title = name;
        desc = description;
        constructor () {
            super(getDefaultValue);
        }
    }));
}

/**
 * Defines an input used for function execution.
 */
export type ExecuteInput = {
    /**
     * The name of the input.
     */
    name: string;
    /**
     * The data of the input just being retrieved.
     */
    data: any;
}

export class GraphNode extends IGraphNode {
    private _inputsOrder: GraphMethodCallType[] = [];
    private _parametersOrder: GraphMethodCallType[] = [];
    private _outputsOrder: GraphMethodCallType[] = [];

    /**
     * Constructor.
     * @param description the description object of the node to add in the collection.
     */
    constructor (public description: IGraphNodeDescriptor) {
        super();

        // Inputs
        description.inputs && description.inputs.forEach(i => {
            switch (i.type) {
                case 'number':
                case 'string': this._inputsOrder.push(GraphNode.commonToCommon); break;
                case 'vec2': this._inputsOrder.push(GraphNode.vec2ToVector2); break;
                case 'vec3': this._inputsOrder.push(GraphNode.vec3ToVector3); break;
                default: debugger; break; // Should never happen.
            }

            this.addInput(i.name, i.type);
        });

        // Parameters
        description.parameters && description.parameters.forEach(p => {
            switch (p.type) {
                case 'number':
                case 'string': this._parametersOrder.push(GraphNode.commonToCommon); break;
                case 'vec2': this._parametersOrder.push(GraphNode.vec2ToVector2); break;
                case 'vec3': this._parametersOrder.push(GraphNode.vec3ToVector3); break;
                default: debugger; break; // Should never happen.
            }
        });

        // Outputs
        description.outputs && description.outputs.forEach(o => {
            switch (o.type) {
                case 'number':
                case 'string': this._outputsOrder.push(GraphNode.commonToCommon); break;
                case 'vec2': this._outputsOrder.push(GraphNode.vector2ToVec2); break;
                case 'vec3': this._outputsOrder.push(GraphNode.vector3ToVec3); break;
                default: debugger; break; // Should never happen.
            }

            this.addOutput(o.name, o.type);
        });
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute (): void {
        const target = this.graph.scriptObject;
        const functionRef = <(...args: any[]) => any> GraphNode.GetEffectiveProperty(target, this.description.functionName);
        
        const inputs: ExecuteInput[] = [];
        const parameters: any[] = [];
        
        // Inputs and parameters
        if (this.description.inputs) {
            for (const [index, input] of this.description.inputs.entries()) {
                const data = this.getInputData(index);
                inputs.push({ name: input.name, data });
                if (!data)
                    return console.warn(`Warning: calling "${this.description.functionName}", input "${input.name}" is mandatory`);
            }
        }

        if (this.description.parameters) {
            for (const [index, parameter] of this.description.parameters.entries()) {
                if (parameter.inputName) {
                    const input = inputs.find(i => i.name === parameter.inputName);
                    if (!input && !parameter.optional)
                        return console.warn(`Warning: calling "${this.description.functionName}", input "${input.name}" is mandatory`);
                    parameters.push(this._parametersOrder[index](input.data));
                }
            }
        }
       
        // Call function!
        const result = functionRef.apply(target, parameters);

        // Ouputs
        if (this.description.outputs) {
            for (const [index, output] of this.description.outputs.entries()) {
                // First output is always the function's output.
                if (index === 0) {
                    this.setOutputData(index, this._outputsOrder[index](result));
                }
                else {
                    // TODO.
                }
            }
        }
    }

    /**
     * Returns the effective property.
     * @param object the object reference containing the property to get.
     * @param path the path of the property to get its reference/copy.
     */
    public static GetEffectiveProperty<T> (object: any, path: string): T {
        const split = path.split('.');
        for (let i = 0; i < split.length; i++)
            object = object[split[i]];

        return object;
    }

    /**
     * Returns the constructor name of the given object.
     * @param obj the object the get its constructor name.
     */
    public static GetConstructorName (obj: any): string {
        let ctrName = (obj !== undefined && obj !== null && obj.constructor) ? obj.constructor.name : '';

        if (ctrName === '')
            ctrName = typeof obj;

        return ctrName;
    }

    /**
     * Works as a bypass to just return value.
     * @param value the value to return.
     */
    public static commonToCommon (value: number | string): number | string {
        return value;
    }

    /**
     * Returns a new Vector3 from.
     * @param vec2 the vec3 input as number[].
     */
    public static vec2ToVector2 (vec2: number[]): Vector2 {
        return Vector2.FromArray(vec2);
    }
    /**
     * Returns the given vector 2d as number array.
     * @param vector2 the vector to transform as array
     */
    public static vector2ToVec2 (vector2: Vector2): number[] {
        return vector2.asArray();
    }

    /**
     * Returns a new Vector3 from.
     * @param vec3 the vec3 input as number[].
     */
    public static vec3ToVector3 (vec3: number[]): Vector3 {
        return Vector3.FromArray(vec3);
    }
    /**
     * Returns the given vector 3d as number array.
     * @param vector3 the vector to transform as array
     */
    public static vector3ToVec3 (vector3: Vector3): number[] {
        return vector3.asArray();
    }
}

export class GraphTypeNode extends IGraphNode {
    /**
     * Constructor.
     * @param getDefaultValue the function that returns the effective value to store as a node type.
     */
    constructor (getDefaultValue: () => any) {
        super();

        // Get value (newly created or parsed?)
        const value = getDefaultValue();

        // Get transform method
        let type = GraphNode.GetConstructorName(value).toLowerCase();
        switch (type) {
            case 'number':
            case 'string':
                this.addProperty('value', value);
                break;
            case 'vector2':
                type = 'vec3';
                this.addProperty('value', GraphNode.vector3ToVec3(value));
                break;
            case 'vector3':
                type = 'vec3';
                this.addProperty('value', GraphNode.vector3ToVec3(value));
                break;
            default: debugger; break; // Should never happen
        }

        // Output
        this.addOutput('value', type);
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute (): void {
        this.setOutputData(0, this.properties.value);
    }
}
