import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export const lightInheritance: Record<string, string> = {
    "Light": "Node,Light",
    "ShadowLight": "Node,Light,ShadowLight",
    "SpotLight": "Node,Light,ShadowLight,SpotLight",
    "HemisphericLight": "Node,Light,HemisphericLight",
    "PointLight": "Node,Light,ShadowLight,PointLight",
    "DirectionalLight": "Node,Light,ShadowLight,DirectionalLight",
};

export class Light extends GraphNode<{ name: string; var_name: string; }> {
    /**
     * Defines the list of all avaialbe sounds in the scene.
     */
    public static Lights: { name: string; type: string; }[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Light");

        this.addProperty("name", "Self", "string");
        this.addProperty("var_name", "myLight", "string");

        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
            this.title = `Light (${v})`;
            this.size = this.computeSize();

            if (v === "Self") {
                this.outputs[0].type = "Node,Light,ShadowLight,DirectionalLight,PointLight,HemisphericLight,SpotLight";
            } else {
                const light = Light.Lights.find((m) => m.name === v);
                if (light) {
                    this.outputs[0].type = lightInheritance[light.type];
                }
            }

            this.updateConnectedNodesFromOutput(0);
        }, {
            values: () => ["Self"].concat(Light.Lights.map((l) => l.name)),
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("Light", "Node,Light");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const light = this.properties.name === "Self" ? this.graph!["attachedNode"] : this.getScene().getLightByName(this.properties.name);
        this.setOutputData(0, light ?? null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        if (this.properties.name === "Self") {
            return {
                type: CodeGenerationOutputType.Constant,
                code: "this._attachedObject",
                outputsCode: [
                    { code: "this._attachedObject" },
                ],
            };
        }

        return {
            type: CodeGenerationOutputType.Variable,
            code: this.properties.var_name,
            executionType: CodeGenerationExecutionType.Properties,
            variable: {
                name: this.properties.var_name,
                type: "Light",
                value: `this._scene.getLightByName("${this.properties.name.replace("\\", "\\\\")}")`,
            },
            outputsCode: [
                { thisVariable: true },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["Light"] },
            ],
        };
    }
}
