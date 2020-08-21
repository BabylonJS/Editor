import { Node } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class PlayAnimation extends GraphNode<{ from: number; to: number; loop: boolean; speed: number; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Play Animation");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Node *", "Node", { linkedOutput: "Node" });
        this.addInput("From" , "");
        this.addInput("To", "");

        this.addProperty("from", 0, "number");
        this.addProperty("to", 8, "number");
        this.addProperty("loop", false, "boolean");
        this.addProperty("speed", 1, "number");

        this.addWidget("number", "from", this.properties.from, (v) => this.properties.from = v);
        this.addWidget("number", "to", this.properties.to, (v) => this.properties.to = v);
        this.addWidget("toggle", "loop", this.properties.loop, (v) => this.properties.loop = v);
        this.addWidget("number", "speed", this.properties.speed, (v) => this.properties.speed = v);
        
        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("On End", LiteGraph.EVENT as any);
        this.addOutput("Node", "Node");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const node = this.getInputData<Node>(1);
        if (!node) { return; }
        
        this.setOutputData(2, node);
        
        this.getScene()?.beginAnimation(
            node,
            this.getInputData(2) ?? this.properties.from,
            this.getInputData(3) ?? this.properties.to,
            this.properties.loop,
            this.properties.speed,
            () => {
                this.triggerSlot(1, null);
            }
        );

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(node: ICodeGenerationOutput, from?: ICodeGenerationOutput, to?: ICodeGenerationOutput): ICodeGenerationOutput {
        const startFrame = from?.code ?? this.properties.from;
        const endFrame = to?.code ?? this.properties.to;

        const code = `this._scene.beginAnimation(${node.code}, ${startFrame}, ${endFrame}, ${this.properties.loop}, ${this.properties.speed}, () => {
            {{generated__callback__body}}
        });
        {{generated__body}}`;

        return {
            type: CodeGenerationOutputType.FunctionWithCallback,
            code,
            outputsCode: [
                { code: undefined },
                { code: undefined },
                { code: node.code },
            ],
        };
    }
}
