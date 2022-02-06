import { join } from "path";

import { Tools } from "babylonjs";
import { LiteGraph } from "litegraph.js";

import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class LoadFile extends GraphNode<{ url: string; arrayBuffer: boolean; }> {
    /**
     * Constructor.
     */
    public constructor() {
        super("Load File");

        this.addInput("", LiteGraph.EVENT);
        this.addInput("Url", "string");

        this.addProperty("url", "", "string");

        this.addWidget("text", "url", this.properties.url, (v) => this.properties.url = v);
        this.addWidget("toggle", "Array Buffer", this.properties.arrayBuffer, (v) => this.properties.arrayBuffer = v);

        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("On Loaded", LiteGraph.EVENT);
        this.addOutput("Data", "");
    }

    /**
     * Called on the node is being executed.
     */
    public execute(): void {
        const urlInput = this.getInputData<string>(1) ?? this.properties.url;
        const url = join(this.graph?.workspaceDir ?? "", urlInput);

        Tools.LoadFile(url, (d) => {
            this.setOutputData(2, d);
            this.triggerSlot(1, null);
        }, undefined, undefined, this.properties.arrayBuffer, (_, e) => {
            console.log(e?.message ?? `Failed to load file ${url}`);
        });

        this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(url?: ICodeGenerationOutput): ICodeGenerationOutput {
        const code = `Tools.LoadFile("${url?.code ?? this.properties.url}", (d) => {
            {{generated__callback__body}}
        });
        {{generated__body}}`;

        return {
            type: CodeGenerationOutputType.FunctionWithCallback,
            code,
            outputsCode: [
                { code: undefined },
                { code: undefined },
                { code: "d as any" },
            ],
            requires: [
                { module: "@babylonjs/core", classes: ["Tools"] },
            ],
        };
    }
}
