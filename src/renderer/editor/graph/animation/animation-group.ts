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

        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
            this.title = `Animation Group (${v})`;
            this.size = this.computeSize();
        }, {
            values: () => AnimationGroup.Groups,
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("Group", "AnimationGroup");
        this.addOutput("From", "number");
        this.addOutput("To", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const group = this.getScene().getAnimationGroupByName(this.properties.name);

        this.setOutputData(0, group ?? null);
        this.setOutputData(1, group?.from);
        this.setOutputData(2, group?.to);
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
                type: "AnimationGroup",
                value: `this._scene.getAnimationGroupByName("${this.properties.name.replace("\\", "\\\\")}")`,
            },
            outputsCode: [
                { thisVariable: true },
                { thisVariable: true, code: "from" },
                { thisVariable: true, code: "to" },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["AnimationGroup"] },
            ],
        };
    }
}
