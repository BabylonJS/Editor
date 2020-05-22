import { CodeGenerationExecutionType, GraphNode, ICodeGenerationOutput } from "../node";

export interface IGlobalCodeGenerationOutput extends ICodeGenerationOutput {
    /**
     * Defines the id of the node that has been generated.
     */
    id: number;
}

export interface ICodeGenerationStack {
    /**
     * Defines the optional nodes array to convert into code.
     */
    nodes?: GraphNode[];
    /**
     * defines the optional list of all nodes that have been already visited.
     */
    visited?: IGlobalCodeGenerationOutput[];

    /**
     * Defines the parent node that is being converted. Typically for callback functions, helps to manage the stack.
     */
    node?: GraphNode;
    /**
     * Defines the stack node output.
     */
    nodeOutput?: IGlobalCodeGenerationOutput;
}

export interface ICodeGenerationStackOutput {
    /**
         * Defines the generated code.
         */
        code: string;
        /**
         * Defines the type of the execution.
         */
        type?: CodeGenerationExecutionType;
}

export interface ICodeGenerationStackFinalOutput {
    /**
     * Defines the list of all output code.
     */
    output: ICodeGenerationStackOutput[];
    /**
     * Defines all outputs of all nodes that have been converted.
     */
    nodeOutputs: IGlobalCodeGenerationOutput[];
    /**
     * In case of an error, contains the node that emitted the error and the associated message.
     */
    error?: {
        /**
         * Defines the node that emitted the error.
         */
        node: GraphNode;
        /**
         * Defines the error object.
         */
        error: Error;
    }
}

export interface ICodeGenerationFunctionProperties {
    /**
     * Defines the current stack of code generation.
     */
    stack: ICodeGenerationStack;
    /**
     * Defines the current node being converted.
     */
    node: GraphNode;
    /**
     * Defines the index of the node in the ordered nodes array.
     */
    nodeIndex: number;
    /**
     * Defines the already converted inputs for the current node.
     */
    inputs: IGlobalCodeGenerationOutput[];
    /**
     * Defines the generated code output of the current node.
     */
    previous: IGlobalCodeGenerationOutput;
    /**
     * Defines the current output being populated.
     */
    output: ICodeGenerationStackOutput[];
    /**
     * Defines the execution type of the node.
     */
    executionType: CodeGenerationExecutionType;
}
