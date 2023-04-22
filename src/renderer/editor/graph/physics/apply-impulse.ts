import { AbstractMesh, PhysicsEngine } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class ApplyImpulse extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Apply Impulse");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Mesh *", "AbstractMesh", { linkedOutput: "Mesh" });
        this.addInput("Force *", "Vector3");
        this.addInput("Contact Point *", "Vector3");

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Mesh", "Node,TransformNode,AbstractMesh");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const scene = this.getScene();

        const mesh = this.getInputData(1) as AbstractMesh;
        if (!mesh) { return; }

        mesh.physicsImpostor = (scene.getPhysicsEngine() as PhysicsEngine)?.getImpostorForPhysicsObject(mesh) ?? null;
        mesh.applyImpulse(this.getInputData(2), this.getInputData(3));

        this.setOutputData(1, mesh);
        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput, force: ICodeGenerationOutput, contactPoint: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `${mesh.code}.applyImpulse(${force.code}, ${contactPoint.code});`;

        return {
            type: CodeGenerationOutputType.FunctionCall,
            code,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
            ],
        };
    }
}
