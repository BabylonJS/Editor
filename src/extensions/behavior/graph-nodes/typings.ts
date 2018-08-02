import { Node, Scene } from 'babylonjs';
import { LiteGraph, LGraph } from 'litegraph.js';

export abstract class LiteGraphNode {
    // Public members
    public title: string;
    public mode: number;
    public color: string;
    public bgColor: string;
    public properties: { [index: string]: string | number | boolean };

    public size: number[] = [60, 20];
    public shape: string = 'round';

    public graph: LGraph;

    // Private members
    protected _data: any;

    // Static members
    public static desc: string;
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
     * On connections changed for this node
     * @param type input (1) or output (2)
     * @param slot the slot which has been modified
     * @param added if the connection is newly added
     */
    public onConnectionsChange (type, slot, added): void {
        if (this.mode === LiteGraph.NEVER)
            return;
        
        if (type === LiteGraph.INPUT && slot === 0) {
            if (added)
                this.mode = LiteGraph.ON_TRIGGER;
            else
                this.mode = LiteGraph.ALWAYS;
        }

        LiteGraphNode.SetColor(this);
    };

    /**
     * Returns if the node has the given property defined
     * @param name the name of the property
     */
    public hasProperty (name: string): boolean {
        return this.properties[name] !== undefined;
    }

    /**
     * On the node is executed
     */
    public onExecute? (): void;

    /**
     * On the node's action is executed
     */
    public onAction? (): void;

    /**
     * Allowed methods
     */
    public triggerSlot? (slot: number, data?: any): void;

    public addInput? (type: string, name: string): void;
    public addOutput? (name: string, type: string): void;

    public getInputData? (slot: number, forceUpdate?: boolean): any;
    public setOutputData? (slot: number, data: any): void;

    public addProperty? (name: string, defaultValue: string | number | boolean): void;

    public onDrawBackground? (ctx: CanvasRenderingContext2D): void;

    /**
     * Returns the target node
     * @param name the name of the node
     */
    protected getTargetNode (name: string): Node | Scene {
        if (name === 'self')
            return this.graph.scriptObject;

        if (name === 'Scene')
            return this.graph.scriptScene;

        return this.graph.scriptScene.getNodeByName(name);
    }

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
     * Sets the node's color
     * @param node the node to configure
     */
    public static SetColor (node: LiteGraphNode): void {
        switch (node.mode) {
            case LiteGraph.ALWAYS: node.color = '#FFF'; node.bgColor = '#AAA'; break;
            case LiteGraph.ON_EVENT: node.color = '#AAF'; node.bgColor = '#44A'; break;
            case LiteGraph.ON_TRIGGER: node.color = '#AFA'; node.bgColor = '#4A4'; break;
            case LiteGraph.NEVER: node.color = '#FAA'; node.bgColor = '#A44'; break;
            default: break;
        }
    }
}
