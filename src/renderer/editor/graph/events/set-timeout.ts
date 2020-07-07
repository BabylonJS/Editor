import { Nullable } from "../../../../shared/types";

import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class TimeoutEvent extends GraphNode<{ duration: number; }> {
    private _timeoutId: Nullable<number> = null;

    /**
     * Constructor.
     */
    public constructor() {
        super("Set Timeout");

        this.addInput("", LiteGraph.EVENT as any);

        this.addProperty("duration", 1000, "number");
        this.addWidget("number", "duration", this.properties.duration, (v) => this.properties.duration = v);

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Id", "number");
    }

    /**
     * Called on the graph is being stopped.
     */
    public onStop(): void {
        super.onStop();

        if (this._timeoutId !== null) {
            clearTimeout(this._timeoutId);
        }
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this._timeoutId = setTimeout(() => {
            this._timeoutId = null;
            this.triggerSlot(0, null);
        }, this.properties.duration) as any;
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        const code = `
            const timeoutId = setTimeout(() => {
                {{generated__body}}
            }, ${this.properties.duration});
        `;
        
        return {
            type: CodeGenerationOutputType.CallbackFunction,
            code,
            outputsCode: [
                { code: undefined },
                { code: "timeoutId" },
            ],
        };
    }
}
