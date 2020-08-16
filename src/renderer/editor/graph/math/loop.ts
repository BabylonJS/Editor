import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class ForLoop extends GraphNode<{ start: number; end: number; increment: number; }> {
    /**
     * Defines number of 
     */
    public static NodesCount: number = 0;

    /**
     * Constructor.
     */
    public constructor() {
        super("For Loop");

        this.addInput("", LiteGraph.EVENT as any);

        this.addProperty("start", 0, "number");
        this.addProperty("end", 32, "number");
        this.addProperty("increment", 1, "number");

        this.addWidget("number", "start" , this.properties.start, (v) => this.properties.start = v);
        this.addWidget("number", "end" , this.properties.end, (v) => this.properties.end = v);
        this.addWidget("number", "increment" , this.properties.increment, (v) => this.properties.increment = v);

        this.addOutput("", LiteGraph.EVENT as any)
        this.addOutput("Indice", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        for (let i = this.properties.start; i < this.properties.end; i += this.properties.increment) {
            this.setOutputData(1, i);
            await this.triggerSlot(0, null);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        const i = `i_${ForLoop.NodesCount}`;

        ForLoop.NodesCount++;

        const code = `for (let ${i} = ${this.properties.start}; ${i} < ${this.properties.end}; ${i} += ${this.properties.increment}) {
            {{generated__body}}
        }`;
        
        return {
            type: CodeGenerationOutputType.CallbackFunction,
            code,
            outputsCode: [
                { code: undefined },
                { code: i },
            ],
        };
    }
}
