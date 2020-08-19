import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class Mesh extends GraphNode<{ var_name: string; name: string; }> {
    /**
     * Defines the list of all avaialbe meshes in the scene.
     */
    public static Meshes: string[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Mesh");

        this.addProperty("var_name", "aMesh", "string", (v) => this.properties.name = this.title = v);
        this.addProperty("name", "None", "string", (v) => this.properties.name = this.title = v);

        this.addWidget("combo", "name", this.properties.name, (v) => this.properties.name = v, {
            values: () => Mesh.Meshes,
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("mesh", "Node,TransformNode,AbstractMesh");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getScene().getMeshByName(this.properties.name);
        this.setOutputData(0, mesh);
    }

    /**
     * Draws the foreground of the node.
     */
    public onDrawForeground(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
        super.onDrawForeground(canvas, ctx);
        this.title = `${this.properties.name} (Mesh)`;
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
                value: `this._scene.getMeshByName("${this.properties.name}")`,
            },
            outputsCode: [
                { thisVariable: true },
            ],
        };
    }
}
