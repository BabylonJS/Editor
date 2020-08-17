import { CircleEase } from "babylonjs";
import { SerializedLGraphNode } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

interface _IEasingFunctionParameter {
    type: string;
    name: string;
    value: any;
}

export class EasingFunction extends GraphNode<{ easingFunction: string; }> {
    private static _EasingFunctions: { name: string; parameters: _IEasingFunctionParameter[] }[] = [
        { name: "CircleEase", parameters: [] },
        { name: "BackEase", parameters: [{ type: "number", name: "amplitude", value: 0.5 }] },
        { name: "BounceEase", parameters: [{ type: "number", name: "bounces", value: 0.5 }, { type: "number", name: "bounciness", value: 0.5 }] },
        { name: "CubicEase", parameters: [] },
        { name: "ElasticEase", parameters: [{ type: "number", name: "oscillations", value: 0.5 }, { type: "number", name: "springiness", value: 0.5 }] },
        { name: "ExponentialEase", parameters: [{ type: "number", name: "exponent", value: 0.5 }] },
        { name: "PowerEase", parameters: [{ type: "number", name: "power", value: 0.5 }] },
        { name: "QuadraticEase", parameters: [] },
        { name: "QuarticEase", parameters: [] },
        { name: "QuinticEase", parameters: [] },
        { name: "SineEase", parameters: [] },
        { name: "BezierCurveEase", parameters: [
            { type: "number", name: "x1", value: 0.5 }, { type: "number", name: "y1", value: 0.5 },
            { type: "number", name: "x2", value: 0.5 }, { type: "number", name: "y2", value: 0.5 }
        ] },
    ];

    /**
     * Constructor.
     */
    public constructor() {
        super("Easing Function");

        this._changeProperty();

        this.addOutput("Ref", "EasingFunction");
    }

    /**
     * Called on a property changed.
     * @param name defines the name of the property that changed.
     * @param value defines the new value of the property.
     */
    public onPropertyChange(name: string, value: any): boolean {
        if (name === "easingFunction") {
            this._changeProperty();
        }

        return super.onPropertyChange(name, value);
    }

    /**
     * Configures the node from an object containing the serialized infos.
     * @param infos defines the JSON representation of the node.
     */
    public configure(infos: SerializedLGraphNode): void {
        super.configure(infos);
        this._changeProperty();
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        switch (this.properties.easingFunction) {
            case "CircleEase": this.setOutputData(0, new CircleEase());
        }
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        const easingFunction = EasingFunction._EasingFunctions.find((ef) => ef.name === this.properties.easingFunction)!;
        const parameters = easingFunction.parameters.length ?
                                easingFunction.parameters.map((p) => this.properties[p.name].toString()).join(", ") :
                                "";

        return {
            type: CodeGenerationOutputType.Constant,
            code: `new ${this.properties.easingFunction}(${parameters})`,
            requires: [
                { module: "@babylonjs/core", classes: [this.properties.easingFunction] }
            ],
        }
    }

    private _changeProperty(): void {
        const fn = this.properties.easingFunction ?? EasingFunction._EasingFunctions[0].name;
        const oldProperties = this.properties;
        
        this.widgets = [];
        this.properties = { } as any;

        this.addProperty("easingFunction", fn, "string");
        this.addWidget("combo", "easingFunction", this.properties.easingFunction, (v) => {
            this.properties.easingFunction = v;
            this._changeProperty();
        }, {
            values: EasingFunction._EasingFunctions.map((f) => f.name),
        });

        // Add additional properties.
        const easingFunction = EasingFunction._EasingFunctions.find((ef) => ef.name === fn)!;
        easingFunction.parameters.forEach((p) => {
            this.addProperty(p.name, oldProperties[p.name] ?? p.value, p.type);
            this.addWidget("number", p.name, this.properties[p.name], (v) => this.properties[p.name] = v);
        });
    }
}
