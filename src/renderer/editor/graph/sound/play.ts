import { Sound } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class PlaySound extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Play Sound");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Sound *", "Sound");

        this.addOutput("", LiteGraph.EVENT as any);
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const sound = this.getInputData(1) as Sound;
        if (!sound) { return; }

        sound.play();

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: `${value.code}.play()`,
        };
    }
}
