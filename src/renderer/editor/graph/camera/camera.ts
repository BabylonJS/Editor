import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export const cameraInheritance: Record<string, string> = {
    "Camera": "Node,Camera",
    "TargetCamera": "Node,Camera,TargetCamera",
    "FreeCamera": "Node,Camera,TargetCamera,FreeCamera",
    "TouchCamera": "Node,Camera,TargetCamera,FreeCamera,TouchCamera",
    "UniversalCamera": "Node,Camera,TargetCamera,FreeCamera,TouchCamera,UniversalCamera",
};

export class Camera extends GraphNode<{ var_name: string; name: string; }> {
    /**
     * Defines the list of all avaialbe cameras in the scene.
     */
    public static Cameras: { name: string; type: string; }[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Camera");

        this.addProperty("var_name", "aMesh", "string", (v) => this.properties.name = this.title = v);
        this.addProperty("name", "Self", "string", (v) => this.properties.name = this.title = v);

        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
            this.title = `Camera (${v})`;
            this.size = this.computeSize();

            if (v === "Self") {
                this.outputs[0].type = `Node,Camera,TargetCamera,FreeCamera,TouchCamera,UniversalCamera`;
            } else {
                const camera = Camera.Cameras.find((m) => m.name === v);
                if (camera) {
                    this.outputs[0].type = cameraInheritance[camera.type];
                }
            }

            this.updateConnectedNodesFromOutput(0);
        }, {
            values: () => ["Self"].concat(Camera.Cameras.map((m) => m.name)),
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("Camera", "Node,Camera");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const camera = this.properties.name === "Self" ? this.graph!["attachedNode"] : this.getScene().getCameraByName(this.properties.name);
        this.setOutputData(0, camera);
    }

    /**
     * Draws the foreground of the node.
     */
    public onDrawForeground(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
        super.onDrawForeground(canvas, ctx);
        this.title = `${this.properties.name} (Camera)`;
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
                type: "Camera",
                value: `this._scene.getCameraByName("${this.properties.name}")`,
            },
            outputsCode: [
                { thisVariable: true },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["Camera"] },
            ],
        };
    }
}
