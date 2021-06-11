import { Nullable } from "../../../../shared/types";

import { ArcRotateCamera, FreeCamera } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class CameraCollisionEvent extends GraphNode {
    private _camera: Nullable<ArcRotateCamera | FreeCamera> = null;

    /**
     * Constructor.
     */
    public constructor() {
        super("Camera Collision Event");

        this.addInput("Camera *", "ArcRotateCamera,FreeCamera");

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Camera", "Camera");
        this.addOutput("Collided Mesh", "AbstractMesh");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const camera = this.getInputData<ArcRotateCamera>(0);
        
        this.setOutputData(1, camera);

        if (!this._camera) {
            this._camera = camera;
            camera.onCollide = ((other) => {
                this.setOutputData(2, other);
                this.triggerSlot(0, null);
            });
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(camera: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `
            ${camera.code}.onCollide = (collidedMesh) => {
                {{generated__body}}
            };
        `;
        
        return {
            type: CodeGenerationOutputType.CallbackFunction,
            executionType: CodeGenerationExecutionType.Start,
            code,
            outputsCode: [
                { code: undefined },
                { code: camera.code },
                { code: "collidedMesh" },
            ],
        };
    }
}
