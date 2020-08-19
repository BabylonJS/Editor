import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";
import { IStringDictionary } from "../../../../shared/types";

export class Cast extends GraphNode<{ type: string; }> {
    public static Types: IStringDictionary<string> = {
        "number": "number",
        "string": "string",
        "boolean": "boolean",
        "any": "any",
    };

    public static BabylonJSTypes: IStringDictionary<string> = {
        "Vector2": "Vector2",
        "Vector3": "Vector3",
        "AbstractMesh": "Node,TransformNode,AbstractMesh",
        "Mesh": "Node,TransformNode,AbstractMesh,Mesh",
        "DirectionalLight": "Node,Light,DirectionalLight",
        "SpotLight": "Node,Light,SpotLight",
        "PointLight": "Node,Light,PointLight",
        "HemisphericLight": "Node,Light,HemisphericLight",
        "Sound": "Sound",
        "ArcRotateCamera": "Node,Camera,ArcRotateCamera",
        "FreeCamera": "Node,Camera,FreeCamera",
        "IParticleSystem": "IParticleSystem",
        "ParticleSystem": "IParticleSystem,ParticleSystem",
        "StandardMaterial": "Material,StandardMaterial",
        "PBRMaterial": "Material,StandardMaterial",
    };

    /**
     * Constructor.
     */
    public constructor() {
        super("Cast");

        this.addProperty("type", "number", "string");
        this.addWidget("combo", "type", this.properties.type, (v) => {
            this.properties.type = v;
            this._reset();
        }, {
            values: Object.keys(Cast.Types).concat(Object.keys(Cast.BabylonJSTypes)),
        });

        this.addInput("object *", "");
        this.addOutput("", "");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        this.setOutputData(0, this.getInputData(0));
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(object: ICodeGenerationOutput): ICodeGenerationOutput {
        const requires: any[] = [];
        if (Cast.BabylonJSTypes[this.properties.type]) {
            requires.push({ module: "@babylonjs/core", classes: [this.properties.type] });
        }

        return {
            type: CodeGenerationOutputType.Constant,
            code: `(${object.code} as ${this.properties.type})`,
            requires,
        };
    }

    /**
     * Resets the node inputs/outputs.
     */
    private _reset(): void {
        this.title = `Cast as ${this.properties.type}`;
        this.setOutputDataType(0, Cast.Types[this.properties.type] ?? Cast.BabylonJSTypes[this.properties.type]);
    }
}
