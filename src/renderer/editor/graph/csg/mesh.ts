import { CSG, Material } from "babylonjs";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class CSGMesh extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("CSG Mesh");

        this.addInput("Mesh Source", "Mesh");
        this.addOutput("CSG Mesh", "CSGMesh");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): Promise<void> {
        const sourceMesh = this.getInputData(0);
        if (sourceMesh) {
            this.setOutputData(0, CSG.FromMesh(sourceMesh));
        }

        return Promise.resolve();
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(source: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `CSG.FromMesh(${source.code ?? "null"})`,
            requires: [
                { module: "@babylonjs/core", classes: ["CSG"] },
            ],
        };
    }
}

export class CSGToMesh extends GraphNode<{ name: string; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("CSG To Mesh");

        this.addInput("Source", "CSGMesh");
        this.addInput("Name", "string");
        this.addInput("Material", "Material");

        this.addProperty("name", "New Mesh", "string");
        this.addWidget("text", "name", this.properties.name, (v) => this.properties.name = v);

        this.addOutput("Mesh", "Mesh");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): Promise<void> {
        const sourceMesh = this.getInputData<CSG>(0);
        if (sourceMesh) {
            const name = this.getInputData<string>(1) ?? this.properties.name;
            this.setOutputData(0, sourceMesh.toMesh(name, this.getInputData<Material>(2), this.getScene()));
        }

        return Promise.resolve();
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(source: ICodeGenerationOutput, name?: ICodeGenerationOutput, material?: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.Constant,
            code: `${source.code}.toMesh(${name?.code ?? `"${this.properties.name}"`}, ${material?.code ?? "null"}, this._scene)`,
        };
    }
}
