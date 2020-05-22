import { Camera } from "babylonjs";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class GetCameraDirection extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Get Camera Direction");

        this.addInput("Camera *", "Camera");
        this.addInput("Local Axis *", "Vector3");
        
        this.addOutput("Camera", "Node,Camera");
        this.addOutput("Direction", "Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const camera = this.getInputData(0) as Camera;

        this.setOutputData(0, camera);
        this.setOutputData(1, camera.getDirection(this.getInputData(1)));

        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(camera: ICodeGenerationOutput, localAxis: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `${camera.code}.getDirection(${localAxis.code})`;
        return {
            type: CodeGenerationOutputType.Constant,
            code,
            outputsCode: [
                { code: camera.code },
                { code },
            ],
        };
    }
}
