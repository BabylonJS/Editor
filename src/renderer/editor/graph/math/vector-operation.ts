import { Vector2, Vector3 } from "babylonjs";
import { INodeOutputSlot } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class AddVectors extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Add Vectors");

        this.addInput("a *", "Vector2,Vector3");
        this.addInput("b *", "Vector2,Vector3");

        this.addOutput("", "Vector2,Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const a = this.getInputData(0) as Vector2 | Vector3;
        const b = this.getInputData(1) as Vector2 | Vector3;

        if (a instanceof Vector2 && b instanceof Vector2) {
            return this.setOutputData(0, a.add(b));
        }

        if (a instanceof Vector3 && b instanceof Vector3) {
            return this.setOutputData(0, a.add(b));
        }
    }

    /**
     * Called on an input has been connected.
     * @param inputIndex defines the index of the input that has just been connected.
     * @param type defines the type of the 
     * @param outputSlot 
     */
    public onConnectInput(inputIndex: number, type: INodeOutputSlot["type"], outputSlot: INodeOutputSlot): boolean {
        this.setOutputDataType(0, type);
        this.inputs[0].type = type;
        this.inputs[1].type = type;

        return super.onConnectInput?.call(this, inputIndex, type, outputSlot);
    }

    /**
     * Called on the given slot is being disconnected.
     * @param slot defines the slot that is being disconnected.
     */
    public disconnectInput(slot: string | number): boolean {
        const value = super.disconnectInput(slot);

        if (!this.isInputConnected(0) && !this.isInputConnected(1)) {
            this.setOutputDataType(0, "Vector2,Vector3");
            this.inputs[0].type = "Vector2,Vector3";
            this.inputs[1].type = "Vector2,Vector3";
        }

        return value;
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput, b: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `${a.code}.add(${b.code})`,
        };
    }
}

export class MultiplyVectors extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Multiply Vectors");

        this.addInput("a *", "Vector2,Vector3");
        this.addInput("b *", "Vector2,Vector3");

        this.addOutput("", "Vector2,Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const a = this.getInputData(0) as Vector2 | Vector3;
        const b = this.getInputData(1) as Vector2 | Vector3;

        if (a instanceof Vector2 && b instanceof Vector2) {
            return this.setOutputData(0, a.multiply(b));
        }

        if (a instanceof Vector3 && b instanceof Vector3) {
            return this.setOutputData(0, a.multiply(b));
        }
    }

    /**
     * Called on an input has been connected.
     * @param inputIndex defines the index of the input that has just been connected.
     * @param type defines the type of the 
     * @param outputSlot 
     */
    public onConnectInput(inputIndex: number, type: INodeOutputSlot["type"], outputSlot: INodeOutputSlot): boolean {
        this.setOutputDataType(0, type);
        this.inputs[0].type = type;
        this.inputs[1].type = type;

        return super.onConnectInput?.call(this, inputIndex, type, outputSlot);
    }

    /**
     * Called on the given slot is being disconnected.
     * @param slot defines the slot that is being disconnected.
     */
    public disconnectInput(slot: string | number): boolean {
        const value = super.disconnectInput(slot);

        if (!this.isInputConnected(0) && !this.isInputConnected(1)) {
            this.setOutputDataType(0, "Vector2,Vector3");
            this.inputs[0].type = "Vector2,Vector3";
            this.inputs[1].type = "Vector2,Vector3";
        }

        return value;
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput, b: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `${a.code}.multiply(${b.code})`,
        };
    }
}