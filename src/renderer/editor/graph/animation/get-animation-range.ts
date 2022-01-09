import { Node, Skeleton } from "babylonjs";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class GetAnimationRange extends GraphNode<{ name: string; }> {
    /**
     * Defines the number of times the code generation has been called.
     */
    public static Count: number = 0;

    private _count: number;

    /**
     * Constructor.
     */
    public constructor() {
        super("Get Animation Range");

        this.addInput("Animatable *", "Node,Skeleton", { linkedOutput: "Animatable" });
        this.addInput("Name", "string");

        this.addProperty("name", "rangeName", "string", (v) => this.properties.name = v);
        this.addWidget("text", "name", this.properties.name, (v) => this.properties.name = v);

        this.addOutput("Range", "AnimationRange");
        this.addOutput("From", "number");
        this.addOutput("To", "number");
        this.addOutput("Animatable", "Node,Skeleton");

        this._count = GetAnimationRange.Count++;
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const animatable = this.getInputData<Node | Skeleton>(0);
        const range = animatable?.getAnimationRange(this.properties.name);

        this.setOutputData(0, range);
        this.setOutputData(1, range?.from ?? 0);
        this.setOutputData(2, range?.to ?? 0);
        this.setOutputData(3, animatable);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(animatable: ICodeGenerationOutput, name?: ICodeGenerationOutput): ICodeGenerationOutput {
        const varName = `range_${this._count}`;
        const code = `
            const ${varName} = ${animatable.code}.getAnimationRange("${name?.code ?? this.properties.name}");
        `;

        return {
            type: CodeGenerationOutputType.FunctionCall,
            code,
            outputsCode: [
                { code: varName },
                { code: `${varName}.from` },
                { code: `${varName}.to` },
                { code: animatable.code },
            ],
        };
    }
}
