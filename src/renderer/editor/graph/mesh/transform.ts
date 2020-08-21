import { AbstractMesh } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class TransformMesh extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Mesh Transform");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Mesh *", "AbstractMesh", { linkedOutput: "Mesh" });
        this.addInput("Position", "Vector3");
        this.addInput("Rotation", "Vector3");
        this.addInput("Scaling", "Vector3");
        this.addInput("Rotation Quaternion", "Quaternion");
        
        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Mesh", "Node,TransformNode,AbstractMesh");
        this.addOutput("Position", "Vector3");
        this.addOutput("Rotation", "Vector3");
        this.addOutput("Scaling", "Vector3");
        this.addOutput("Rotation Quaternion", "Quaternion");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const mesh = this.getInputData(1) as AbstractMesh;
        if (!mesh) { return; }

        mesh.position = this.getInputData(2) ?? mesh.position;
        mesh.rotation = this.getInputData(3) ?? mesh.rotation;
        mesh.scaling = this.getInputData(4) ?? mesh.scaling;
        mesh.rotationQuaternion = this.getInputData(5) ?? mesh.rotationQuaternion;

        this.setOutputData(1, mesh);
        this.setOutputData(2, mesh.position);
        this.setOutputData(3, mesh.rotation);
        this.setOutputData(4, mesh.scaling);
        this.setOutputData(5, mesh.rotationQuaternion);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(
        mesh: ICodeGenerationOutput, position?: ICodeGenerationOutput,
        rotation?: ICodeGenerationOutput, scaling?: ICodeGenerationOutput,
        quaternion?: ICodeGenerationOutput,
    ): ICodeGenerationOutput {
        const code = `${position ? `\n${mesh.code}.position = ${position.code}` : ""}${rotation ? `\n${mesh.code}.rotation = ${rotation.code}` : ""}${scaling ? `\n${mesh.code}.scaling = ${scaling.code}` : ""}${quaternion ? `\n${mesh.code}.rotationQuaternion = ${quaternion.code}` : ""}`;

        return {
            type: CodeGenerationOutputType.Function,
            code,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
                { code: `${mesh.code}.position` },
                { code: `${mesh.code}.rotation` },
                { code: `${mesh.code}.scaling` },
                { code: `${mesh.code}.rotationQuaternion` },
            ],
        };
    }
}
