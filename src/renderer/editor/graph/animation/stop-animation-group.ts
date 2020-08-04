import { AnimationGroup } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class StopAnimationGroup extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Stop Animation Group");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("group", "AnimationGroup");
        
        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("group", "AnimationGroup");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const group = this.getInputData<AnimationGroup>(1);
        group?.stop();

        this.setOutputData(1, group);
        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(group: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: `${group.code}.stop()`,
            outputsCode: [
                { code: undefined },
                { code: group.code },
            ],
        };
    }
}
