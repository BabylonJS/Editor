import { Nullable } from "../../../../shared/types";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class Material extends GraphNode<{ name: string; var_name: string; }> {
    /**
     * Defines the list of all avaialbe materials in the scene.
     */
    public static Materials: { name: string; base64: string; type: string; }[] = [];

    private _baseHeight: number;
    private _img: Nullable<HTMLImageElement> = null;
    private _lastTextureName: Nullable<string> = null;

    /**
     * Constructor.
     */
    public constructor() {
        super("Material");

        this.addProperty("name", "None", "string");
        this.addProperty("var_name", "myMaterial", "string");

        this.addWidget("combo", "name", this.properties.name, (v) => this.properties.name = v, {
            values: () => Material.Materials.map((m) => m.name),
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);

        this.addOutput("Material", "Material");

        this._baseHeight = this.size[1];
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const material = this.getScene().getMaterialByName(this.properties.name);
        this.setOutputData(0, material ?? null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(): ICodeGenerationOutput {
        const type = this.outputs[0].type.split(",").pop()!;

        return {
            type: CodeGenerationOutputType.Variable,
            code: this.properties.var_name,
            executionType: CodeGenerationExecutionType.Properties,
            variable: {
                name: this.properties.var_name,
                value: `this._scene.getMaterialByName("${this.properties.name.replace("\\", "\\\\")}") as ${type}`,
            },
            outputsCode: [
                { thisVariable: true },
            ],
            requires: [
                { module: "@babylonjs/core", classes: [type] }
            ]
        };
    }

    /**
     * Called on a property changed.
     * @param name defines the name of the property that changed.
     * @param value defines the new value of the property.
     */
    public onPropertyChange(name: string, value: any): boolean {
        if (name === "name") {
            const material = Material.Materials.find((m) => m.name === value);
            if (material) {
                this.setOutputDataType(0, `Material,${material.type}`);
            } else {
                this.setOutputDataType(0, "Material");
            }
        }

        return super.onPropertyChange(name, value);
    }

    /**
     * Called each time the background is drawn.
     * @param ctx defines the rendering context of the canvas.
     * @override
     */
    public drawBackground(ctx: CanvasRenderingContext2D): void {
        super.drawBackground(ctx);

        const material = Material.Materials.find((m) => m.name === this.properties.name);
        if (!material) {
            this.size[1] = this._baseHeight;
            return;
        }

        if (this.properties.name !== this._lastTextureName) {
            this._img = new Image();
            this._img.src = material.base64;
        }

        if (this._img?.complete) {
            this.size[1] = this._baseHeight * 2 + 120;
            ctx.drawImage(this._img, 5, this._baseHeight + 5, this.size[0] - 10, this._baseHeight + 100);
        }
        
        this._lastTextureName = this.properties.name;
    }
}
