import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class DispatchWindowEvent extends GraphNode<{ eventName: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Dispatch Window Event");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Data", "");

        this.addProperty("eventName", "myEvent", "string");
        this.addWidget("text", "eventName", this.properties.eventName, (v) => this.properties.eventName = v);

        this.addOutput("", LiteGraph.EVENT as any);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): Promise<void> {
        const data = this.getInputData<any>(1);
        window.dispatchEvent(new CustomEvent(this.properties.eventName, { detail: data }));

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(data?: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `window.dispatchEvent(new CustomEvent("${this.properties.eventName}", { detail: ${data?.code ?? "undefined"} }))`;
        
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code,
        };
    }
}
