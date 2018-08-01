import { LGraph, LiteGraph } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class GetProperty extends LiteGraphNode {
    public static Desc = 'Gets the value of the given property';
    
    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Get Property';

        this.addProperty('propertyPath', 'material.name');
        this.addOutput('Value', 'string,number,boolean');
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const node = this.graph.scriptObject;
        const path = this.properties['propertyPath'];

        const split = path.split('.');

        // Get property
        let effectiveProperty = node[split[0]];
        for (let i = 1; i < split.length; i++)
            effectiveProperty = effectiveProperty[split[i]];

        this.setOutputData(0, effectiveProperty);
    }
}

export class SetProperty extends LiteGraphNode {
    public static Desc = 'Sets the value of the given property';
    
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.title = 'Set Property';

        this.addProperty('propertyPath', 'material.name');
        this.addInput('New Value', 'number,string,boolean');
        this.addOutput('Value', 'string,number,boolean');
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const node = this.graph.scriptObject;
        const path = this.properties['propertyPath'];
        const input = this.getInputData(1);

        const split = path.split('.');
        const length = split.length;

        // Set property?
        if (length === 1) {
            node[path] = input;
        }
        else {
            let effectiveProperty = node[split[0]];
            for (let i = 1; i < length - 1; i++)
                effectiveProperty[split[i]] = input;

            effectiveProperty[split[length - 1]] = input;
        }

        this.setOutputData(0, input);
    }
}
