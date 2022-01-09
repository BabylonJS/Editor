import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class Number extends GraphNode<{ value: number; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Number");

        this.addProperty("value", 0, "number");
        this.addWidget("number", "value", this.properties.value, (v) => this.properties.value = v);

        this.addOutput("", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, this.properties.value);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: this.properties.value.toString(),
        };
    }
}

export class String extends GraphNode<{ value: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("String");

        this.addProperty("value", "value", "string");
        this.addWidget("text", "value", this.properties.value, (v) => this.properties.value = v);

        this.addOutput("", "string");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, this.properties.value);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `"${this.properties.value.toString()}"`,
        };
    }
}

export class Boolean extends GraphNode<{ value: boolean; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Boolean");

        this.addProperty("value", true, "boolean");
        this.addWidget("toggle", "value", this.properties.value, (v) => this.properties.value = v);

        this.addOutput("", "boolean");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, this.properties.value);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: this.properties.value.toString(),
        };
    }
}

export class Null extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Null");

        this.addOutput("", "");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            code: "null",
            type: CodeGenerationOutputType.Constant,
        };
    }
}

export class Undefined extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Undefined");

        this.addOutput("", "");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, undefined);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            code: "undefined",
            type: CodeGenerationOutputType.Constant,
        };
    }
}
