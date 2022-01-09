import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, INodeContextMenuOption } from "../node";

export class Equals extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Equals");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("a *", "");
        this.addInput("b *", "");

        this.addOutput("Is Equal", LiteGraph.EVENT as any);
        this.addOutput("Not Equal", LiteGraph.EVENT as any);
        this.addOutput("Bool", "boolean");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const equals = this.getInputData(1) === this.getInputData(2);
        
        this.setOutputData(2, equals);
        if (equals) {
            this.triggerSlot(0, null);
        } else {
            this.triggerSlot(1, null);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput, b: ICodeGenerationOutput): ICodeGenerationOutput {
        let code = `if (${a.code} === ${b.code}) {
                {{generated__equals__body}}
            }`;

        if (this.isOutputConnected(1)) {
            code += `else {
                    {{generated__not__equals__body}}
                }`;
        }
        
        return {
            type: CodeGenerationOutputType.Condition,
            code,
            outputsCode: [
                { code: undefined },
                { code: undefined },
                { code: `(${a.code} === ${b.code})` },
            ],
        };
    }
}

export class NotNull extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Not Null");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("object *", "");

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Bool", "boolean");
        this.addOutput("object", "");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const data = this.getInputData(1);
        const equals = data !== null;
        
        this.setOutputData(1, equals);
        this.setOutputData(2, data);

        if (equals) {
            return this.triggerSlot(0, null);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `if (${a.code} !== null) {
                {{generated__equals__body}}
            }`;
        
        return {
            type: CodeGenerationOutputType.Condition,
            code,
            outputsCode: [
                { code: undefined },
                { code: `(${a.code} !== null)` },
                { code: a.code },
            ],
        };
    }
}

export class NotUndefined extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Not Undefined");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("object *", "");
        
        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Bool", "boolean");
        this.addOutput("object", "");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const data = this.getInputData(1);
        const equals = data !== undefined;
        
        this.setOutputData(1, equals);
        this.setOutputData(2, data);

        if (equals) {
            return this.triggerSlot(0, null);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `if (${a.code} !== undefined) {
                {{generated__equals__body}}
            }`;
        
        return {
            type: CodeGenerationOutputType.Condition,
            code,
            outputsCode: [
                { code: undefined },
                { code: `(${a.code} !== undefined)` },
                { code: a.code },
            ],
        };
    }
}

export class NotNullOrUndefined extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Not Null Or Undefined");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("object *", "");

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Bool", "boolean");
        this.addOutput("object", "");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const data = this.getInputData(1);
        const equals = data !== null && data !== undefined;
        
        this.setOutputData(1, equals);
        this.setOutputData(2, data);

        if (equals) {
            return this.triggerSlot(0, null);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `if (${a.code} !== null && ${a.code} !== undefined) {
                {{generated__equals__body}}
            }`;
        
        return {
            type: CodeGenerationOutputType.Condition,
            code,
            outputsCode: [
                { code: undefined },
                { code: `(${a.code} !== null && ${a.code} !== undefined)` },
                { code: a.code },
            ],
        };
    }
}


export class NotNaN extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Not NaN");

        this.addInput("", LiteGraph.EVENT);
        this.addInput("Value *", "number");
        
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("Bool", "boolean");
        this.addOutput("Value", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const data = this.getInputData(1);
        const equals = !isNaN(data);
        
        this.setOutputData(1, equals);
        this.setOutputData(2, data);

        if (equals) {
            return this.triggerSlot(0, null);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `if (!isNaN(${a.code})) {
                {{generated__equals__body}}
            }`;
        
        return {
            type: CodeGenerationOutputType.Condition,
            code,
            outputsCode: [
                { code: undefined },
                { code: `(!isNaN(${a.code})` },
                { code: a.code },
            ],
        };
    }
}

export class IsTrue extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Is True");

        this.addInput("", LiteGraph.EVENT);
        this.addInput("Value *", "", { linkedOutput: "Value" });
        
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("Value", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const data = this.getInputData(1);
        
        this.setOutputData(1, data);

        if (data) {
            return this.triggerSlot(0, null);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `if (${a.code}) {
                {{generated__equals__body}}
            }`;
        
        return {
            type: CodeGenerationOutputType.Condition,
            code,
            outputsCode: [
                { code: undefined },
                { code: a.code },
            ],
        };
    }
}

export class And extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("And");

        this.addInput("a *", "");
        this.addInput("b *", "");

        this.addOutput("", "boolean");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        for (let i = 0; i < this.inputs.length; i++) {
            if (!this.getInputData(i)) {
                return this.setOutputData(0, false);
            }
        }

        this.setOutputData(0, true);
    }

    /**
     * Called on the node is right-clicked in the Graph Editor.
     * This is used to show extra options in the context menu.
     */
    public getContextMenuOptions(): INodeContextMenuOption[] {
        return [
            { label: "Add Input", onClick: () => {
                this.addInput(String.fromCharCode("a".charCodeAt(0) + this.inputs.length), "");
            } }
        ];
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(...args: ICodeGenerationOutput[]): ICodeGenerationOutput {
        const inputs = args.filter((a) => a);
        if (inputs.length < 2) {
            throw new Error("And node needs at least 2 elements to compare.");
        }

        const code = `(${inputs.map((a) => a.code).join(" && ")})`;
        
        return {
            type: CodeGenerationOutputType.Constant,
            code,
        };
    }
}

export class Or extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Or");

        this.addInput("a *", "");
        this.addInput("b *", "");

        this.addOutput("", "boolean");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        for (let i = 0; i < this.inputs.length; i++) {
            if (this.getInputData(i)) {
                return this.setOutputData(0, true);
            }
        }

        this.setOutputData(0, false);
    }

    /**
     * Called on the node is right-clicked in the Graph Editor.
     * This is used to show extra options in the context menu.
     */
    public getContextMenuOptions(): INodeContextMenuOption[] {
        return [
            { label: "Add Input", onClick: () => {
                this.addInput(String.fromCharCode("a".charCodeAt(0) + this.inputs.length), "");
            } }
        ];
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(...args: ICodeGenerationOutput[]): ICodeGenerationOutput {
        const inputs = args.filter((a) => a);
        if (inputs.length < 2) {
            throw new Error("Or node needs at least 2 elements to compare.");
        }

        const code = `(${inputs.map((a) => a.code).join(" || ")})`;
        
        return {
            type: CodeGenerationOutputType.Constant,
            code,
        };
    }
}

export class Not extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Not");

        this.addInput("a", "");
        this.addOutput("", "boolean");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, !this.getInputData(0));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `!(${a.code})`;
        
        return {
            type: CodeGenerationOutputType.Constant,
            code,
        };
    }
}
