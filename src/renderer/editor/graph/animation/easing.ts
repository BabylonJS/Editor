import { CircleEase, BackEase, BounceEase, CubicEase, ElasticEase, ExponentialEase, PowerEase, QuadraticEase, QuarticEase, QuinticEase, SineEase, BezierCurveEase } from "babylonjs";
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
    public propertyChanged(name: string, value: any): boolean {
        if (name === "easingFunction") {
            this._changeProperty();
        }

        return super.propertyChanged(name, value);
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
            case "CircleEase": this.setOutputData(0, new CircleEase()); break;
            case "BackEase": this.setOutputData(0, new BackEase(this.properties["amplitude"])); break;
            case "BounceEase": this.setOutputData(0, new BounceEase(this.properties["bounces"], this.properties["bounciness"])); break;
            case "CubicEase": this.setOutputData(0, new CubicEase()); break;
            case "ElasticEase": this.setOutputData(0, new ElasticEase(this.properties["oscillations"], this.properties["springiness"])); break;
            case "ExponentialEase": this.setOutputData(0, new ExponentialEase(this.properties["exponent"])); break;
            case "PowerEase": this.setOutputData(0, new PowerEase(this.properties["power"])); break;
            case "QuadraticEase": this.setOutputData(0, new QuadraticEase()); break;
            case "QuarticEase": this.setOutputData(0, new QuarticEase()); break;
            case "QuinticEase": this.setOutputData(0, new QuinticEase()); break;
            case "SineEase": this.setOutputData(0, new SineEase()); break;
            case "BezierCurveEase": this.setOutputData(0, new BezierCurveEase(this.properties["x1"], this.properties["y1"], this.properties["x2"], this.properties["y2"])); break;
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

        this.title = `Easing Function (${fn})`;
        this.size = this.computeSize();
    }
}
