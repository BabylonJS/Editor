import { LGraph, LiteGraph } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class GetProperty extends LiteGraphNode {
    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Get Property';
        this.desc = 'Gets the value to the given property';

        this.addProperty('path', 'id');
        this.addOutput('Value', 'value');
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const node = this.graph.scriptObject;
        const path = this.properties['path'];

        const split = path.split('.');

        let effectiveProperty = node[split[0]];
        for (let i = 1; i < split.length; i++)
            effectiveProperty = effectiveProperty[split[i]];

            this.setOutputData(0, effectiveProperty);
    }
}

export class SetProperty extends LiteGraphNode {
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.title = 'Set Property';
        this.desc = 'Sets a new value to the given property';

        this.addProperty('path', 'id');
        this.addProperty('value', '');

        this.addInput('Value', 'value');
        this.addOutput('Value', 'value');
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const node = this.graph.scriptObject;
        const path = this.properties['path'];
        const value = this.properties['value'] || this.getInputData(1);

        const split = path.split('.');
        const lastSplit = split[split.length - 1];

        let effectiveProperty = split.length === 1 ? node : node[split[0]];
        for (let i = 1; i < split.length - 1; i++)
            effectiveProperty = effectiveProperty[split[i]];

        switch (typeof effectiveProperty[lastSplit]) {
            case 'string': effectiveProperty[lastSplit] = value; break;
            case 'number': effectiveProperty[lastSplit] = parseFloat(value); break;
            case 'boolean': effectiveProperty[lastSplit] = value.toLowerCase() === 'true'; break;
            default: console.log(`Cannot set property "${path}" as it is not a string, number or boolean`); break;
        }

        this.setOutputData(0, value);
    }
}

