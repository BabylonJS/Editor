import { GraphNode, ICodeGenerationOutput, CodeGenrationOutputType } from "../node";

export class Sinus extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Sinus");

        this.addInput("r", "number");
        this.addOutput("sin", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute(): void {
        this.setOutputData(0, Math.sin(this.getInputData(0)));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenrationOutputType.Constant,
            code: `Math.sin(${value.code})`,
        };
    }
}

export class Cosinus extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Cosinus");

        this.addInput("r", "number");
        this.addOutput("cos", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute(): void {
        this.setOutputData(0, Math.cos(this.getInputData(0)));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenrationOutputType.Constant,
            code: `Math.cos(${value.code})`,
        };
    }
}
