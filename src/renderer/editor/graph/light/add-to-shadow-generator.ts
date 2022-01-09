import { AbstractMesh, Light } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class AddMeshToShadowGenerator extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Add Mesh To Shadow Generator");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Mesh *", "AbstractMesh", { linkedOutput: "Mesh" });
        this.addInput("Light *", "Light", { linkedOutput: "Light" });

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Mesh", "Node,TransformNode,AbstractMesh");
        this.addOutput("Light", "Node,Light");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const mesh = this.getInputData<AbstractMesh>(1);
        if (!mesh) { return; }

        const light = this.getInputData<Light>(2);
        if (!light) { return; }

        light.getShadowGenerator()?.getShadowMap()?.renderList?.push(mesh);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput, light: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code: `${light.code}.getShadowGenerator()?.getShadowMap()?.renderList?.push(${mesh.code});`,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
                { code: light.code },
            ],
        };
    }
}
