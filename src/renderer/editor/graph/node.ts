import { LGraphNode } from "litegraph.js";

import { Tools } from "../tools/tools";

export enum CodeGenrationOutputType {
    Constant = 0,
    Variable,
    Function,
}

export interface ICodeGenerationOutput {
    /**
     * Defines the type of the output.
     */
    type: CodeGenrationOutputType;
    /**
     * Defines the generated code as string.
     */
    code: string;
    /**
     * In case of a variable, this contains the name of the variable that is being generated an its value.
     */
    variable?: {
        /**
         * Defines the name of the variable.
         */
        name: string;
        /**
         * Defines the default value of the variable.
         */
        value: string;
    }
}

export abstract class GraphNode<TProperties = Record<string, any>> extends LGraphNode {
    /**
     * Defines all the available properties of the node.
     */
    public properties: TProperties;

    /**
     * Defines the id of the node to be used internally.
     */
    public readonly internalId: string = Tools.RandomId();

    /**
     * Constructor.
     * @param title defines the title of the node.
     */
    public constructor(title?: string) {
        super(title);
    }

    /**
     * Called on the node is being executed.
     */
    public abstract onExecute(): void;

    /**
     * Generates the code of the node.
     * @param parent defines the parent node that has been generated.
     */
    public abstract generateCode(...inputs: ICodeGenerationOutput[]): ICodeGenerationOutput;
}
