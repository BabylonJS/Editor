import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class Mesh extends GraphNode<{ var_name: string; name: string; }> {
    /**
     * Defines the list of all avaialbe meshes in the scene.
     */
    public static Meshes: { name: string; type: string; }[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Mesh");

        this.addProperty("var_name", "aMesh", "string", (v) => this.properties.name = this.title = v);
        this.addProperty("name", "None", "string", (v) => this.properties.name = this.title = v);

        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
            this.title = `Mesh (${v})`;

            const mesh = Mesh.Meshes.find((m) => m.name === v);
            if (mesh) {
                this.outputs[0].type = `Node,TransformNode,AbstractMesh,${mesh.type}`;
                this.updateConnectedNodesFromOutput(0);
            }
        }, {
            values: () => Mesh.Meshes.map((m) => m.name),
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("Mesh", "Node,TransformNode,AbstractMesh");
        this.addOutput("Skeleton", "Skeleton");
        this.addOutput("Material", "Material");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getScene().getMeshByName(this.properties.name);
        this.setOutputData(0, mesh);
        this.setOutputData(1, mesh?.skeleton);
        this.setOutputData(2, mesh?.material);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        const type = this.outputs[0].type.split(",").pop()!;

        return {
            type: CodeGenerationOutputType.Variable,
            code: this.properties.var_name,
            executionType: CodeGenerationExecutionType.Properties,
            variable: {
                name: this.properties.var_name,
                type,
                value: `this._scene.getMeshByName("${this.properties.name}") as ${type}`,
            },
            outputsCode: [
                { thisVariable: true },
                { thisVariable: true, code: "skeleton" },
                { thisVariable: true, code: "material" },
            ],
            requires: [
                { module: "@babylonjs/core", classes: [type] },
            ],
        };
    }
}
