import { AbstractMesh, PointLight, SpotLight, DirectionalLight, Camera } from 'babylonjs';
import { LGraph, LiteGraph } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class RenderLoop extends LiteGraphNode {
    /**
     * Constructor
     */
    constructor () {
        super();

        this.size = [60,20];
        this.title = 'Render Loop';
        this.desc = 'On Render Loop';
        this.mode = LiteGraph.ALWAYS;

        this.addOutput("Render", LiteGraph.EVENT);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this.triggerSlot(0);
    }
}