import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class GetProperty extends GraphNode<{ path: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Get Property");

        this.addProperty("path", "name", "string");
        this.addWidget("text", "path", this.properties.path, (v) => this.properties.path = this.title = v);
        
        this.addInput("Object *", "", { linkedOutput: "Object" });

        this.addOutput("Value", "");
        this.addOutput("Object", "");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.title = this.properties.path;

        const target = this.getInputData(0);
        if (target) {
            this.setOutputData(0, target[this.properties.path] ?? null);
        }

        this.setOutputData(1, target);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(object: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `${object.code}.${this.properties.path}`;

        return {
            code,
            type: CodeGenerationOutputType.Constant,
            outputsCode: [
                { code },
                { code: object.code },
            ],
        };
    }
}
