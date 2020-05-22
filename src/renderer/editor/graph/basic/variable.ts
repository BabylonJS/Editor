import { GraphNode, ICodeGenerationOutput, CodeGenrationOutputType } from "../node";

type VariableType = "number" | "string" | "boolean";

export class Variable extends GraphNode<
    { value: any; name: string, type: VariableType }
> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Variable");

        this.addProperty("type", "number", "string");
        this.addProperty("name", "myVariable", "string");

        this._reset();
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute(): void {
        this.setOutputData(0, this.properties.value);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        return {
            type: CodeGenrationOutputType.Variable,
            code: this.properties.name,
            variable: {
                name: this.properties.name,
                value: this.properties.value,
            },
        };
    }

    /**
     * Resets the node inputs/outputs.
     */
    private _reset(): void {
        this.removeInput(0);
        this.removeOutput(0);
        this.properties = {
            name: this.properties.name,
            type: this.properties.type,
            value: undefined,
        };

        this.addInput("Set", this.properties.type);
        this.addOutput("Value", this.properties.type);

        switch (this.properties.type) {
            case "number": this.properties.value = 0; break;
            case "boolean": this.properties.value = true; break;
            case "string": this.properties.value = "Value"; break;
        }
    }
}
