import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class TimeoutEvent extends GraphNode<{ duration: number; }> {
    /**
     * Defines the number of times the code generation has been called.
     */
    public static Count: number = 0;

    private _count: number;
    private _timeoutIds: number[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Set Timeout");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Duration", "number");

        this.addProperty("duration", 1000, "number");
        this.addWidget("number", "duration", this.properties.duration, (v) => this.properties.duration = v);

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Id", "number");

        this._count = TimeoutEvent.Count++;
    }

    /**
     * Called on the graph is being stopped.
     */
    public onStop(): void {
        super.onStop();
        this._timeoutIds.forEach((id) => clearTimeout(id));
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const duration = this.getInputData<number>(1) ?? this.properties.duration;
        
        const id = setTimeout(() => {
            const index = this._timeoutIds.indexOf(id);
            if (index !== -1) {
                this._timeoutIds.splice(index);
            }

            this.triggerSlot(0, null);
        }, duration) as any;

        this._timeoutIds.push(id);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(duration?: ICodeGenerationOutput): ICodeGenerationOutput {
        const name = `timeoutId_${this._count}`;
        const code = `
            const ${name} = setTimeout(() => {
                {{generated__body}}
            }, ${duration?.code ?? this.properties.duration});
        `;
        
        return {
            type: CodeGenerationOutputType.CallbackFunction,
            code,
            outputsCode: [
                { code: undefined },
                { code: name },
            ],
        };
    }
}
