import { Node } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class PlayAnimations extends LiteGraphNode {
    // Static members
    public static Desc = 'Plays animations of the attached node';
    public static Title = 'Play Animations';
    
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.title = 'Play Animations';

        this.addOutput('On End', LiteGraph.EVENT);

        this.addProperty('from', 0);
        this.addProperty('to', 60);
        this.addProperty('loop', false);
        this.addProperty('speed', 1.0);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const node = <Node> this.graph.scriptObject;
        const scene = node.getScene();

        scene.beginAnimation(
            node,
            <number> this.properties['from'],
            <number> this.properties['to'],
            <boolean> this.properties['loop'],
            <number> this.properties['speed'],
            () => this.triggerSlot(0));
    }
}

export class StopAnimations extends LiteGraphNode {
    // Static members
    public static Desc = 'Stops animations of the attached node';
    public static Title = 'Stop Animations';
    
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.title = 'Stop Animations';
        this.addOutput('On Stopped', LiteGraph.EVENT);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const node = <Node> this.graph.scriptObject;

        const scene = node.getScene();
        scene.stopAnimation(node);

        this.triggerSlot(0);
    }
}
