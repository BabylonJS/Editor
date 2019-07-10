import { AbstractMesh, Observer, KeyboardEventTypes } from 'babylonjs';
import { LiteGraph, LGraphCanvas } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class AbstractKeyboard extends LiteGraphNode {
    // Protected members
    protected isSuccess: boolean = false;

    // Private members
    private _keyboardEventType: number;
    private _resetState: boolean;
    private _observer: Observer<any> = null;

    /**
     * Constructor.
     * @param title the title of the node.
     * @param keyboardEventType the keyboard event type to check on node observable.
     * @param resetState if the state should be reset.
     */
    constructor (title: string, keyboardEventType: number, resetState: boolean) {
        super();

        this.title = title;
        this._keyboardEventType = keyboardEventType;
        this._resetState = resetState;

        this.addOutput('Execute', LiteGraph.EVENT);
    }

    /**
     * On the background is drawn
     * @param ctx the canvas 2d context reference
     * @param text the text to draw
     */
    public onDrawBackground (ctx: CanvasRenderingContext2D, graph: LGraphCanvas, canvas: HTMLCanvasElement, text?: string): void {
        super.onDrawBackground(ctx, graph, canvas, <string> this.properties.key);
        this.graph.setDirtyCanvas(true, true);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const mesh = <AbstractMesh> this.graph.scriptObject;
        const scene = mesh.getScene();

        // Event
        if (!this._observer) {
            this._observer = scene.onKeyboardObservable.add(p => {
                if (p.type !== this._keyboardEventType)
                    return;

                const hasControl = p.event.ctrlKey || p.event.metaKey;
                const isKey = p.event.key.toLowerCase() === this.properties.key;

                this.isSuccess = (isKey && !this.properties.checkControlOrMeta) || (isKey && this.properties.checkControlOrMeta && hasControl);
            });
        }

        if (this.isSuccess) {
            if (this._resetState)
                this.isSuccess = false;
            
            this.triggerSlot(0);
        }
    }
}

export class KeyboardDown extends AbstractKeyboard {
    // Static members
    public static Desc = 'Triggers an action on the keyboard key is down.';
    public static Title = 'On Keyboard Down';

    /**
     * Constructor
     */
    constructor () {
        super('Keyboard Down', KeyboardEventTypes.KEYDOWN, true);
        this.addProperty('key', 'a');
        this.addProperty('checkControlOrMeta', false);
    }
}

export class KeyboardUp extends AbstractKeyboard {
    // Static members
    public static Desc = 'Triggers an action on the keyboard key is down.';
    public static Title = 'On Keyboard Up';

    /**
     * Constructor
     */
    constructor () {
        super('Keyboard Up', KeyboardEventTypes.KEYUP, true);
        this.addProperty('key', 'a');
        this.addProperty('checkControlOrMeta', false);
    }
}
