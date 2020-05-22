import { Camera } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class TransformCamera extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Camera Transform");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Camera *", "Camera");
        this.addInput("Position", "Vector3");
        
        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Camera", "Node,Camera");
        this.addOutput("Position", "Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const camera = this.getInputData(1) as Camera;
        camera.position = this.getInputData(2) ?? camera.position;

        this.setOutputData(1, camera);
        this.setOutputData(2, camera.position);

        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(camera: ICodeGenerationOutput, position?: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `${position ? `\n${camera.code}.position = ${position.code}` : ""}`;

        return {
            type: CodeGenerationOutputType.Function,
            code,
            outputsCode: [
                { code: undefined },
                { code: camera.code },
                { code: `${camera.code}.position` },
            ],
        };
    }
}
