import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class Sinus extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Sinus");

        this.addInput("r *", "number");
        this.addOutput("sin", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, Math.sin(this.getInputData(0)));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
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

        this.addInput("r *", "number");
        this.addOutput("cos", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, Math.cos(this.getInputData(0)));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `Math.cos(${value.code})`,
        };
    }
}

export class Tangent extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Tangent");

        this.addInput("r *", "number");
        this.addOutput("tan", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, Math.tan(this.getInputData(0)));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `Math.tan(${value.code})`,
        };
    }
}
