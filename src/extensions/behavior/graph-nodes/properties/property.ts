import { LGraphCanvas } from 'litegraph.js';
import { LiteGraphNode } from '../typings';

export class GetProperty extends LiteGraphNode {
    // Static members
    public static Desc = 'Gets the value of the given property';
    public static Title = 'Get Property';

    // Private members
    private _propertyValue: string | number | boolean = null;
    
    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Get Property';

        this.addProperty('propertyPath', 'material.name');
        this.addProperty('nodePath', 'self');

        this.addOutput('Output', 'string,number,boolean');
    }

    /**
     * On the background is drawn
     * @param ctx the canvas 2d context reference
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D, graph: LGraphCanvas, canvas: HTMLCanvasElement, text?: string): void {
        this.title = 'Get ' + this.properties.propertyPath;

        if (this._propertyValue !== null && this._propertyValue !== undefined) {
            super.onDrawBackground(ctx, graph, canvas, this._propertyValue.toString());
            this.graph.setDirtyCanvas(true, true);
        }
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        // Properties
        const propertyPath = <string> this.properties['propertyPath'];
        const nodePath = <string> this.properties['nodePath'];

        // Node
        const node = this.getTargetNode(nodePath);

        // Get property
        const split = propertyPath.split('.');
        
        let effectiveProperty = node[split[0]];
        for (let i = 1; i < split.length; i++)
            effectiveProperty = effectiveProperty[split[i]];

        this._propertyValue = effectiveProperty;
        this.setOutputData(0, effectiveProperty);
    }
}

export class SetProperty extends LiteGraphNode {
    // Static members
    public static Desc = 'Sets the value of the given property';
    public static Title = 'Set Property';

    // Private members
    private _propertyValue: string | number | boolean = '';
    
    /**
     * Constructor
     */
    constructor () {
        super(true);

        this.title = 'Set Property';

        this.addProperty('propertyPath', 'material.name');
        this.addProperty('nodePath', 'self');
        this.addProperty('propertyValue', '');

        this.addInput('Output', 'number,string,boolean');
        this.addOutput('Input', 'string,number,boolean');
    }

    /**
     * On the background is drawn
     * @param ctx the canvas 2d context reference
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D): void {
        this.title = 'Set ' + this.properties.propertyPath;
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        // Properties
        const propertyPath = <string> this.properties['propertyPath'];
        const nodePath = <string> this.properties['nodePath'];

        // Node
        const node = this.getTargetNode(nodePath);

        // Set property?
        const split = propertyPath.split('.');
        const length = split.length;

        if (length === 1) {
            this.setOutputData(0, this._setProperty(node, propertyPath));
        }
        else {
            let effectiveProperty = node[split[0]];
            for (let i = 1; i < length - 1; i++)
                effectiveProperty = effectiveProperty[split[i]];

            this.setOutputData(0, this._setProperty(effectiveProperty, split[length - 1]));
        }
    }

    // Sets the property of the given object[path] = value
    private _setProperty (object: any, path: string): boolean | string | number {
        const type = typeof object[path];
        const value = <string> this.properties['propertyValue'];

        if (value) {
            switch (type.toLowerCase()) {
                case 'boolean': object[path] = value.toLowerCase() === 'true'; break;
                case 'number': object[path] = parseFloat(value); break;
                case 'string': object[path] = value; break;
                default: break;
            }

            return value;
        }

        return (object[path] = this.getInputData(1));
    }
}
