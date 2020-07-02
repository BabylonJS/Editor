import { Vector2, Vector3 } from "babylonjs";
import { INodeOutputSlot } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class VectorSplitter extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Vector Splitter");

        this.addInput("vector *", "Vector2,Vector3");

        this.addOutput("x", "number");
        this.addOutput("y", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const vector = this.getInputData<Vector2 | Vector3>(0);

        this.setOutputData(0, vector.x);
        this.setOutputData(1, vector.y);

        if (vector instanceof Vector3) {
            this.setOutputData(2, vector.z);
        }
    }

    /**
     * Called on an input has been connected.
     * @param inputIndex defines the index of the input that has just been connected.
     * @param type defines the type of the 
     * @param outputSlot 
     */
    public onConnectInput(inputIndex: number, type: INodeOutputSlot["type"], outputSlot: INodeOutputSlot): boolean {
        switch (type) {
            case "Vector2":
                if (this.outputs.length === 3) { this.removeOutput(2); }
                break;
            case "Vector3":
                if (this.outputs.length === 2) { this.addOutput("z", "number"); }
                break;
        }

        return super.onConnectInput?.call(this, inputIndex, type, outputSlot);
    }

    /**
     * Called on the given slot is being disconnected.
     * @param slot defines the slot that is being disconnected.
     */
    public disconnectInput(slot: string | number): boolean {
        const value = super.disconnectInput(slot);

        if (this.outputs.length === 3) {
            this.removeOutput(2);
        }

        return value;
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(vector: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: vector.code,
            outputsCode: [
                { code: `${vector.code}.x` },
                { code: `${vector.code}.y` },
                { code: `${vector.code}.z` },
            ],
        };
    }
}