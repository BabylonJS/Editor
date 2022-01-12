import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class Sound extends GraphNode<{ name: string; var_name: string; }> {
    /**
     * Defines the list of all avaialbe sounds in the scene.
     */
    public static Sounds: string[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Sound");

        this.addProperty("name", "None", "string");
        this.addProperty("var_name", "mySound", "string");

        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
            this.title = `Sound (${v})`;
            this.size = this.computeSize();
        }, {
            values: () => Sound.Sounds,
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("Sound", "Sound");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const sound = this.getScene().getSoundByName(this.properties.name);
        this.setOutputData(0, sound ?? null);
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
                type: "Sound",
                value: `this._scene.getSoundByName("${this.properties.name.replace("\\", "\\\\")}")`,
            },
            outputsCode: [
                { thisVariable: true },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["Sound"] },
            ],
        };
    }
}
