import { LiteGraph, LLink } from "litegraph.js";

import { objectProperties, IObjectProperty } from "./properties";
import { GraphNode, ICodeGenerationOutput, CodeGenerationOutputType } from "../node";

export class SetProperty extends GraphNode<{ path: string; }> {
    private _properties: IObjectProperty[] = [];

    /**
     * Constructor.
     */
    public constructor() {
        super("Set Property");

        this.addInput("", LiteGraph.EVENT);
        this.addInput("Object *", "", { linkedOutput: "Object" });
        this.addInput("Value *", "", { linkedOutput: "Value" });

        this.addProperty("path", "name", "string");
        this.addWidget("combo", "path", this.properties.path, (v) => {
            this.properties.path = v;
            this.title = `Set Property (${v})`;
            this.size = this.computeSize();

            const p = this._properties.find((p) => p.name === v);
            if (p?.type) {
                this.outputs[2].type = p.type;
            }
        }, {
            values: () => this._properties.map((p) => p.name),
        });

        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("Object", "");
        this.addOutput("Value", "");
    }

    /**
     * Called on the node is being executed.
     */
    public async execute(): Promise<void> {
        const node = this.getInputData(1);
        if (!node) { return; }

        node[this.properties.path] = this.getInputData(2, true);

        return this.triggerSlot(0, null);
    }

    /**
     * Generates the code of the graph.
     */
    public generateCode(object: ICodeGenerationOutput, value: ICodeGenerationOutput): ICodeGenerationOutput {
        return {
            type: CodeGenerationOutputType.FunctionCall,
            code: `${object.code}.${this.properties.path} = ${value.code}`,
            outputsCode: [
                { code: undefined },
                { code: object.code },
                { code: value.code },
            ],
        };
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

        if (slot !== 1 || !added || !link || type !== LiteGraph.INPUT) { return; }

        // Get output type and then input type
        const node = this.graph?.getNodeById(link.origin_id);
        if (!node) { return; }

        const outputType = node.outputs[link.origin_slot]?.type;
        if (!outputType) { return; }

        this.outputs[1].type = outputType;

        this._updateSerializableProperties(outputType);
    }

    /**
     * Updates all the available properties.
     */
    private _updateSerializableProperties(type: string): void {
        this._properties = [];

        const split = type.split(",");
        split.forEach((s) => {
            const properties = objectProperties[s];
            if (!properties) { return; }

            properties.forEach((p) => {
                if (!this._properties.find((p2) => p2.name === p.name)) {
                    this._properties.push(p);
                }
            });
        });
    }
}
