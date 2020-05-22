import { AbstractMesh } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class ApplyImpulse extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Apply Impulse");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Mesh *", "AbstractMesh");
        this.addInput("Force *", "Vector3");
        this.addInput("Contact Point *", "Vector3");

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("mesh", "Node,TransformNode,AbstractMesh");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const scene = this.getScene();

        const mesh = this.getInputData(1) as AbstractMesh;
        mesh.physicsImpostor = scene.getPhysicsEngine()?.getImpostorForPhysicsObject(mesh) ?? null;
        mesh.applyImpulse(this.getInputData(2), this.getInputData(3));

        this.setOutputData(1, mesh);
        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput, force: ICodeGenerationOutput, contactPoint: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `${mesh.code}.applyImpulse(${force.code}, ${contactPoint.code});`;

        return {
            type: CodeGenerationOutputType.Function,
            code,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
            ],
        };
    }
}
