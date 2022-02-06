import { Nullable } from "../../../../shared/types";

import { LiteGraph, LLink } from "litegraph.js";
import { AnimationGroup as BabylonAnimationGroup } from "babylonjs";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType, CodeGenerationExecutionType } from "../node";

export class AnimationGroup extends GraphNode<{ name: string; var_name: string; }> {
    /**
     * Defines the list of all avaialbe sounds in the scene.
     */
    public static Groups: string[] = [];

    /**
     * Defines the number of times the code generation has been called.
     */
    public static Count: number = 0;

    private _count: number;

    /**
     * Constructor.
     */
    public constructor() {
        super("Animation Group");

        this.addInput("Json", "string");

        this.addProperty("name", "None", "string");
        this.addProperty("var_name", "myGroup", "string");

        this._addWidgets();

        this.addOutput("Group", "AnimationGroup");
        this.addOutput("From", "number");
        this.addOutput("To", "number");

        this._count = AnimationGroup.Count++;
    }

    private _addWidgets(): void {
        this.addWidget("combo", "name", this.properties.name, (v) => {
            this.properties.name = v;
            this.title = `Animation Group (${v})`;
            this.size = this.computeSize();
        }, {
            values: () => AnimationGroup.Groups,
        });
        this.addWidget("text", "var_name", this.properties.var_name, (v) => this.properties.var_name = v);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        let group: Nullable<BabylonAnimationGroup> = null;

        const input = this.getInputData<string>(0);
        if (input) {
            group = BabylonAnimationGroup.Parse(JSON.parse(input), this.graph!.scene!);
        } else {
            group = this.getScene().getAnimationGroupByName(this.properties.name);
        }

        this.setOutputData(0, group ?? null);
        this.setOutputData(1, group?.from);
        this.setOutputData(2, group?.to);
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

        if (type !== LiteGraph.INPUT) {
            return;
        }

        this.widgets = [];

        if (!added) {
            this._addWidgets();
        }

        this.size = this.computeSize();
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(json?: ICodeGenerationOutput): ICodeGenerationOutput {
        if (json) {
            const variableName = `animationGroup${this._count}`;

            return {
                type: CodeGenerationOutputType.Function,
                code: `
                    const ${variableName} = AnimationGroup.Parse(JSON.parse(${json.code}), this._scene);
                    {{generated__body}}
                `,
                outputsCode: [
                    { code: variableName },
                    { code: `${variableName}.from` },
                    { code: `${variableName}.to` },
                ],
                requires: [
                    { module: "@babylonjs/core", classes: ["AnimationGroup"] },
                ],
            }
        } else {
            return {
                type: CodeGenerationOutputType.Variable,
                code: this.properties.var_name,
                executionType: CodeGenerationExecutionType.Properties,
                variable: {
                    name: this.properties.var_name,
                    type: "AnimationGroup",
                    value: `this._scene.getAnimationGroupByName("${this.properties.name.replace("\\", "\\\\")}")`,
                },
                outputsCode: [
                    { thisVariable: true },
                    { thisVariable: true, code: "from" },
                    { thisVariable: true, code: "to" },
                ],
                requires: [
                    { module: "@babylonjs/core", classes: ["AnimationGroup"] },
                ],
            };
        }
    }
}
