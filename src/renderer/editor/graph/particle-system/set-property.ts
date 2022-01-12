import { IParticleSystem } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, CodeGenerationOutputType, ICodeGenerationOutput } from "../node";

export interface IParticleSystemProperty {
    /**
     * Defines the name of the property.
     */
    name: string;
    /**
     * Defines the type of the property.
     */
    type: string;
}

export class SetParticleSystemProperty extends GraphNode<{ property: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Set Particle System Property");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Particles System *", "IParticleSystem,ParticleSystem", { linkedOutput: "Particles System" });

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Particles System", "IParticleSystem");

        this.addProperty("property", "None", "string");

        this.addWidget("combo", "property", this.properties.property, (v) => {
            this.properties.property = v;
            this._changeProperty(SetParticleSystemProperty.Properties.find((p) => p.name === v));
        }, {
            values: SetParticleSystemProperty.Properties.map((p) => p.name),
        });
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const ps = this.getInputData<IParticleSystem>(1);
        if (!ps) { return; }

        ps[this.properties.property] = this.getInputData(2);

        this.setOutputData(1, ps);
        return this.triggerSlot(0, null);
    }

    /**
     * Called on a property changed.
     * @param name defines the name of the property that changed.
     * @param value defines the new value of the property.
     */
    public propertyChanged(name: string, value: any): boolean {
        if (name === "property") {
            this._changeProperty(SetParticleSystemProperty.Properties.find((p) => p.name === value));
        }

        return super.propertyChanged(name, value);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(particleSystem: ICodeGenerationOutput, value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code: `${particleSystem.code}.${this.properties.property} = ${value.code}`,
            outputsCode: [
                { code: undefined },
                { code: particleSystem.code },
            ],
        };
    }

    /**
     * Called on the property changed.
     */
    private _changeProperty(property?: IParticleSystemProperty): void {
        if (!property) { return; }

        // Slots
        this.removeInput(2);
        this.addInput("value *", property.type);

        this.title = `Set Particle System Property (${property.name})`;
        this.size = this.computeSize();
    }

    /**
     * Defines the list of all properties.
     */
    public static Properties: IParticleSystemProperty[] = [
        { name: "emitter", type: "Vector3,AbstractMesh" },
        { name: "particleTexture", type: "BaseTexture" },
        { name: "isBillboardBased", type: "boolean" },
        { name: "updateSpeed", type: "number" },
        { name: "targetStopDuration", type: "number" },
        { name: "minLifeTime", type: "number" },
        { name: "maxLifeTime", type: "number" },
        { name: "minSize", type: "number" },
        { name: "maxSize", type: "number" },
        { name: "minScaleX", type: "number" },
        { name: "maxScaleX", type: "number" },
        { name: "minScaleY", type: "number" },
        { name: "maxScaleY", type: "number" },
        { name: "emitRate", type: "number" },
        { name: "gravity", type: "Vector3" },
        { name: "minEmitPower", type: "number" },
        { name: "maxEmitPower", type: "number" },
        { name: "minAngularSpeed", type: "number" },
        { name: "maxAngularSpeed", type: "number" },
        { name: "minInitialRotation", type: "number" },
        { name: "maxInitialRotation", type: "number" },
        { name: "color1", type: "Color4" },
        { name: "color2", type: "Color4" },
        { name: "colorDead", type: "Color4" },
    ];
}
