import { LiteGraph, LGraph } from 'litegraph.js';

export abstract class LiteGraphNode {
    // Public members
    public size: number[] = [60, 20];
    public title: string;
    public desc: string;
    public mode: number;

    public _data: any;
    public properties: { [index: string]: string };

    public graph: LGraph;

    // Static members
    public static LastCtor: new (addExecute?: boolean) => LiteGraphNode = null;

    /**
     * Constructor
     * @param addExecute if add an execute input
     */
    constructor (addExecute?: boolean) {
        if (addExecute)
            this.addInput("Execute", LiteGraph.EVENT);
    }

    /**
     * On the node is executed
     */
    public abstract onExecute? (): void;

    /**
     * Register the node
     * @param location: the location in graph editor
     * @param ctor: the constructor of the node
     */
    public static Register (location: string, ctor: new (addExecute?: boolean) => LiteGraphNode): void {
        if (!this.LastCtor) {
            this.LastCtor = ctor;
            LiteGraph.registerNodeType(location, ctor);
            return;
        }

        LiteGraph.registered_node_types[location] = this.LastCtor;
    }

    /**
     * Allowed methods
     */
    public triggerSlot? (slot: number): void;

    public addInput? (type: string, name: string): void;
    public addOutput? (name: string, type: string): void;

    public getInputData? (slot: number): any;
    public setOutputData? (slot: number, data: any): void;

    public addProperty? (name: string, defaultValue: string | number | boolean): void;
}
