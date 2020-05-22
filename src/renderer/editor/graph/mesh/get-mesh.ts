import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class GetMesh extends GraphNode<{ name: string; }> {
    /**
     * Defines the list of all avaialbe meshes in the scene.
     */
    public static Meshes: string[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Get Mesh");

        this.addInput("Name", "string");

        this.addProperty("name", "None", "string", (v) => this.properties.name = this.title = v);
        this.addWidget("combo", "name", this.properties.name, (v) => this.properties.name = v, {
            values: () => GetMesh.Meshes,
        });

        this.addOutput("mesh", "Node,TransformNode,AbstractMesh");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getScene().getMeshByName(this.getInputData(0) ?? this.properties.name);
        this.setOutputData(0, mesh);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(name?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `this._scene.getMeshByName("${name?.code ?? this.properties.name}")`,
        };
    }
}
