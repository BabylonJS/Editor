import { Node } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class CallNodeFunction extends GraphNode<{ function: string; cast_as_any: boolean; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Call Node Function");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Node *", "Node", { linkedOutput: "Node" });
        this.addInput("Arg", "");

        this.addProperty("function", "myFn", "string");
        this.addProperty("cast_as_any", true, "boolean");

        this.addWidget("text", "function", this.properties.function, (v) => this.properties.function = v);
        this.addWidget("toggle", "cast_as_any", this.properties.cast_as_any, (v) => this.properties.cast_as_any = v);

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Node", "Node");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const node = this.getInputData<Node>(1);
        if (!node) { return; }

        if (node[this.properties.function]) {
            node[this.properties.function](this.getInputData(2));

            this.setOutputData(1, this.getInputData(1));
            return this.triggerSlot(0, null);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput, value?: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `${this.properties.cast_as_any ? `(${mesh.code} as any)` : mesh.code}.${this.properties.function}(${value?.code ?? ""});`;

        return {
            type: CodeGenerationOutputType.FunctionCall,
            code,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
            ],
        };
    }
}
