import { Animation } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class InterpolationAnimation extends GraphNode<
    { name: string; target_property: string; frames_per_second: number; total_frame: number; loop_mode: string; }
> {
    public static LoopModes: string[] = [
        "ANIMATIONLOOPMODE_RELATIVE",
        "ANIMATIONLOOPMODE_CYCLE",
        "ANIMATIONLOOPMODE_CONSTANT",
    ];

    /**
     * Constructor.
     */
    public constructor() {
        super("Interpolation Animation");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Node *", "Node", { linkedOutput: "Node" });
        this.addInput("From *" , "");
        this.addInput("To *", "");
        this.addInput("Easing", "EasingFunction");

        this.addProperty("name", "animation", "string");
        this.addProperty("target_property", "visibility", "string");
        this.addProperty("frames_per_second", 60, "number");
        this.addProperty("total_frame", 60, "number");
        this.addProperty("loop_mode", "ANIMATIONLOOPMODE_RELATIVE", "string");

        this.addWidget("text", "name", this.properties.name, (v) => this.properties.name = v);
        this.addWidget("text", "target_property", this.properties.target_property, (v) => this.properties.target_property = v);
        this.addWidget("number", "frames_per_second", this.properties.frames_per_second, (v) => this.properties.frames_per_second = v);
        this.addWidget("number", "total_frame", this.properties.total_frame, (v) => this.properties.total_frame = v);
        this.addWidget("combo", "loop_mode", this.properties.loop_mode, (v) => this.properties.loop_mode = v, {
            values: InterpolationAnimation.LoopModes,
        });
        
        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("On Complete", LiteGraph.EVENT as any);
        this.addOutput("Node", "Node");

        this.size[0] = 400;
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): Promise<void> {
        Animation.CreateAndStartAnimation(
            this.properties.name,
            this.getInputData(1),
            this.properties.target_property,
            this.properties.frames_per_second,
            this.properties.total_frame,
            this.getInputData(2),
            this.getInputData(3),
            Animation[this.properties.loop_mode],
            this.getInputData(4),
            () => {
                this.triggerSlot(1, null);
            }
        );

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(node: ICodeGenerationOutput, from: ICodeGenerationOutput, to: ICodeGenerationOutput, easing?: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `Animation.CreateAndStartAnimation(
                "${this.properties.name}", // name
                ${node.code}, // node
                "${this.properties.target_property}", // target property
                ${this.properties.frames_per_second}, // frames per second
                ${this.properties.total_frame}, // total frame
                ${from.code}, // from
                ${to.code}, // to
                Animation.${this.properties.loop_mode}, // loop mode
                ${easing?.code ?? "undefined"}, // easing function
                () => { // on complete
                    {{generated__callback__body}}
                },
            );
            {{generated__body}}`;
        return {
            type: CodeGenerationOutputType.FunctionWithCallback,
            code,
            outputsCode: [
                { code: undefined },
                { code: undefined },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["Animation"] },
            ],
        };
    }
}
