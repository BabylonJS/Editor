import { Nullable } from "../../../../shared/types";

import { Observer, PointerEventTypes } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class PointerEvent extends GraphNode<{ type: string; }> {
    private _observer: Nullable<Observer<any>> = null;

    /**
     * Constructor.
     */
    public constructor() {
        super("Pointer Event");

        this.addProperty("type", "POINTERTAP", "string");

        this.addWidget("combo", "type", this.properties.type, (v) => {
            this.properties.type = v;
        }, {
            values: [ "POINTERDOWN", "POINTERUP", "POINTERMOVE", "POINTERWHEEL", "POINTERPICK", "POINTERTAP"],
        });

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Pick Infos", "PickInfo");
    }

    /**
     * Called on the graph is being started.
     */
    public onStart(): void {
        this._observer = this.getScene().onPointerObservable.add((ev) => {
            if (!this.graph?.hasPaused && ev.type === PointerEventTypes[this.properties.type]) {
                this.setOutputData(1, ev.pickInfo);
                this.triggerSlot(0, null);
            }
        });
    }

    /**
     * Called on the graph is being stopped.
     */
    public onStop(): void {
        super.onStop();
        this.getScene().onPointerObservable.remove(this._observer);
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
            this._scene.onPointerObservable.add((ev) => {
                if (ev.type !== PointerEventTypes.${this.properties.type}) {
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
                { code: "ev.pickInfo?" },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["PointerEventTypes"] },
            ],
        };
    }
}
