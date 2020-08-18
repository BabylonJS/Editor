import { Node } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class DisposeNode extends GraphNode<{ do_not_recurse: boolean; dispose_material_and_textures: boolean; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Dispose Node");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Node *", "Node");

        this.addProperty("do_not_recurse", true, "boolean");
        this.addProperty("dispose_material_and_textures", false, "boolean");

        this.addWidget("toggle", "do_not_recurse", true, (v) => this.properties.do_not_recurse = v);
        this.addWidget("toggle", "dispose_material_and_textures", false, (v) => this.properties.dispose_material_and_textures = v);

        this.addOutput("", LiteGraph.EVENT as any);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const node = this.getInputData<Node>(1);
        if (node) {
            node.dispose(this.properties.do_not_recurse, this.properties.dispose_material_and_textures);
        }

        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(node: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Function,
            code: `${node.code}.dispose(${this.properties.do_not_recurse}, ${this.properties.dispose_material_and_textures})`,
        };
    }
}
