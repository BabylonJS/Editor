import { LiteGraph } from "litegraph.js";
import { AbstractMesh, Vector3 } from "babylonjs";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class MoveWithCollisions extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Move With Collisions");

        this.addInput("", LiteGraph.EVENT);
        this.addInput("Mesh *", "AbstractMesh", { linkedOutput: "Mesh" });
        this.addInput("Axis *", "Vector3");

        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("Mesh", "AbstractMesh");
        this.addOutput("Position", "Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const mesh = this.getInputData<AbstractMesh>(1);
        if (!mesh) { return; }
        
		const axis = this.getInputData<Vector3>(2);
		if (!axis) { return; }

		mesh.moveWithCollisions(axis);

        this.setOutputData(1, mesh);
        this.setOutputData(2, mesh.position);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput, axis: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code: `${mesh.code}.moveWithCollisions(${axis.code})`,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
                { code: `${mesh.code}.position` },
            ],
        };
    }
}
