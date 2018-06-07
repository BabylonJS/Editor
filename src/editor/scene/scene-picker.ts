import {
    Scene, AbstractMesh, TargetCamera, Animation, Mesh,
    PositionGizmo, RotationGizmo, ScaleGizmo, UtilityLayerRenderer, Observer,
    PointerInfo, PointerEventTypes, Gizmo
} from 'babylonjs';
import Editor from '../editor';

export enum GizmoType {
    NONE = 0,
    POSITION,
    ROTATION,
    SCALING
}

export default class ScenePicker {
    // Public members
    public editor: Editor;
    public scene: Scene;
    public canvas: HTMLCanvasElement;

    public gizmosLayer: UtilityLayerRenderer;

    public onPickedMesh: (mesh: AbstractMesh) => void;
    public onUpdateMesh: (mesh: AbstractMesh) => void;

    // Protected members
    protected lastMesh: AbstractMesh = null;
    protected lastX: number = 0;
    protected lastY: number = 0;
    
    protected onCanvasPointer: Observer<PointerInfo> = null;

    protected positionGizmo: PositionGizmo;
    protected rotationGizmo: RotationGizmo;
    protected scalingGizmo: ScaleGizmo;
    protected currentGizmo: PositionGizmo | RotationGizmo | ScaleGizmo = null;

    // Private members
    private _enabled: boolean = true;
    private _gizmoType: GizmoType = GizmoType.NONE;

    /**
     * Constructor
     * @param editor: the editor reference
     * @param canvas: the canvas to track
     */
    constructor (editor: Editor, scene: Scene, canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.scene = scene;
        this.editor = editor;

        scene.preventDefaultOnPointerDown = false;
        scene.cameras.forEach(c => {
            c.detachControl(canvas);
            c.attachControl(canvas, true);
        });
        scene.meshes.forEach(m => m.isPickable = true);

        // Gizmos
        this.gizmosLayer = new UtilityLayerRenderer(scene);
        this.gizmosLayer.utilityLayerScene.postProcessesEnabled = false;
        this.gizmosLayer.shouldRender = false;

        // Add events
        this.addEvents();
    }

    /**
     * Returns if the scene picker is enabled
     */
    public get enabled (): boolean {
        return this._enabled;
    }

    /**
     * Sets if the scene picker is enabled
     */
    public set enabled (value: boolean) {
        this._enabled = value;

        if (!value) {
            this.gizmoType = GizmoType.NONE;

            if (this.lastMesh)
                this.lastMesh.showBoundingBox = false;
        }
    }

    /**
     * Sets the gizmo type
     */
    public set gizmoType (value: GizmoType) {
        this._gizmoType = value;

        // Dispose and clear
        this.positionGizmo && this.positionGizmo.dispose();
        this.rotationGizmo && this.rotationGizmo.dispose();
        this.scalingGizmo && this.scalingGizmo.dispose();

        this.positionGizmo = this.rotationGizmo = this.scalingGizmo = null;

        // Create gizmo
        switch (value) {
            case GizmoType.POSITION: this.currentGizmo = this.positionGizmo = new PositionGizmo(this.gizmosLayer); break;
            case GizmoType.ROTATION: this.currentGizmo = this.rotationGizmo = new RotationGizmo(this.gizmosLayer); break;
            case GizmoType.SCALING: this.currentGizmo = this.scalingGizmo = new ScaleGizmo(this.gizmosLayer); break;
            default: break; // GizmoType.NONE
        }

        // Attach mesh
        this.setGizmoAttachedMesh(this.editor.core.currentSelectedObject);

        // Events
        // TODO: access public members
        this.currentGizmo['_xDrag']['_dragBehavior'].onDragObservable.add(() => this.onUpdateMesh && this.onUpdateMesh(this.editor.core.currentSelectedObject));
        this.currentGizmo['_yDrag']['_dragBehavior'].onDragObservable.add(() => this.onUpdateMesh && this.onUpdateMesh(this.editor.core.currentSelectedObject));
        this.currentGizmo['_zDrag']['_dragBehavior'].onDragObservable.add(() => this.onUpdateMesh && this.onUpdateMesh(this.editor.core.currentSelectedObject));
    }

    /**
     * Sets the attached mesh for position, rotaiton and scaling gizmos
     * @param mesh the mesh to attach
     */
    public setGizmoAttachedMesh (mesh: Mesh): void {
        if (!(mesh instanceof Mesh))
            return;
        
        this.positionGizmo && (this.positionGizmo.attachedMesh = mesh);
        this.rotationGizmo && (this.rotationGizmo.attachedMesh = mesh);
        this.scalingGizmo && (this.scalingGizmo.attachedMesh = mesh);
    }

    /**
     * Adds the events to the canvas
     */
    public addEvents (): void {
        this.onCanvasPointer = this.scene.onPointerObservable.add(ev => {
            switch (ev.type) {
                case PointerEventTypes.POINTERDOWN: this.canvasDown(ev.event); break;
                case PointerEventTypes.POINTERTAP: this.canvasClick(ev.event); break;
                case PointerEventTypes.POINTERMOVE: this.canvasMove(ev.event); break;
                case PointerEventTypes.POINTERDOUBLETAP: this.canvasDblClick(ev.event); break;
            }
        });
    }

    /**
     * Removes the scene picker events from the canvas
     */
    public removeEvents (): void {
        this.scene.onPointerObservable.remove(this.onCanvasPointer);
    }

    /**
     * Called when canvas mouse is down
     * @param ev the mouse event
     */
    protected canvasDown(ev: MouseEvent): void {
        this.lastX = ev.offsetX;
        this.lastY = ev.offsetY;
    }

    /**
     * Called when canvas mouse is up
     * @param ev the mouse event
     */
    protected canvasClick (ev: MouseEvent): void {
        if (!this._enabled)
            return;
        
        if (Math.abs(this.lastX - ev.offsetX) > 5 || Math.abs(this.lastY - ev.offsetY) > 5)
            return;
        
        const pick = this.scene.pick(ev.offsetX, ev.offsetY);

        if (pick.pickedMesh && this.onPickedMesh) {
            this.onPickedMesh(pick.pickedMesh);

            // Attach mesh
            this.setGizmoAttachedMesh(<Mesh> pick.pickedMesh);
        }
    }

    /**
     * Called when mouse moves on canvas
     * @param ev the mouse event
     */
    protected canvasMove (ev: MouseEvent): void {
        if (!this._enabled)
            return;
        
        if (this.lastMesh)
            this.lastMesh.showBoundingBox = false;

        const pick = this.scene.pick(ev.offsetX, ev.offsetY);
        if (pick.pickedMesh) {
            this.lastMesh = pick.pickedMesh;
            pick.pickedMesh.showBoundingBox = true;
        }
    }

    /**
     * Called when double click on the canvas
     * @param ev: the mouse event
     */
    protected canvasDblClick (ev: MouseEvent): void {
        if (!this._enabled)
            return;
        
        const camera = <TargetCamera> this.scene.activeCamera;
        if (!(camera instanceof TargetCamera))
            return;

        const pick = this.scene.pick(ev.offsetX, ev.offsetY);

        if (pick.pickedMesh) {
            const anim = new Animation('LockedTargetAnimation', 'target', 1, Animation.ANIMATIONTYPE_VECTOR3);
            anim.setKeys([
                { frame: 0, value: camera.getTarget() },
                { frame: 1, value: pick.pickedMesh.getAbsolutePosition() },
            ]);

            this.scene.stopAnimation(camera);
            this.scene.beginDirectAnimation(camera, [anim], 0, 1, false, 1.0);
        }
    }
}