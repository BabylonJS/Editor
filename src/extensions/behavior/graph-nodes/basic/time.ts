import { LGraphCanvas } from 'litegraph.js';
import { LiteGraphNode } from '../typings';

export class Time extends LiteGraphNode {
    // Static members
    public static Desc = 'Outputs the current time in ms or seconds';

    /**
     * Constructor
     */
    constructor () {
        super();

        this.title = 'Time';

        this.addOutput('in ms', 'number');
	    this.addOutput('in sec', 'number');
    }

    /**
     * On the background is drawn
     * @param ctx the canvas 2d context reference
     * @param text the text to draw
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D, graph: LGraphCanvas, canvas: HTMLCanvasElement, text?: string): void {
        super.onDrawBackground(ctx, graph, canvas, (this.graph.globaltime >> 0).toString());
        this.graph.setDirtyCanvas(true, true);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        this.setOutputData(0, this.graph.globaltime * 1000);
	    this.setOutputData(1, this.graph.globaltime);
    }
}