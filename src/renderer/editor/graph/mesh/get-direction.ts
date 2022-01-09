import { AbstractMesh, Vector3 } from "babylonjs";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class GetMeshDirection extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Get Mesh Direction");

        this.addInput("Mesh *", "AbstractMesh", { linkedOutput: "Mesh" });
        this.addInput("Local Axis *", "Vector3");
        
        this.addOutput("Mesh", "Node,TransformNode,AbstractMesh");
        this.addOutput("Direction", "Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getInputData<AbstractMesh>(0);
        if (!mesh) { return; }

        const localAxis = this.getInputData<Vector3>(1);
        if (!localAxis) { return; }

        this.setOutputData(0, mesh);
        this.setOutputData(1, mesh.getDirection(this.getInputData(1)));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput, localAxis: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `${mesh.code}.getDirection(${localAxis.code})`;
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code,
            outputsCode: [
                { code: mesh.code },
                { code },
            ],
        };
    }
}
