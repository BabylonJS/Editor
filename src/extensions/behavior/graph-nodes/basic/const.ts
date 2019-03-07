import { LGraphCanvas } from 'litegraph.js';
import { LiteGraphNode } from '../typings';

export class Number extends LiteGraphNode {
    // Static members
    public static Desc = 'Represents a constant number';

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Number';

        this.addOutput('value', 'number');
        this.addProperty('value', 1);
    }

    /**
     * On the background is drawn
     * @param ctx the canvas 2d context reference
     * @param text the text to draw
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D, graph: LGraphCanvas, canvas: HTMLCanvasElement, text?: string): void {
        super.onDrawBackground(ctx, graph, canvas, this.properties['value'].toString());
        this.graph.setDirtyCanvas(true, true);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this.setOutputData(0, this.properties['value']);
    }
}

export class String extends LiteGraphNode {
    // Static members
    public static Desc = 'Represents a constant string';

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'String';

        this.addOutput('value', 'string');
        this.addProperty('value', 'New String');
    }

    /**
     * On the background is drawn
     * @param ctx the canvas 2d context reference
     * @param text the text to draw
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D, graph: LGraphCanvas, canvas: HTMLCanvasElement, text?: string): void {
        super.onDrawBackground(ctx, graph, canvas, this.properties.value.toString());
        this.graph.setDirtyCanvas(true, true);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this.setOutputData(0, this.properties.value);
    }
}

export class Boolean extends LiteGraphNode {
    // Static members
    public static Desc = 'Represents a constant boolean';

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Boolean';

        this.addOutput('value', 'boolean');
        this.addProperty('value', true);
    }

    /**
     * On the background is drawn
     * @param ctx the canvas 2d context reference
     * @param text the text to draw
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D, graph: LGraphCanvas, canvas: HTMLCanvasElement, text?: string): void {
        super.onDrawBackground(ctx, graph, canvas, this.properties.value.toString());
        this.graph.setDirtyCanvas(true, true);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this.setOutputData(0, this.properties.value);
    }
}
