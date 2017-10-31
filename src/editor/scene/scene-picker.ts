import { Scene, AbstractMesh } from 'babylonjs';
import Editor from '../editor';

export default class ScenePicker {
    // Public members
    public editor: Editor;
    public scene: Scene;
    public canvas: HTMLCanvasElement;

    public onPickedMesh: (mesh: AbstractMesh) => void;

    // Protected members
    protected onCanvasClick = (ev: MouseEvent) => this.canvasClick(ev);

    /**
     * Constructor
     * @param editor: the editor reference
     * @param canvas: the canvas to track
     */
    constructor (editor: Editor, scene: Scene, canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.scene = scene;
        this.editor = editor;

        canvas.addEventListener('click', this.onCanvasClick);
    }

    /**
     * Removes the scene picker events from the canvas
     */
    public remove (): void {
        this.canvas.removeEventListener('click', this.onCanvasClick);
    }

    /**
     * Called when canvas clicked
     * @param ev the mouse event
     */
    protected canvasClick (ev: MouseEvent): void {
        const pick = this.scene.pick(ev.offsetX, ev.offsetY);
        if (this.onPickedMesh && this.onPickedMesh)
            this.onPickedMesh(pick.pickedMesh);
    }
}