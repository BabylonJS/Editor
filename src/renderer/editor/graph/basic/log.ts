import { GraphNode, ICodeGenerationOutput, CodeGenrationOutputType } from "../node";

export class Log extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Log");

        this.addInput("Message", "");
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute(): void {
        console.log(this.getInputData(0));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenrationOutputType.Function,
            code: `console.log(${value.code})`,
        };
    }
}
