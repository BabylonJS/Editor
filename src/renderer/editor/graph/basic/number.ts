import { GraphNode, ICodeGenerationOutput, CodeGenrationOutputType } from "../node";

export class Number extends GraphNode<
    { value: number; }
> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Number");

        this.addProperty("value", 0, "number");

        this.addOutput("", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute(): void {
        this.setOutputData(0, this.properties.value);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenrationOutputType.Constant,
            code: this.properties.value.toString(),
        };
    }
}
