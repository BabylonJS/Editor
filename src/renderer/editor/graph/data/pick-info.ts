import { PickingInfo } from "babylonjs";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class PickInfos extends GraphNode {
    /**
     * Constructor.
     */
    public constructor() {
        super("Pick Infos");

        this.addInput("Pick Infos *", "PickInfo");

        this.addOutput("Ref", "PickInfo");
        this.addOutput("Mesh", "mesh");
        this.addOutput("Point", "Vector3");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const infos = this.getInputData(0) as PickingInfo;

        this.setOutputData(0, infos);
        this.setOutputData(1, infos?.pickedMesh);
        this.setOutputData(2, infos?.pickedPoint);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(input: ICodeGenerationOutput): ICodeGenerationOutput {
        const mesh = `${input.code}.pickedMesh`
        const point = `${input.code}.pickedPoint`;
        const code = `{
            mesh: ${mesh},
            point: ${point},
        }`;
        
        return {
            type: CodeGenerationOutputType.Constant,
            executionType: CodeGenerationExecutionType.Start,
            code: undefined!,
            outputsCode: [
                { code },
                { code: mesh },
                { code: point },
            ],
        };
    }
}
