import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class SetProperty extends GraphNode<{ path: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Set Property");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("object *", "");
        this.addInput("Value *", "");
        
        this.addProperty("path", "name", "string");
        this.addWidget("text", "path", this.properties.path, (v) => this.properties.path = this.title = v);

        this.addOutput("", LiteGraph.EVENT as any);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const node = this.getInputData(1);
        if (node) {
            node[this.properties.path] = this.getInputData(1, true);
            this.triggerSlot(0, null);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(object: ICodeGenerationOutput, value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: `${object.code}.${this.properties.path} = ${value.code}`,
        };
    }
}
