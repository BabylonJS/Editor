import { AbstractMesh, Space } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class Translate extends GraphNode<{ distance: number; space: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Translate");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Mesh *", "AbstractMesh");
        this.addInput("Axis *", "Vector3");
        this.addInput("Amount", "number");

        this.addProperty("space", "LOCAL", "string");
        this.addProperty("distance", 0, "number");

        this.addWidget("combo", "space", this.properties.space, (v) => this.properties.space = v, {
            values: ["LOCAL", "WORLD", "BONE"],
        });
        this.addWidget("number", "distance", this.properties.distance, (v) => this.properties.distance = v);

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("mesh", "Node,TransformNode,AbstractMesh");
        this.addOutput("position", "Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getInputData(1) as AbstractMesh;
        mesh.translate(
            this.getInputData(2),
            this.getInputData(3) ?? this.properties.distance,
            Space[this.properties.space],
        );

        this.setOutputData(1, mesh);
        this.setOutputData(2, mesh.position);

        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput, axis: ICodeGenerationOutput, amount?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: `${mesh.code}.translate(${axis.code}, ${amount?.code ?? this.properties.distance.toString()}, Space.${this.properties.space})`,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
                { code: `${mesh.code}.position` },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["Space"] },
            ],
        };
    }
}
