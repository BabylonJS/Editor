import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class RequestPointerLock extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Request Pointer Lock");

        this.addInput("", LiteGraph.EVENT as any);
        this.addOutput("", LiteGraph.EVENT as any);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const engine = this.getScene().getEngine();
        if (!engine.isPointerLock) {
            engine.enterPointerlock();
        }

        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: `if (!this._scene.getEngine().isPointerLock) {
                this._scene.getEngine().enterPointerlock();
            }`,
        };
    }
}

export class ExitPointerLock extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Exit Pointer Lock");

        this.addInput("", LiteGraph.EVENT as any);
        this.addOutput("", LiteGraph.EVENT as any);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const engine = this.getScene().getEngine();
        if (engine.isPointerLock) {
            engine.exitPointerlock();
        }

        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: `if (this._scene.getEngine().isPointerLock) {
                this._scene.getEngine().exitPointerlock();
            }`,
        };
    }
}
