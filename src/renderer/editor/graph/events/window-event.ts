import { Nullable } from "../../../../shared/types";

import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class WindowEvent extends GraphNode<{ eventName: string; }> {
    private _listener: { fn: Nullable<(evt: CustomEvent) => void>; eventName: Nullable<string>; } = {
        fn: null,
        eventName: null,
    };

    /**
     * Constructor.
     */
    public constructor() {
        super("Window Event");

        this.addProperty("eventName", "myEvent", "string");
        this.addWidget("text", "eventName", this.properties.eventName, (v) => this.properties.eventName = v);

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Data", "");
    }

    /**
     * Called on the graph is being started.
     */
    public onStart(): void {
        super.onStart();

        this._listener.eventName = this.properties.eventName;
        window.addEventListener(this.properties.eventName, this._listener.fn = (evt) => {
            this.setOutputData(1, evt.detail);
            this.triggerSlot(0, null);
        });
    }

    /**
     * Called on the graph is being stopped.
     */
    public onStop(): void {
        super.onStop();
        
        if (this._listener.fn && this._listener.eventName) {
            window.removeEventListener(this._listener.eventName, this._listener.fn);
        }
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        // Nothing to do now...
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        const code = `
            window.addEventListener("${this.properties.eventName}", (evt: CustomEvent) => {
                {{generated__body}}
            });
        `;
        
        return {
            type: CodeGenerationOutputType.CallbackFunction,
            executionType: CodeGenerationExecutionType.Start,
            code,
            outputsCode: [
                { code: undefined },
                { code: "evt.detail" },
            ],
        };
    }
}
