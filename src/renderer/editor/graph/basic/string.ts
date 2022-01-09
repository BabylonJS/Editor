import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class StringCase extends GraphNode<{ case: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("String Case");

		this.addProperty("case", "lowerCase", "string");
		this.addWidget("combo", "case", this.properties.case, (v) => {
            this.properties.case = v;
        }, {
            values: ["lowerCase", "upperCase"],
        });

		this.addInput("String *", "string");
        this.addOutput("", "string");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
		const input = this.getInputData<string>(0);

		switch (this.properties.case) {
			case "lowerCase": this.setOutputData(0, input?.toLowerCase()); break;
			case "upperCase": this.setOutputData(0, input?.toUpperCase()); break;
		}
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(str: ICodeGenerationOutput): ICodeGenerationOutput {
		let fn: string = "lowerCase";
		switch (this.properties.case) {
			case "lowerCase": fn = "toLowerCase"; break;
			case "upperCase": fn = "toUpperCase"; break;
		}

        return {
            code: `${str.code}.${fn}()`,
            type: CodeGenerationOutputType.Constant,
        };
    }
}

export class StringConcat extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("String Concat");

		this.addInput("a *", "string");
		this.addInput("b *", "string,number,boolean");

        this.addOutput("", "string");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
		const a = this.getInputData<string>(0);
		const b = this.getInputData<string>(1);

		if (!a || !b) { return; }

		this.setOutputData(0, a + b);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput, b: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            code: `(${a.code} + ${b.code})`,
            type: CodeGenerationOutputType.Constant,
        };
    }
}
