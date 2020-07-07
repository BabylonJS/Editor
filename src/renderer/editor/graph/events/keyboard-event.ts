import { Nullable } from "../../../../shared/types";

import { Observer, KeyboardEventTypes } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class KeyboardEvent extends GraphNode<{ type: string; }> {
    private _observer: Nullable<Observer<any>> = null;

    /**
     * Constructor.
     */
    public constructor() {
        super("Keyboard Event");

        this.addProperty("type", "KEYDOWN", "string");

        this.addWidget("combo", "type", this.properties.type, (v) => {
            this.properties.type = v;
        }, {
            values: ["KEYDOWN", "KEYUP"],
        });

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Key", "string");
        this.addOutput("Key Code", "number");
    }

    /**
     * Called on the graph is being started.
     */
    public onStart(): void {
        this._observer = this.getScene().onKeyboardObservable.add((ev) => {
            if (!this.graph?.hasPaused && ev.type === KeyboardEventTypes[this.properties.type]) {
                this.setOutputData(1, ev.event.key);
                this.setOutputData(2, ev.event.keyCode);
                this.triggerSlot(0, null);
            }
        });
    }

    /**
     * Called on the graph is being stopped.
     */
    public onStop(): void {
        super.onStop();
        this.getScene().onKeyboardObservable.remove(this._observer);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        // Nothing to do.
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        const code = `
            this._scene.onKeyboardObservable.add((ev) => {
                if (ev.type !== KeyboardEventTypes.${this.properties.type}) {
                    return;
                }

                {{generated__body}}
            });
        `;
        
        return {
            type: CodeGenerationOutputType.CallbackFunction,
            executionType: CodeGenerationExecutionType.Start,
            code,
            outputsCode: [
                { code: undefined },
                { code: "ev.event.key" },
                { code: "ev.event.keyCode" },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["KeyboardEventTypes"] },
            ],
        };
    }
}
