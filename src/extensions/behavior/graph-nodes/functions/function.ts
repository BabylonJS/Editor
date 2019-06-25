import { LiteGraphNode } from '../typings';

export interface FunctionInput {
    type: string; // number, vec3, string etc. for example
    name: string; // Input name
}

export interface FunctionOutput {
    name: string; // Output name
    type: string; // LiteGraph.EVENT for example.
}

export interface FunctionOptions {
    title: string;
    inputs: FunctionInput[];
    outputs: FunctionOutput[];
    callback: (...args: any[]) => any;
}

export class AbstractFunction extends LiteGraphNode {
    // Public members
    public callback: (...args: any[]) => any;

    /**
     * Constructor.
     * @param addExecute if add an execute input
     * @param title the title of the node.
     */
    constructor (addExecute: boolean, options: FunctionOptions) {
        super(addExecute);

        // Configure node
        this.title = options.title;
        this.callback = options.callback;
        options.inputs.forEach(i => this.addInput(i.type, i.name));
        options.outputs.forEach(o => this.addOutput(o.name, o.type));
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this.callback(this.graph.scriptObject);
    }
}
