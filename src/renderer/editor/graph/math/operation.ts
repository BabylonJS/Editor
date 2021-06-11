import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class Add extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Add");

        this.addInput("a *", "number");
        this.addInput("b *", "number");

        this.addOutput("", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const a = this.getInputData(0) as number;
        const b = this.getInputData(1) as number;
        this.setOutputData(0, a + b);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput, b: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `(${a.code} + ${b.code})`,
        };
    }
}

export class Subtract extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Subtract");

        this.addInput("a *", "number");
        this.addInput("b *", "number");

        this.addOutput("", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const a = this.getInputData(0) as number;
        const b = this.getInputData(1) as number;
        this.setOutputData(0, a - b);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput, b: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `(${a.code} - ${b.code})`,
        };
    }
}

export class Multiply extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Multiply");

        this.addInput("a *", "number");
        this.addInput("b *", "number");

        this.addOutput("", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const a = this.getInputData(0) as number;
        const b = this.getInputData(1) as number;
        this.setOutputData(0, a * b);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput, b: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `(${a.code} * ${b.code})`,
        };
    }
}

export class Divide extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Divide");

        this.addInput("a *", "number");
        this.addInput("b *", "number");

        this.addOutput("", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const a = this.getInputData(0) as number;
        const b = this.getInputData(1) as number;
        this.setOutputData(0, a / b);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput, b: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `(${a.code} / ${b.code})`,
        };
    }
}
