import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class Texture extends GraphNode<{ name: string; var_name: string; }> {
    /**
     * Defines the list of all avaialbe textures in the scene.
     */
    public static Textures: { name: string; base64: string; }[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Texture");

        this.addProperty("name", "None", "string");
        this.addProperty("var_name", "myTexture", "string");

        this.addWidget("combo", "name", this.properties.name, (v) => this.properties.name = v, {
            values: () => Texture.Textures.map((t) => t.name),
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("Texture", "BaseTexture,Texture");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const texture = this.getScene().textures.find((texture) => texture.metadata?.editorName === this.properties.name);
        this.setOutputData(0, texture ?? null);
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
                value: `this._scene.textures.find((texture) => texture.metadata?.editorName === "${this.properties.name.replace("\\", "\\\\")}") as Texture`,
            },
            outputsCode: [
                { thisVariable: true },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["Texture"] }
            ]
        };
    }
}
