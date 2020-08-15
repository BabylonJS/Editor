import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class Debugger extends GraphNode {
    public get hasBeakPoint(): boolean { return true; }
    public set hasBeakPoint(v: boolean) { v; }

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
    public execute(): void {
        this.triggerSlot(0, null);
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
