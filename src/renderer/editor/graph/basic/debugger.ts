import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class Debugger extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Debugger");
        this.addInput("", LiteGraph.EVENT as any);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        // Nothing to do at the moment.
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: "debugger;",
        };
    }
}
