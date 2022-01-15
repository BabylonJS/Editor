import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

import { Light, lightInheritance } from "./light";

export class GetLight extends GraphNode<{ name: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Get Light");

        this.addInput("Name", "string");

        this.addProperty("name", "None", "string", (v) => this.properties.name = this.title = v);
        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
            this.title = `Get Light (${v})`;
            this.size = this.computeSize();

            const light = Light.Lights.find((m) => m.name === v);
            if (light) {
                this.outputs[0].type = lightInheritance[light.type];
            }

            this.updateConnectedNodesFromOutput(0);
        }, {
            values: () => Light.Lights,
        });

        this.addOutput("Light", "Node,Light");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getScene().getLightByName(this.getInputData(0) ?? this.properties.name);
        this.setOutputData(0, mesh);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(name?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `this._scene.getLightByName("${name?.code ?? this.properties.name}")`,
        };
    }
}
