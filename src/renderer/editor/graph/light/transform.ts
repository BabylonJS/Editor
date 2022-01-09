import { DirectionalLight, SpotLight, PointLight } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

type Light = DirectionalLight | SpotLight | PointLight;

export class TransformLight extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Light Transform");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Light *", "DirectionalLight,SpotLight,PointLight", { linkedOutput: "Light" });
        this.addInput("Position", "Vector3");
        this.addInput("Direction", "Vector3");
        
        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Light", "Node,Light");
        this.addOutput("Position", "Vector3");
        this.addOutput("Direction", "Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const light = this.getInputData<Light>(1);
        if (!light) { return; }

        light.position = this.getInputData(2) ?? light.position;
        light.direction = this.getInputData(3) ?? light.direction;

        this.setOutputData(1, light);
        this.setOutputData(2, light.position);
        this.setOutputData(3, light.direction);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(light: ICodeGenerationOutput, position?: ICodeGenerationOutput, direction?: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `${position ? `\n${light.code}.direction = ${position.code}` : ""}${direction ? `\n${light.code}.rotation = ${direction.code}` : ""}`;

        return {
            type: CodeGenerationOutputType.FunctionCall,
            code,
            outputsCode: [
                { code: undefined },
                { code: light.code },
                { code: `${light.code}.position` },
                { code: `${light.code}.direction` },
            ],
        };
    }
}
