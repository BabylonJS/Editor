import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class GetCamera extends GraphNode<{ name: string; }> {
    /**
     * Defines the list of all avaialbe cameras in the scene.
     */
    public static Cameras: string[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Get Camera");

        this.addInput("Name", "string");

        this.addProperty("name", "None", "string", (v) => {
            this.properties.name = this.title = v;
        });
        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
            this.title = `Get Camera (${v})`;
            this.size = this.computeSize();
        }, {
            values: () => GetCamera.Cameras,
        });

        this.addOutput("Camera", "Node,Camera");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const camera = this.getScene().getCameraByName(this.getInputData(0) ?? this.properties.name);
        this.setOutputData(0, camera);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(name?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `this._scene.getCameraByName("${name?.code ?? this.properties.name}")`,
        };
    }
}
