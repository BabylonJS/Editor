import { AbstractMesh } from "babylonjs";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class AbsoluteTransformMesh extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Absolute Transform");

        this.addInput("Mesh *", "AbstractMesh");
        
        this.addOutput("Mesh", "Node,TransformNode,AbstractMesh");
        this.addOutput("Position", "Vector3");
        this.addOutput("Rotation", "Quaternion");
        this.addOutput("Scaling", "Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getInputData(0) as AbstractMesh;
        if (!mesh) { return; }

        this.setOutputData(0, mesh);
        this.setOutputData(1, mesh.absolutePosition);
        this.setOutputData(2, mesh.absoluteRotationQuaternion);
        this.setOutputData(3, mesh.absoluteScaling);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: mesh.code,
            outputsCode: [
                { code: mesh.code },
                { code: `${mesh.code}.absolutePosition` },
                { code: `${mesh.code}.absoluteRotationQuaternion` },
                { code: `${mesh.code}.absoluteScaling` },
            ],
        };
    }
}
