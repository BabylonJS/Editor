import { Color3, Color4 } from "babylonjs";
import { SerializedLGraphNode } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class Col3 extends GraphNode<{ value: Color3; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Color 3");

        this.addInput("r", "number");
        this.addInput("g", "number");
        this.addInput("b", "number");

        this.addProperty("value", new Color3(1, 1, 1), "Color3");

        this.addWidget("number", "value.r", this.properties.value.r, (v) => this.properties.value.r = v, { min: 0, max: 1 });
        this.addWidget("number", "value.g", this.properties.value.g, (v) => this.properties.value.g = v, { min: 0, max: 1 });
        this.addWidget("number", "value.b", this.properties.value.b, (v) => this.properties.value.b = v, { min: 0, max: 1 });

        this.addOutput("", "Color3");
    }

    /**
     * configure a node from an object containing the serialized info
     */
    public configure(info: SerializedLGraphNode): void {
        super.configure(info);

        this.properties.value = new Color3(info.properties.value.r, info.properties.value.g, info.properties.value.b);
        if (this.widgets) {
            this.widgets[0].value = this.properties.value.r;
            this.widgets[1].value = this.properties.value.g;
            this.widgets[2].value = this.properties.value.b;
        }
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, new Color3(
            this.getInputData(0) ?? this.properties.value.r,
            this.getInputData(1) ?? this.properties.value.g,
            this.getInputData(2) ?? this.properties.value.b,
        ));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(r?: ICodeGenerationOutput, g?: ICodeGenerationOutput, b?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `new Color3(${r?.code ?? this.properties.value.r}, ${g?.code ?? this.properties.value.g}, ${b?.code ?? this.properties.value.b})`,
            requires: [
                { module: "@babylonjs/core", classes: ["Color3"] },
            ],
        };
    }
}

export class Col4 extends GraphNode<{ value: Color4; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Color 4");

        this.addInput("r", "number");
        this.addInput("g", "number");
        this.addInput("b", "number");
        this.addInput("a", "number");

        this.addProperty("value", new Color4(1, 1, 1, 1), "Color4");

        this.addWidget("number", "value.r", this.properties.value.r, (v) => this.properties.value.r = v, { min: 0, max: 1 });
        this.addWidget("number", "value.g", this.properties.value.g, (v) => this.properties.value.g = v, { min: 0, max: 1 });
        this.addWidget("number", "value.b", this.properties.value.b, (v) => this.properties.value.b = v, { min: 0, max: 1 });
        this.addWidget("number", "value.a", this.properties.value.a, (v) => this.properties.value.a = v, { min: 0, max: 1 });

        this.addOutput("", "Color4");
    }

    /**
     * configure a node from an object containing the serialized info
     */
    public configure(info: SerializedLGraphNode): void {
        super.configure(info);

        this.properties.value = new Color4(info.properties.value.r, info.properties.value.g, info.properties.value.b, info.properties.value.a);
        if (this.widgets) {
            this.widgets[0].value = this.properties.value.r;
            this.widgets[1].value = this.properties.value.g;
            this.widgets[2].value = this.properties.value.b;
            this.widgets[3].value = this.properties.value.a;
        }
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, new Color4(
            this.getInputData(0) ?? this.properties.value.r,
            this.getInputData(1) ?? this.properties.value.g,
            this.getInputData(2) ?? this.properties.value.b,
            this.getInputData(3) ?? this.properties.value.a,
        ));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(r?: ICodeGenerationOutput, g?: ICodeGenerationOutput, b?: ICodeGenerationOutput, a?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `new Color4(${r?.code ?? this.properties.value.r}, ${g?.code ?? this.properties.value.g}, ${b?.code ?? this.properties.value.b}, ${a?.code ?? this.properties.value.a})`,
            requires: [
                { module: "@babylonjs/core", classes: ["Color4"] },
            ],
        };
    }
}
