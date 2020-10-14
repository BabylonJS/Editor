import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class Debugger extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Debugger");
        this.addInput("", LiteGraph.EVENT as any);
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
        return {
            type: CodeGenerationOutputType.Function,
            code: "debugger;",
        };
    }
}

Object.defineProperty(Debugger.prototype, "hasBeakPoint", {
    get: () => true,
    set: () => { },
});
