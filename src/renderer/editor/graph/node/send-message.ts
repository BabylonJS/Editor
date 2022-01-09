import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class SendNodeMessage extends GraphNode<{ message: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Send Message To Node");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Node *", "Node", { linkedOutput: "Node" });
        this.addInput("Data", "");

        this.addProperty("message", "myMessage", "string");
        this.addWidget("text", "message", this.properties.message, (v) => this.properties.message = v);
        
        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Node", "Node");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const node = this.getInputData<Node>(1);
        if (!node) { return; }

        (node as any).onMessage?.call(node, this.properties.message, this.getInputData(2) ?? null, this);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(node: ICodeGenerationOutput, data?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code: `(${node.code} as any).onMessage?.call(${node.code}, "${this.properties.message}", ${data?.code ?? "null"}, this)`,
            outputsCode: [
                { code: undefined },
                { code: node.code },
            ],
        };
    }
}
