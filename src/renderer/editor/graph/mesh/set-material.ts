import { Material, Mesh } from "babylonjs";
import { LiteGraph, LLink } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class SetMeshMaterial extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Set Mesh Material");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Mesh *", "AbstractMesh,Mesh", { linkedOutput: "Mesh" });
        this.addInput("Material *", "Material", { linkedOutput: "Material" });

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Mesh", "Node,TransformNode,AbstractMesh");
        this.addOutput("Material", "Material");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const mesh = this.getInputData<Mesh>(1);
        if (!mesh) { return; }

        const material = this.getInputData<Material>(2);

        mesh.material = material;

        this.setOutputData(1, mesh);
        this.setOutputData(2, material);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(mesh: ICodeGenerationOutput, material: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code: `${mesh.code}.material = ${material.code};`,
            outputsCode: [
                { code: undefined },
                { code: mesh.code },
                { code: material.code },
            ],
        };
    }

    /**
     * On connections changed for this node, change its mode according to the new connections.
     * @param type input (1) or output (2).
     * @param slot the slot which has been modified.
     * @param added if the connection is newly added.
     * @param link the link object informations.
     * @param input the input object to check its type etc.
     */
    public onConnectionsChange(type: number, slot: number, added: boolean, link: LLink, input: any): void {
        super.onConnectionsChange(type, slot, added, link, input);

        if (slot !== 2) { return; }

        if (this.isInputConnected(2)) {
            this.outputs[2].type = this.graph?.getNodeById(link.origin_id)?.outputs[link.origin_slot].type ?? "Material";
        } else {
            this.outputs[2].type = "Material";
        }
    }
}
