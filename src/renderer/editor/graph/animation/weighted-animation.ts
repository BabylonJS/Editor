import { Animatable, Node } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class PlayWeightedAnimation extends GraphNode<{ from: number; to: number; loop: boolean; speed: number; weight: number; }> {
    /**
     * Defines the number of times the code generation has been called.
     */
    public static Count: number = 0;

    private _count: number;

    /**
     * Constructor.
     */
    public constructor() {
        super("Play Weighted Animation");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Animatable *", "Node,Skeleton", { linkedOutput: "Animatable" });
        this.addInput("From", "number");
        this.addInput("To", "number");
        this.addInput("Weight", "number");

        this.addProperty("from", 0, "number");
        this.addProperty("to", 8, "number");
        this.addProperty("loop", false, "boolean");
        this.addProperty("speed", 1, "number");
        this.addProperty("weight", 0, "number");

        this.addWidget("number", "from", this.properties.from, (v) => this.properties.from = v);
        this.addWidget("number", "to", this.properties.to, (v) => this.properties.to = v);
        this.addWidget("toggle", "loop", this.properties.loop, (v) => this.properties.loop = v);
        this.addWidget("number", "speed", this.properties.speed, (v) => this.properties.speed = v);
        this.addWidget("number", "weight", this.properties.weight, (v) => this.properties.weight = v);

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("On End", LiteGraph.EVENT as any);
        this.addOutput("Animatable", "Node,Skeleton");
        this.addOutput("Animation", "Animatable");

        this._count = PlayWeightedAnimation.Count++;
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const node = this.getInputData<Node>(1);
        if (!node) { return; }

        const animatable = this.getScene()?.beginWeightedAnimation(
            node,
            this.getInputData(2) ?? this.properties.from,
            this.getInputData(3) ?? this.properties.to,
            this.getInputData(4) ?? this.properties.weight,
            this.properties.loop,
            this.properties.speed,
            () => {
                this.triggerSlot(1, null);
            }
        );

        this.setOutputData(2, node);
        this.setOutputData(3, animatable);
        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(node: ICodeGenerationOutput, from?: ICodeGenerationOutput, to?: ICodeGenerationOutput, weight?: ICodeGenerationOutput): ICodeGenerationOutput {
        const varName = `animatable_${this._count}`;

        const s = from?.code ?? this.properties.from;
        const e = to?.code ?? this.properties.to;
        const w = weight?.code ?? this.properties.weight;

        const code = `const ${varName} = this._scene.beginWeightedAnimation(${node.code}, ${s}, ${e}, ${w}, ${this.properties.loop}, ${this.properties.speed}, () => {
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
                { code: varName },
            ],
        };
    }
}

export class GetAnimationWeight extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Get Animation Weight");

        this.addInput("Animation *", "Animatable");

        this.addOutput("Animation", "Animatable");
        this.addOutput("Weight", "number");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const animatable = this.getInputData<Animatable>(0);

        this.setOutputData(0, animatable);
        this.setOutputData(1, animatable?.weight);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(animatable: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `${animatable.code}.weight`,
            outputsCode: [
                { code: animatable.code },
                { code: `${animatable.code}.weight` },
            ],
        };
    }
}

export class SetAnimationWeight extends GraphNode<{ weight: number; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Set Animation Weight");

        this.addInput("", LiteGraph.EVENT);
        this.addInput("Animation *", "Animatable", { linkedOutput: "Animation" });
        this.addInput("Weight", "number");

        this.addProperty("weight", 0, "number");
        this.addWidget("number", "weight", this.properties.weight, (v) => this.properties.weight = v);

        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("Weight", "number");
        this.addOutput("Animation", "Animatable");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): Promise<void> {
        const weight = this.getInputData<number>(2) ?? this.properties.weight;
        const animatable = this.getInputData<Animatable>(1);

        if (animatable) {
            animatable.weight = weight;
        }

        this.setOutputData(1, animatable);
        this.setOutputData(2, weight);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(animatable: ICodeGenerationOutput, weight?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code: `${animatable.code}.weight = ${weight?.code ?? this.properties.weight}`,
            outputsCode: [
                { code: undefined },
                { code: animatable.code },
                { code: weight?.code ?? this.properties.weight.toString() },
            ],
        };
    }
}
