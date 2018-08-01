import { AbstractMesh, Observer, PointerEventTypes } from 'babylonjs';
import { LiteGraph } from 'litegraph.js';

import { LiteGraphNode } from '../typings';

export class AbstractPointer extends LiteGraphNode {
    // Protected members
    protected isSuccess: boolean = false;

    // Private members
    private _pointerEventType: number;
    private _resetState: boolean;
    private _observer: Observer<any> = null;

    /**
     * Constructor
     */
    constructor (title: string, pointerEventType: number, resetState: boolean) {
        super();

        this.title = title;
        this._pointerEventType = pointerEventType;
        this._resetState = resetState;

        this.addOutput('Execute', LiteGraph.EVENT);
    }

    /**
     * On execute the node
     */
    public onExecute (): void {
        const mesh = <AbstractMesh> this.graph.scriptObject;
        const scene = mesh.getScene();

        // Event
        if (!this._observer) {
            this._observer = scene.onPointerObservable.add(p => {
                if (p.type !== this._pointerEventType)
                    return;

                const pick = scene.pick(scene.pointerX, scene.pointerY);
                this.isSuccess = pick.pickedMesh === mesh;
            });
        }

        if (this.isSuccess) {
            if (this._resetState)
                this.isSuccess = false;
            
            this.triggerSlot(0);
        }
    }
}

export class PointerOver extends AbstractPointer {
    // Static members
    public static Desc = 'Triggers and action on the pointer is over the mesh (only meshes are supported)';

    /**
     * Constructor
     */
    constructor () {
        super('Pointer Over', PointerEventTypes.POINTERMOVE, false);
    }
}

export class PointerDown extends AbstractPointer {
    // Static members
    public static Desc = 'Triggers and action on the pointer is down on the mesh (only meshes are supported)';

    /**
     * Constructor
     */
    constructor () {
        super('Pointer Down', PointerEventTypes.POINTERDOWN, true);
    }
}
