import { Light } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, CodeGenerationOutputType, ICodeGenerationOutput } from "../node";

export interface ILightProperty {
    /**
     * Defines the name of the property.
     */
    name: string;
    /**
     * Defines the type of the property.
     */
    type: string;
}

export class SetLightProperty extends GraphNode<{ property: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Set Light Property");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Light *", "Light", { linkedOutput: "Light" });

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Light", "Node,Light");

        this.addProperty("property", "None", "string");

        this.addWidget("combo", "property", this.properties.property, (v) => {
            this.properties.property = v;
            this._changeProperty(SetLightProperty.Properties.find((p) => p.name === v));
        }, {
            values: SetLightProperty.Properties.map((p) => p.name),
        });
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const light = this.getInputData<Light>(1);
        if (!light) { return; }

        light[this.properties.property] = this.getInputData(2);

        this.setOutputData(1, light);
        return this.triggerSlot(0, null);
    }

    /**
     * Called on a property changed.
     * @param name defines the name of the property that changed.
     * @param value defines the new value of the property.
     */
    public propertyChanged(name: string, value: any): boolean {
        if (name === "property") {
            this._changeProperty(SetLightProperty.Properties.find((p) => p.name === value));
        }

        return super.propertyChanged(name, value);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(light: ICodeGenerationOutput, value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code: `${light.code}.${this.properties.property} = ${value.code}`,
            outputsCode: [
                { code: undefined },
                { code: light.code },
            ],
        };
    }

    /**
     * Called on the property changed.
     */
    private _changeProperty(property?: ILightProperty): void {
        if (!property) { return; }

        // Slots
        this.removeInput(2);
        this.addInput("value *", property.type);

        this.title = `Set Light Property (${property.name})`;
        this.size = this.computeSize();
    }

    /**
     * Defines the list of all properties.
     */
    public static Properties: ILightProperty[] = [
        { name: "intensity", type: "number" },
        { name: "range", type: "number" },
        { name: "radius", type: "number" },
        { name: "shadowEnabled", type: "boolean" },
        { name: "specular", type: "Color3" },
        { name: "diffuse", type: "Color3" },
    ];
}
