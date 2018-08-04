import { AbstractMesh, PointLight, SpotLight, DirectionalLight, Camera } from 'babylonjs';
import { LGraph, LiteGraph } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class RenderLoop extends LiteGraphNode {
    // Static members
    public static Desc = 'On Render Loop';
    
    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Render Loop';
        this.mode = LiteGraph.NEVER;

        this.addOutput('Render', LiteGraph.EVENT);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this.triggerSlot(0);
    }
}

export class RenderStart extends LiteGraphNode {
    // Static members
    public static Desc = 'On rendering starts (called once)';

    // Public members
    public started: boolean = false;

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Render Starts';
        this.mode = LiteGraph.NEVER;

        this.addOutput('Render', LiteGraph.EVENT);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        if (this.started)
            return;
        
        this.started = true;
        this.triggerSlot(0);
    }
}
