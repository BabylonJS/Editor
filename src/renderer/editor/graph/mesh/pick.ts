import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class PickMesh extends GraphNode<{ fast_check: boolean; check_result: boolean; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Pick");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("x", "number");
        this.addInput("y", "number");

        this.addProperty("fast_check", false, "boolean");
        this.addProperty("check_result", true, "boolean");

        this.addWidget("toggle", "fast_check", this.properties.fast_check, (v) => this.properties.fast_check = v);
        this.addWidget("toggle", "check_result", this.properties.check_result, (v) => this.properties.check_result = v);

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Pick Infos", "PickInfo");
        this.addOutput("mesh", "Node,TransformNode,AbstractMesh");
        this.addOutput("point", "Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const scene = this.getScene();
        const pick = scene.pick(this.getInputData(1) ?? scene.pointerX, this.getInputData(2) ?? scene.pointerY, undefined, this.properties.fast_check);

        this.setOutputData(1, pick ?? null);
        this.setOutputData(2, pick?.pickedMesh ?? null);
        this.setOutputData(3, pick?.pickedPoint ?? null);
        
        if (pick?.hit) {
            return this.triggerSlot(0, null);
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(x?: ICodeGenerationOutput, y?: ICodeGenerationOutput): ICodeGenerationOutput {
        const pick = `const pick = this._scene.pick(${x?.code ?? "this._scene.pointerX"}, ${y?.code ?? "this._scene.pointerY"}, undefined, ${this.properties.fast_check.toString()});`

        const code = this.properties.check_result ? `${pick}
            if (pick?.hit) {
                {{generated__body}}
            };` : `${pick}
            {{generated__body}}`;

        return {
            type: CodeGenerationOutputType.CallbackFunction,
            code,
            outputsCode: [
                { code: undefined },
                { code: "pick" },
                { code: "pick.pickedMesh" },
                { code: "pick.pickedPoint" },
            ],
        };
    }
}
