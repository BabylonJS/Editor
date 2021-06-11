import { Mesh } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class CreateMeshInstance extends GraphNode<{ name: string; }> {
    /**
     * Defines the number of times the code generation has been called.
     */
    public static Count: number = 0;

    private _count: number;

    /**
     * Constructor.
     */
    public constructor() {
        super("Create Mesh Instance");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Mesh *", "Mesh");

        this.addProperty("name", "", "string");
        this.addWidget("text", "name", this.properties.name, (v) => this.properties.name = v);

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Instance", "Node,TransformNode,AbstractMesh,InstancedMesh");

        this._count = CreateMeshInstance.Count++;
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const mesh = this.getInputData(1) as Mesh;
        if (!mesh) { return; }

        const instance = mesh.createInstance(`${mesh.name}_${this._count}`);

        this.setOutputData(1, instance);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput): ICodeGenerationOutput {
        const varName = `meshInstance_${this._count}`;
        const name = this.properties.name || `${mesh.code}.name`;
        const code = `const ${varName} = ${mesh.code}.createInstance("${name}");`;

        return {
            type: CodeGenerationOutputType.Function,
            code,
            outputsCode: [
                { code: undefined },
                { code: varName },
            ],
        };
    }
}
