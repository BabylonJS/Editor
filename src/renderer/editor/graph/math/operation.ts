import { LiteGraph } from "litegraph.js";
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

export class Compare extends GraphNode<{ operator: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Compare");

        this.addProperty("operator", ">", "string");
        this.addWidget("combo", "operator", this.properties.operator, (v) => {
            this.properties.operator = v;
        }, {
            values: [">", "<", ">=", "<=", "===", "!=="],
        });

        this.addInput("a *", "number,string", { linkedOutput: "a" });
        this.addInput("b *", "number,string", { linkedOutput: "b" });

        this.addOutput("Bool", "boolean");
        this.addOutput("a", "string,number");
        this.addOutput("b", "string,number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const a = this.getInputData(0) as number;
        const b = this.getInputData(1) as number;

        switch (this.properties.operator) {
            case ">": this.setOutputData(0, a > b); break;
            case "<": this.setOutputData(0, a < b); break;
            case ">=": this.setOutputData(0, a >= b); break;
            case "<=": this.setOutputData(0, a <= b); break;
            case "===": this.setOutputData(0, a === b); break;
            case "!==": this.setOutputData(0, a !== b); break;
        }

        this.setOutputData(1, a);
        this.setOutputData(2, b);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput, b: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `${a.code} ${this.properties.operator} ${b.code}`,
        };
    }

    /**
     * Called each time the background is drawn.
     * @param ctx defines the rendering context of the canvas.
     * @override
     */
    public drawBackground(ctx: CanvasRenderingContext2D): void {
        super.drawBackground(ctx);

        ctx.font = "40px Arial";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText(this.properties.operator, this.size[0] * 0.5, (this.size[1] + LiteGraph.NODE_TITLE_HEIGHT) * 0.4);
        ctx.textAlign = "left";
    }
}
