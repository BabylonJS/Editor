import { Vector3, Vector2, Vector4 } from 'babylonjs';

import { IGraphNode, IGraphNodeDescriptor, GraphMethodCallType } from './types';

/**
 * Registers the given node in order to be used.
 * @param description the description object of the node to add in the collection.
 * @param object defines the object being customized using the graph editor.
 */
export function registerNode (description: IGraphNodeDescriptor, object: any): void {
    // if (!(object instanceof description.ctor))
    //     return;
    
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
    private _propertiesOrder: GraphMethodCallType[] = [];
    private _inputsOrder: GraphMethodCallType[] = [];
    private _parametersOrder: GraphMethodCallType[] = [];
    private _outputsOrder: GraphMethodCallType[] = [];

    /**
     * Constructor.
     * @param description the description object of the node to add in the collection.
     */
    constructor (public description: IGraphNodeDescriptor) {
        super();

        // Properties
        description.properties && description.properties.forEach(i => {
            switch (i.type) {
                case 'number':
                case 'string':
                    this._propertiesOrder.push(GraphNode.commonToCommon);
                    this.addProperty(i.name, i.defaultValue);
                    break;
                case 'vec2':
                    this._propertiesOrder.push(GraphNode.vec2ToVector2);
                    this.addProperty(i.name, [0, 0]);
                    break;
                case 'vec3':
                    this._propertiesOrder.push(GraphNode.vec3ToVector3);
                    this.addProperty(i.name, [0, 0, 0]);
                    break;
                case 'vec4':
                        this._propertiesOrder.push(GraphNode.vec4ToVector4);
                        this.addProperty(i.name, [0, 0, 0, 0]);
                        break;
                default: debugger; break; // Should never happen
            }
        });

        // Inputs
        description.inputs && description.inputs.forEach(i => {
            switch (i.type) {
                case 'number':
                case 'string': this._inputsOrder.push(GraphNode.commonToCommon); break;
                case 'vec2': this._inputsOrder.push(GraphNode.vec2ToVector2); break;
                case 'vec3': this._inputsOrder.push(GraphNode.vec3ToVector3); break;
                case 'vec4': this._inputsOrder.push(GraphNode.vec4ToVector4); break;
                default: debugger; break; // Should never happen
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
                case 'vec4': this._parametersOrder.push(GraphNode.vec4ToVector4); break;
                default: debugger; break; // Should never happen
            }
        });

        // Outputs
        description.outputs && description.outputs.forEach(o => {
            switch (o.type) {
                case 'number':
                case 'string': this._outputsOrder.push(GraphNode.commonToCommon); break;
                case 'vec2': this._outputsOrder.push(GraphNode.vector2ToVec2); break;
                case 'vec3': this._outputsOrder.push(GraphNode.vector3ToVec3); break;
                case 'vec4': this._outputsOrder.push(GraphNode.vector4ToVec4); break;
                case 'any': this._outputsOrder.push(null /* TODO. push function that returns appropriate output type */); break;
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
        const functionRef = <(...args: any[]) => any> (this.description.functionName ? GraphNode.GetEffectiveProperty(target, this.description.functionName) : null);
        
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
        const result = functionRef ? functionRef.apply(target, parameters) : null;

        // Ouputs
        if (this.description.outputs) {
            for (const [index, output] of this.description.outputs.entries()) {
                // First output is always the function's output.
                if (this.description.functionName && index === 0) {
                    this.setOutputData(index, this._outputsOrder[index](result));
                    continue;
                }

                // Properties
                if (output.propertyPath) {
                    if (output.propertyName) {
                        const property = GraphNode.GetEffectiveProperty<any>(target, this.properties[output.propertyName]);
                        const ctor = GraphNode.GetConstructorName(property).toLowerCase();
                        // TODO. move this function.
                        switch (ctor) {
                            case 'number':
                            case 'string':
                                this.setOutputData(index, GraphNode.commonToCommon(property));
                                break;
                            case 'vector3':
                                this.setOutputData(index, GraphNode.vector3ToVec3(property));
                                break;
                        }
                    }
                    else {
                        const property = GraphNode.GetEffectiveProperty(target, output.propertyPath);
                        this.setOutputData(index, this._outputsOrder[index](property));
                    }
                    continue;
                }
                else if (output.propertyName) {
                    this.setOutputData(index, this.properties[output.propertyName]);
                    continue;
                }

                // Other types of outputs coming...
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

    /**
     * Returns a new Vector4 from.
     * @param vec4 the vec4 input as number[].
     */
    public static vec4ToVector4 (vec4: number[]): Vector4 {
        return Vector4.FromArray(vec4);
    }
    /**
     * Returns the given vector 4d as number array.
     * @param vector4 the vector to transform as array
     */
    public static vector4ToVec4 (vector4: Vector4): number[] {
        return vector4.asArray();
    }
}
