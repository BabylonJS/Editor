import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class Random extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Random");

        this.addOutput("", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, Math.random());
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `Math.random()`,
        };
    }
}