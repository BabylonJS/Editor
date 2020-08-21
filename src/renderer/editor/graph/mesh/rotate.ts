import { AbstractMesh, Space } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class RotateMesh extends GraphNode<{ amount: number; space: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Rotate");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Mesh *", "AbstractMesh", { linkedOutput: "Mesh" });
        this.addInput("Axis *", "Vector3");
        this.addInput("Amount", "number");

        this.addProperty("space", "LOCAL", "string");
        this.addProperty("amount", 0, "number");

        this.addWidget("combo", "space", this.properties.space, (v) => this.properties.space = v, {
            values: ["LOCAL", "WORLD", "BONE"],
        });
        this.addWidget("number", "amount", this.properties.amount, (v) => this.properties.amount = v);

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Mesh", "Node,TransformNode,AbstractMesh");
        this.addOutput("Rotation", "Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const mesh = this.getInputData(1) as AbstractMesh;
        if (!mesh) { return; }

        mesh.rotate(
            this.getInputData(2),
            this.getInputData(3) ?? this.properties.amount,
            Space[this.properties.space],
        );

        this.setOutputData(1, mesh);
        this.setOutputData(2, mesh.rotation);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput, axis: ICodeGenerationOutput, amount?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: `${mesh.code}.rotate(${axis.code}, ${amount?.code ?? this.properties.amount.toString()}, Space.${this.properties.space})`,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
                { code: `${mesh.code}.rotation` },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["Space"] },
            ],
        };
    }
}
