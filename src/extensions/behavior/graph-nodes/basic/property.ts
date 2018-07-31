import { LGraph, LiteGraph } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class Property extends LiteGraphNode {
    public static Desc = 'Gets and/or Sets the value to the given property';
    
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.title = 'Get/Set Property';

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

        // Set property?
        if (input !== undefined && split.length === 1) {
            node[path] = input;

            this.setOutputData(0, input);
        }
        else {
            let effectiveProperty = node[split[0]];
            for (let i = 1; i < split.length; i++) {
                if (input !== undefined && i === split.length - 1)
                    effectiveProperty[split[i]] = input;
                
                effectiveProperty = effectiveProperty[split[i]];
            }

            this.setOutputData(0, effectiveProperty);
        }
    }
}
