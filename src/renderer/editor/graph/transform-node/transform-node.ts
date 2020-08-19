import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class TransformNode extends GraphNode<{ var_name: string; name: string; }> {
    /**
     * Defines the list of all avaialbe meshes in the scene.
     */
    public static TransformNodes: string[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Transform Node");

        this.addProperty("var_name", "aMesh", "string", (v) => this.properties.name = this.title = v);
        this.addProperty("name", "None", "string", (v) => this.properties.name = this.title = v);

        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
            this.title = `Transform Node (${v})`;
        }, {
            values: () => TransformNode.TransformNodes,
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("Transform Node", "Node,TransformNode");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getScene().getTransformNodeByName(this.properties.name);
        this.setOutputData(0, mesh);
    }

    /**
     * Draws the foreground of the node.
     */
    public onDrawForeground(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
        super.onDrawForeground(canvas, ctx);
        this.title = `${this.properties.name} (Transform Node)`;
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
                value: `this._scene.getTransformNodeByName("${this.properties.name}")`,
            },
        };
    }
}
