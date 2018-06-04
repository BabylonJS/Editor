import {
    Scene, AbstractMesh, TargetCamera, Animation, Mesh,
    PositionGizmo, RotationGizmo, ScaleGizmo, UtilityLayerRenderer
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

    // Protected members
    protected lastMesh: AbstractMesh = null;
    protected lastX: number = 0;
    protected lastY: number = 0;
    
    protected onCanvasDown = (ev: MouseEvent) => this.canvasDown(ev);
    protected onCanvasClick = (ev: MouseEvent) => this.canvasClick(ev);
    protected onCanvasMove = (ev: MouseEvent) => this.canvasMove(ev);
    protected onCanvasDblClick = (ev: MouseEvent) => this.canvasDblClick(ev);

    protected positionGizmo: PositionGizmo;
    protected rotationGizmo: RotationGizmo;
    protected scalingGizmo: ScaleGizmo;

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
        this.gizmosLayer.utilityLayerScene.preventDefaultOnPointerDown = false;
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

        this.positionGizmo && this.positionGizmo.dispose();
        this.rotationGizmo && this.rotationGizmo.dispose();
        this.scalingGizmo && this.scalingGizmo.dispose();

        this.positionGizmo = this.rotationGizmo = this.scalingGizmo = null;

        switch (value) {
            case GizmoType.POSITION: this.positionGizmo = new PositionGizmo(this.gizmosLayer); break;
            case GizmoType.ROTATION: this.rotationGizmo = new RotationGizmo(this.gizmosLayer); break;
            case GizmoType.SCALING: this.scalingGizmo = new ScaleGizmo(this.gizmosLayer); break;
            default: break; // GizmoType.NONE
        }

        // Attach mesh
        this.setGizmoAttachedMesh(this.editor.core.currentSelectedObject);
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
        this.canvas.addEventListener('mousedown', this.onCanvasDown, false);
        this.canvas.addEventListener('mouseup', this.onCanvasClick, false);
        this.canvas.addEventListener('mousemove', this.onCanvasMove, false);
        this.canvas.addEventListener('dblclick', this.onCanvasDblClick);
    }

    /**
     * Removes the scene picker events from the canvas
     */
    public remove (): void {
        this.canvas.removeEventListener('mousedown', this.onCanvasDown);
        this.canvas.removeEventListener('mouseup', this.onCanvasClick);
        this.canvas.removeEventListener('mousemove', this.onCanvasMove);
        this.canvas.addEventListener('dblclick', this.onCanvasDblClick);
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