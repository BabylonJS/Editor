import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class AnimationRatio extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Animation Ratio");
        this.addOutput("", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, this.getScene().getAnimationRatio());
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: "this._scene.getAnimationRatio()",
        };
    }
}
