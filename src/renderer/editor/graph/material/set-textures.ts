import { Material, BaseTexture } from "babylonjs";
import { LiteGraph, LLink } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class SetMaterialTextures extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Set Material Textures");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Material *", "Material", { linkedOutput: "Material" });

        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Material", "Material");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const material = this.getInputData<Material>(1);
        if (!material) { return; }

        for (let i = 2; i < this.inputs.length; i++) {
            const data = this.getInputData<BaseTexture>(i);
            if (data) {
                const property = `${this.inputs[i].name.toLowerCase()}Texture`;
                material[property] = data;
            }
        }

        this.setOutputData(1, material);
        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(material: ICodeGenerationOutput, ...textures: ICodeGenerationOutput[]): ICodeGenerationOutput {
        let code = "";
        for (let i = 0; i < textures.length; i++) {
            const texture = textures[i];
            if (!texture) { continue; }

            code += `${material.code}.${this.inputs[i + 2].name.toLowerCase()}Texture = ${texture.code}\n`;
        }

        return {
            type: CodeGenerationOutputType.FunctionCall,
            code,
            outputsCode: [
                { code: undefined },
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

        if (slot !== 1 || !added || !link) { return; }

        // Get output type and then material type.
        const outputType = this.graph?.getNodeById(link.origin_id)?.outputs[link.origin_slot]?.type;
        if (!outputType) {
            this.disconnectInput(slot);
            return;
        }

        const materialType = outputType.split(",").pop();
        if (materialType === "Material") { return; }

        const inputMaterialType = this.inputs[1].type.split(",").pop();

        // Check should recompute inputs
        if (materialType === inputMaterialType) { return; }

        // Remove all inputs.
        while (this.inputs[2]) {
            this.removeInput(2);
        }

        switch (materialType) {
            case "StandardMaterial":
                this.addInput("Diffuse", "Texture");
                this.addInput("Bump", "Texture");
                this.addInput("Specular", "Texture");
                this.addInput("Ambient", "Texture");
                this.addInput("Reflection", "Texture");
                this.addInput("Opacity", "Texture");
                this.addInput("Emissive", "Texture");
                this.addInput("Lightmap", "Texture");
                break;
            case "PBRMaterial":
                this.addInput("Albedo", "Texture");
                this.addInput("Bump", "Texture");
                this.addInput("Reflectivity", "Texture");
                this.addInput("Reflection", "Texture");
                this.addInput("Metallic", "Texture");
                this.addInput("Ambient", "Texture");
                this.addInput("Opacity", "Texture");
                this.addInput("Emissive", "Texture");
                this.addInput("Lightmap", "Texture");
                break;
        }

        this.computeSize();
        this.inputs[1].type = `Material,${materialType}`;
    }
}
