import { CSG } from "babylonjs";
import { Nullable } from "../../../../shared/types";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

enum CSGOperationType {
    Union = "Union",
    Subtract = "Subtract",
    Intersect = "Intersect",
}

export class CSGOperation extends GraphNode<{ type: CSGOperationType }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("CSG Mesh");

        this.addInput("Mesh 1", "CSGMesh");
        this.addInput("Mesh 2", "CSGMesh");

        this.addProperty("type", CSGOperationType.Intersect, "string");
        this.addWidget("combo", "type", this.properties.type, (v) => this.properties.type = v, {
            values: Object.values(CSGOperationType),
        });

        this.addOutput("Result", "CSGMesh");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): Promise<void> {
        const a = this.getInputData<CSG>(0);
        const b = this.getInputData<CSG>(1);

        if (!a || !b) {
            return Promise.resolve();
        }

        let result: Nullable<CSG> = null;

        switch (this.properties.type) {
            case CSGOperationType.Union: result = a.union(b); break;
            case CSGOperationType.Subtract: result = a.subtract(b); break;
            case CSGOperationType.Intersect: result = a.intersect(b); break;
        }

        this.setOutputData(0, result);
        return Promise.resolve();
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(a: ICodeGenerationOutput, b: ICodeGenerationOutput): ICodeGenerationOutput {
        let operation = "";
        switch (this.properties.type) {
            case CSGOperationType.Union: operation = "union"; break;
            case CSGOperationType.Subtract: operation = "subtract"; break;
            case CSGOperationType.Intersect: operation = "intersect"; break;
        }

        return {
            type: CodeGenerationOutputType.Constant,
            code: `${a.code}.${operation}(${b.code})`,
        };
    }
}