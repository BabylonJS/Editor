import { LGraph, LiteGraph } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class Condition extends LiteGraphNode {
    public static Desc = 'If the condition result is "true", then the Execute output will be triggered';
    
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.title = 'Condition between A and B';

        this.addInput('A', 'number,string,boolean');
        this.addInput('B', 'number,string,boolean');

        this.addOutput('A == B', LiteGraph.EVENT);
        this.addOutput('A != B', LiteGraph.EVENT);
        this.addOutput('A > B', LiteGraph.EVENT);
        this.addOutput('A < B', LiteGraph.EVENT);
        this.addOutput('A <= B', LiteGraph.EVENT);
        this.addOutput('A >= B', LiteGraph.EVENT);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const a = this.getInputData(1);
        const b = this.getInputData(2);

        if (a === b)
            this.triggerSlot(0);
        else if (a !== b)
            this.triggerSlot(1);
        else if (a > b)
            this.triggerSlot(2);
        else if (a < b)
            this.triggerSlot(3);
        else if (a <= b)
            this.triggerSlot(4);
        else if (a >= b)
            this.triggerSlot(5);
    }
}
