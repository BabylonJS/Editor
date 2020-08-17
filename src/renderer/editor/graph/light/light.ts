import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class Light extends GraphNode<{ name: string; var_name: string; }> {
    /**
     * Defines the list of all avaialbe sounds in the scene.
     */
    public static Lights: string[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Light");

        this.addProperty("name", "None", "string");
        this.addProperty("var_name", "myLight", "string");

        this.addWidget("combo", "name", this.properties.name, (v) => this.properties.name = v, {
            values: () => Light.Lights,
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("Light", "Node,Light");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const light = this.getScene().getLightByName(this.properties.name);
        this.setOutputData(0, light ?? null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Variable,
            code: this.properties.var_name,
            executionType: CodeGenerationExecutionType.Properties,
            variable: {
                name: this.properties.var_name,
                value: `this._scene.getLightByName("${this.properties.name.replace("\\", "\\\\")}")`,
            },
            outputsCode: [
                { code: `this.${this.properties.var_name}` },
            ],
        };
    }
}
