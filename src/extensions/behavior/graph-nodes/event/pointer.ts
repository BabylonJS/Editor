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
     * Called if provided buy the master class
     * @param pickedMesh the picked mesh reference
     */
    public customCheck? (mesh: AbstractMesh, pickedMesh: AbstractMesh): boolean;

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
                this.isSuccess = this.customCheck ? this.customCheck(mesh, pick.pickedMesh) : pick.pickedMesh === mesh;
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

export class PointerOut extends AbstractPointer {
    // Static members
    public static Desc = 'Triggers and action on the pointer is out on the mesh (only meshes are supported)';

    // Private members
    private _wasOver: boolean = false;

    /**
     * Constructor
     */
    constructor () {
        super('Pointer Out', PointerEventTypes.POINTERMOVE, true);
    }

    /**
     * Called if provided buy the master class
     * @param pickedMesh the picked mesh reference
     */
    public customCheck (mesh: AbstractMesh, pickedMesh: AbstractMesh): boolean {
        if (this._wasOver && mesh !== pickedMesh) {
            this._wasOver = false;
            return true;
        }

        this._wasOver = mesh === pickedMesh;
        return false;
    }
}
