import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class StartGameEvent extends GraphNode {
    private _computedNodes: any[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Start Game");
        this.addOutput("", LiteGraph.EVENT as any);
    }

    /**
     * Called on the graph is being stopped.
     */
    public onStop(): void {
        super.onStop();
        this._computedNodes = [];
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): Promise<void> {
        const attachedNode = this.graph!["attachedNode"];
        if (this._computedNodes.indexOf(attachedNode) !== -1) {
            return Promise.resolve();
        }

        this._computedNodes.push(attachedNode);
        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        const code = "{{generated__body}}";
        
        return {
            type: CodeGenerationOutputType.CallbackFunction,
            executionType: CodeGenerationExecutionType.Start,
            code,
        };
    }
}
