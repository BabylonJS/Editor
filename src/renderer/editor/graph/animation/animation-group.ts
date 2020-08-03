import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class AnimationGroup extends GraphNode<{ name: string; var_name: string; }> {
    /**
     * Defines the list of all avaialbe sounds in the scene.
     */
    public static Groups: string[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Animation Group");

        this.addProperty("name", "None", "string");
        this.addProperty("var_name", "myGroup", "string");

        this.addWidget("combo", "name", this.properties.name, (v) => this.properties.name = v, {
            values: () => AnimationGroup.Groups,
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("group", "AnimationGroup");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const group = this.getScene().getAnimationGroupByName(this.properties.name);
        this.setOutputData(0, group ?? null);
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
                value: `this._scene.getAnimationGroupByName("${this.properties.name.replace("\\", "\\\\")}")`,
            },
            outputsCode: [
                { code: `this.${this.properties.var_name}` },
            ],
        };
    }
}
