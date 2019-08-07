import { LGraph, LiteGraph } from 'litegraph.js';
import { Vector2, Vector3, Vector4 } from 'babylonjs';

/**
 * Defines all possible inputs and outputs types.
 */
export type InputOutputType = 'number' | 'string' | 'vec2' | 'vec3' | 'vec4' | string;
/**
 * Defines all possibile types for nodes.
 */
export type SupportedTypes = number | string | boolean | Vector2 | Vector3 | Vector4;

/**
 * Defines the type of the function to call on a GraphNode.
 */
export type GraphMethodCallType = (...args: any[]) => any;

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
        /**
         * Optional property path used to set the given property.
         */
        propertyPath?: string;
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
        /**
         * If outputs a property of the object, defines its path.
         */
        propertyPath?: string;
        /**
         * Defines the name of the property to output
         * @see .properties in IGraphNodeDescriptor
         */
        propertyName?: string;
        /**
         * Defines the input name where to retrieve the data to output.
         */
        inputName?: string;
    }[];
    /**
     * The name of the function to call on the current object being used.
     * @see myGraphNode.graph.scriptObject;
     */
    functionRef?: string | ((node: IGraphNode, target: any) => any);
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
         * The name of the property.
         */
        name: string;
        /**
         * Defines the type of the property.
         */
        type: InputOutputType;
        /**
         * Defines all the possible enums for the current parameters.
         * @example "Space.WORLD"
         */
        enums?: string[];
        /**
         * Defines the target where to take the appropriate value of the enum.
         * If not, provided, enums will work as string only.
         */
        enumsTarget?: any;
        /**
         * Defines the defualt value of the property.
         */
        defaultValue: SupportedTypes;
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
     * Removes an input from the node at the given index.
     * @param index the index of the input to remove.
     */
    removeInput? (index: number): void;
     /**
     * Adds a new output to the node.
     * @param name the name of the output.
     * @param type the type of the output.
     */
    addOutput? (name: string, type: string): void;
    /**
     * Removes an output from the node at the given index.
     * @param index the index of the output to remove.
     */
    removeOutput? (index: number): void;
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
     * Triggers the given slot to activate the connected node(s).
     * @param index the index of the slot to trigger in the current node.
     */
    triggerSlot? (index: number): void;
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
     * Defines the current mode of the node. Can be:
     * - LiteGraph.NEVER: never executed.
     * - LiteGraph.ON_TRIGGER: only when an input is triggered.
     * - LiteGraph.ALWAYS: will always be executed.
     */
    mode?: number;
    /**
     * Defines the current color of the node in hexadecimal string. (titlebar)
     */
    color?: string;
    /**
     * Defines the current background color of the node in hexadecimal string. (background)
     */
    bgColor?: string;

    /**
     * Defines the store used to keep some temporary variables.
     */
    store: { [index: string]: any } = { };

    /**
     * On connections changed for this node, change its mode according to the new connections.
     * @param type input (1) or output (2).
     * @param slot the slot which has been modified.
     * @param added if the connection is newly added.
     * @param link the link object informations.
     * @param input the input object to check its type etc.
     */
    public onConnectionsChange (type: number, slot: number, added: boolean, link: any, input: any): void {
        if (!IGraphNode.Loaded)
            return;
        
        if (this.mode === LiteGraph.NEVER)
            return;
        
        if (type === LiteGraph.INPUT && slot === 0) {
            if (added && input.type === LiteGraph.EVENT)
                this.mode = LiteGraph.ON_TRIGGER;
            else
                this.mode = LiteGraph.ALWAYS;
        }

        IGraphNode.SetColor(this);
    }

    /**
     * Sets the node's color according to its mode.
     * @param node the node to configure its color according to its current mode.
     * @see .mode
     */
    public static SetColor (node: IGraphNode): void {
        switch (node.mode) {
            case LiteGraph.ALWAYS: node.color = '#333'; node.bgColor = '#AAA'; break;
            case LiteGraph.ON_EVENT: node.color = '#55A'; node.bgColor = '#44A'; break;
            case LiteGraph.ON_TRIGGER: node.color = '#5A5'; node.bgColor = '#4A4'; break;
            case LiteGraph.NEVER: node.color = '#A55'; node.bgColor = '#A44'; break;
            default: break;
        }
    }

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
