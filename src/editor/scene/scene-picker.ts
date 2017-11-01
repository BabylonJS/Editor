import { Scene, AbstractMesh, TargetCamera, Animation } from 'babylonjs';
import Editor from '../editor';

export default class ScenePicker {
    // Public members
    public editor: Editor;
    public scene: Scene;
    public canvas: HTMLCanvasElement;

    public onPickedMesh: (mesh: AbstractMesh) => void;

    // Protected members
    protected lastMesh: AbstractMesh = null;
    protected lastX: number = 0;
    protected lastY: number = 0;
    
    protected onCanvasDown = (ev: MouseEvent) => this.canvasDown(ev);
    protected onCanvasClick = (ev: MouseEvent) => this.canvasClick(ev);
    protected onCanvasMove = (ev: MouseEvent) => this.canvasMove(ev);
    protected onCanvasDblClick = (ev: MouseEvent) => this.canvasDblClick(ev);

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

        // Add events
        this.addEvents();
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