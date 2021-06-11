import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class GetProperty extends GraphNode<{ path: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Get Property");

        this.addProperty("path", "name", "string");
        this.addWidget("text", "path", this.properties.path, (v) => this.properties.path = this.title = v);
        
        this.addInput("Object *", "");
        this.addOutput("Value", "");
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
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(object: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `${object.code}.${this.properties.path}`,
        };
    }
}
