import { LiteGraph } from 'litegraph.js';

import { IGraphNode, InputOutputType } from './types';
import { GraphNode } from '../graph';

/**
 * Registers the given node in order to be used as a function call.
 * @param ctor the supported object's type.
 * @param object the object being edited.
 * @param path the path of the node in the context menu.
 * @param methodName the name of the method to call.
 * @param args the arguments of the method to call.
 * @param description the description of the node to draw in node edition tool.
 */
export function registerFunctionNode (ctor: (new (...args: any[]) => any), object, path: string, name: string, description: string, methodName: string, args: MethodArgument[], returnType?: MethodOutput): void {
    if (object && !(object instanceof ctor))
        return;
    
    GraphNode.RegisterNode(path, (class extends GraphFunctionNode {
        static Title = name;
        static Desc = description;
        title = name;
        desc = description;
        constructor () {
            super(methodName, args, returnType);
        }
    }));
}

export interface MethodOutput {
    /**
     * The name of the method's output.
     */
    name: string;
    /**
     * The type of the method's output.
     */
    type: InputOutputType;
}

export interface MethodArgument {
    /**
     * The name of the method's argument.
     */
    name: string;
    /**
     * The type of the method's argument.
     */
    type: InputOutputType;
    /**
     * Wether or not the argument is optional.
     */
    optional: boolean;
}

export class GraphFunctionNode extends IGraphNode {
    private _methodName: string;
    private _args: MethodArgument[];
    private _returnType: MethodOutput;

    private _isValid: boolean = false;

    /**
     * Constructor.
     */
    constructor (methodName: string, args: MethodArgument[], returnType?: MethodOutput) {
        super();

        this._methodName = methodName;
        this._args = args;
        this._returnType = returnType;

        this._configureInputs();
        this._configureOutput();

        this.computeSize();
    }

    /**
     * Called on the node is being executed.
     */
    public onExecute (): void {
        const target = this.graph.scriptObject;
        const method = target[this._methodName];

        if (!method)
            return console.warn(`No method exists on target: "${this._methodName}"`);

        this._isValid = true;
        const args = this._args.map((a, index) => {
            const i = this.getInputData(index + 1);
            if ((i === undefined || i === null) && !a.optional) {
                this._isValid = false;
                return;
            }
            
            return GraphNode.nodeToOutput(i);
        });

        this.setNodeState(!this._isValid);
        if (this._isValid)
            method.apply(target, args);
    }

    /**
     * On the background is drawn, draw custom text.
     * @param ctx the canvas 2d context reference.
     * @param graph the graph canvas reference.
     * @param canvas the canvas reference where to draw the text.
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D): void {
        if (this.flags.collapsed)
		    return;

        // Nothing to to now...
    }

    /**
     * Configures if inputs
     */
    private _configureInputs (): void {
        this.addInput('Execute', LiteGraph.EVENT);
        this._args.forEach((a, index) => this.addInput(a.name + (a.optional ? '' : ' *'), a.type));
    }

    /**
     * Configures the output.
     */
    private _configureOutput (): void {
        if (!this._returnType)
            return;

        this.addOutput(this._returnType.name, this._returnType.type);
    }
}
