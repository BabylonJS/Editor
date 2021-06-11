import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class TickGameEvent extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Tick Event");
        this.addOutput("", LiteGraph.EVENT as any);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): Promise<void> {
        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        const code = "{{generated__body}}";
        
        return {
            type: CodeGenerationOutputType.CallbackFunction,
            executionType: CodeGenerationExecutionType.Update,
            code,
        };
    }
}
