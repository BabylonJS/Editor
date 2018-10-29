import { LiteGraph } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class SetTimeout extends LiteGraphNode {
    // Protected members
    protected timeoutId: string = null;

    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.addOutput('Execute', LiteGraph.EVENT);
        this.addOutput('Timeout Id', 'number');

        this.addProperty('ms', 1000);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const id = setTimeout(() => {
            this.triggerSlot(0);
        }, <number> this.properties['ms']);

        this.setOutputData(1, id);
    }
}

export class ClearTimeout extends LiteGraphNode {
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.addInput('Timeout Id', 'number');
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const id = <number> this.getInputData(1);
        clearTimeout(id);
    }
}
