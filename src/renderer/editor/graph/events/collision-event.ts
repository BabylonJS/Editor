import { Nullable } from "../../../../shared/types";

import { Observer, Mesh } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class CollisionEvent extends GraphNode {
    private _observer: Nullable<Observer<any>> = null;

    /**
     * Constructor.
     */
    public constructor() {
        super("Collision Event");

        this.addInput("Mesh *", "AbstractMesh");

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Mesh", "AbstractMesh");
        this.addOutput("Other Mesh", "AbstractMesh");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getInputData<Mesh>(0);
        
        this.setOutputData(1, mesh);

        if (!this._observer) {
            this._observer = mesh.onCollideObservable.add((other) => {
                this.setOutputData(2, other);
                this.triggerSlot(0, null);
            });
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `
            ${mesh.code}.onCollideObservable.add((other) => {
                {{generated__body}}
            });
        `;
        
        return {
            type: CodeGenerationOutputType.CallbackFunction,
            code,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
                { code: "other" },
            ],
        };
    }
}
