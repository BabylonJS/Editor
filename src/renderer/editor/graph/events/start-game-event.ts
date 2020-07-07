import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class StartGameEvent extends GraphNode {
    private _started: boolean = false;

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
        this._started = false;
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        if (!this._started) {
            this._started = true;
            setTimeout(() => this.triggerSlot(0, null), 0);
        }
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
