import { Node } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class StopAnimation extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Stop Animation");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Node *", "Node", { linkedOutput: "Node" });
        
        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Node", "Node");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const node = this.getInputData<Node>(1);
        if (!node) { return; }
        
        this.getScene()?.stopAnimation(node);

        this.setOutputData(1, node);
        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(node: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: `this._scene.stopAnimation(${node.code})`,
            outputsCode: [
                { code: undefined },
                { code: node.code },
            ],
        };
    }
}