import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class Log extends GraphNode<{ message: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Log");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Message", "");

        this.addProperty("message", "message", "string");
        this.addWidget("text", "message", this.properties.message, (v) => this.properties.message = v);

        this.addOutput("", LiteGraph.EVENT as any);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): Promise<void> {
        console.log(this.getInputData(1) ?? this.properties.message);
        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(value?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: `console.log(${value?.code ?? `"${this.properties.message}"`})`,
        };
    }
}
