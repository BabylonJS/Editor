import { Mesh } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class CreateMeshInstance extends GraphNode {
    /**
     * Defines the number of times the code generation has been called.
     */
    public static Count: number = 0;

    /**
     * Constructor.
     */
    public constructor() {
        super("Create Mesh Instance");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Mesh *", "Mesh");

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("instance", "Node,TransformNode,AbstractMesh");

        CreateMeshInstance.Count++;
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const mesh = this.getInputData(1) as Mesh;
        const instance = mesh.createInstance(`${mesh.name}_${CreateMeshInstance.Count}`);

        this.setOutputData(1, instance);

        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput): ICodeGenerationOutput {
        const name = `meshInstance_${CreateMeshInstance.Count}`;
        const code = `const ${name} = ${mesh.code}.createInstance(${mesh.code}.name);`;

        return {
            type: CodeGenerationOutputType.Function,
            code,
            outputsCode: [
                { code: undefined },
                { code: name },
            ],
        };
    }
}
