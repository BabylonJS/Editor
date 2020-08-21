import { IStringDictionary, Nullable } from "../../../../shared/types";

import { Observer, AnimationGroup } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class PlayAnimationGroup extends GraphNode<{ loop: boolean; }> {
    private _groupObservers: IStringDictionary<{ group: AnimationGroup; observer: Nullable<Observer<AnimationGroup>>; }> = { };

    /**
     * Constructor.
     */
    public constructor() {
        super("Play Animation Group");

        this.addInput("", LiteGraph.EVENT as any);
        this.addInput("Group *", "AnimationGroup");

        this.addProperty("loop", false, "boolean");

        this.addWidget("toggle", "loop", this.properties.loop, (v) => this.properties.loop = v);
        
        this.addOutput("", LiteGraph.EVENT as any);
        this.addOutput("Group", "AnimationGroup");
        this.addOutput("On End", LiteGraph.EVENT as any);
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): Promise<void> {
        const group = this.getInputData<AnimationGroup>(1);
        this.setOutputData(1, group);
        
        if (group) {
            this._groupObservers[group.uniqueId] = {
                group,
                observer: group.onAnimationGroupEndObservable.addOnce(() => {
                    delete this._groupObservers[group.uniqueId];
                    this.triggerSlot(2, null);
                }),
            };
            
            group.play(this.properties.loop);
        }

        return this.triggerSlot(0, null);
    }

    /**
     * Called on the graph is being stopped.
     * @override
     */
    public onStop(): void {
        super.onStop();

        const endKeys = Object.keys(this._groupObservers);
        endKeys.forEach((k) => {
            const observer = this._groupObservers[k];
            if (observer.observer) { observer.group.onAnimationGroupEndObservable.remove(observer.observer); }
        });

        this._groupObservers = { };
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(group: ICodeGenerationOutput): ICodeGenerationOutput {
        let code = "";

        if (this.isOutputConnected(2)) {
            code += `${group.code}.onAnimationEndObservable.addOnce(() => {
                {{generated__callback__body}}
            });`;
        }

        code += `\n${group.code}.play(${this.properties.loop.toString()});
        {{generated__body}}`;

        return {
            type: CodeGenerationOutputType.FunctionWithCallback,
            code,
            outputsCode: [
                { code: undefined },
                { code: group.code },
            ],
        };
    }
}
