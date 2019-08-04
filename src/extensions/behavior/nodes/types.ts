import { LGraph, LiteGraph } from 'litegraph.js';

export type InputOutputType = 'number' | 'string' | 'vec3' | string;

export interface IGraphNodeDescriptor {
    /**
     * The name of the node.
     */
    name: string;
    /**
     * Defines the description of the node to draw in node edition tool.
     */
    description: string;
    /**
     * Represents the path of the node.
     * @example math/multiply.
     */
    path: string;
    /**
     * Defines the constructor where the node can be applied.
     * @example BABYLON.Node.
     */
    ctor: new (...args: any[]) => any;
    /**
     * Defines all the available inputs for the node.
     */
    inputs?: {
        /**
         * The name of the input.
         */
        name: string;
        /**
         * The type of input. Means the input value type.
         */
        type: InputOutputType;
    }[];
    /**
     * Defines all the outputs avaiable for the node.
     */
    outputs?: {
        /**
         * The name of the output.
         */
        name: string;
        /**
         * The type of output. Means the output value type.
         */
        type: InputOutputType;
    }[];
    /**
     * The name of the function to call on the current object being used.
     * @see myGraphNode.graph.scriptObject;
     */
    functionName: string;
    /**
     * All available parameters while calling the function on the current object being used.
     */
    parameters?: {
        /**
         * The name of the input to take as parameter.
         */
        inputName?: string;
        /**
         * The name of the property to take as parameter.
         */
        propertyName?: string;
        /**
         * Sets wether or not the parameter is optional.
         */
        optional?: boolean;
        /**
         * The type of output. Means the output value type.
         */
        type: InputOutputType;
    }[];
    /**
     * All the available properties allowing to customize the node.
     */
    properties?: {
        /**
         * Defines all the possible enums for the current parameters.
         * @example "Space.WORLD"
         */
        enums?: string[];
    }[];
}

export abstract class IGraphNode {
    /**
     * The graph reference used to retrieve object etc.
     */
    graph?: LGraph;
    /**
     * Adds a new input to the node.
     * @param name the name of the input.
     * @param type the type of the input.
     */
    addInput? (name: string, type: string): void;
     /**
     * Adds a new output to the node.
     * @param name the name of the output.
     * @param type the type of the output.
     */
    addOutput? (name: string, type: string): void;
    /**
     * Returns the data of the given input index.
     * @param index the index of the input in inputs list.
     */
    getInputData? <T extends any>(index: number): T;
    /**
     * Sets the given data to the given output index.
     * @param index the index of the output to set its data.
     * @param data the data to set in the output.
     */
    setOutputData? (index: number, data: any): void;
    /**
     * Adds a new property to the .properties dictionary for the current node.
     * @param name the name of the property to store in the dictionary.
     * @param value the value of the property to store in the dictionary.
     */
    addProperty? (name: string, value: any): void;
    /**
     * Store of all available properties for the current node.
     */
    properties?: { [index: string]: any };
    /**
     * Defines the default shape of the node.
     */
    shape?: string = 'round';
    /**
     * Defines the current node position on (x,y).
     */
    pos?: number[] = [60, 20];
    /**
     * Defines the current size in pixels of the node.
     */
    size?: number[] = [60, 20];
    /**
     * Defines the current description of the node to be drawn in the node edition tool.
     */
    desc?: string;

    /**
     * Gets or sets wether of not if the node has been loaded and ready.
     */
    public static Loaded: boolean;

    /**
     * Registers the given node to the registered node types.
     * @param path the path of the node in context menu.
     * @param ctor the constructor of the node.
     */
    public static RegisterNode (path: string, ctor: (new (description: IGraphNodeDescriptor) => IGraphNode)): void {
        if (LiteGraph.registered_node_types[path])
            return;
        
        LiteGraph.registerNodeType(path, ctor);
    }
}
