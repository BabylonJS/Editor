import { Node, FreeCamera, Scene, Vector3 } from "babylonjs";

export class EditorCamera extends FreeCamera {
    private _savedSpeed: number | null = null;

    private _keyboardUpListener: (ev: KeyboardEvent) => void;
    private _keyboardDownListener: (ev: KeyboardEvent) => void;

    /**
     * Consstructor.
     * @param name defines the name of the camera.
     * @param position defines the start position of the camera.
     * @param scene defines the reference to the scene where to add the camera.
     * @param setActiveOnSceneIfNoneActive defines wether or not camera should be set as active 
     */
    public constructor(name: string, position: Vector3, scene: Scene, setActiveOnSceneIfNoneActive?: boolean) {
        super(name, position, scene, setActiveOnSceneIfNoneActive);

        this.inputs.addMouseWheel();

        window.addEventListener("keydown", this._keyboardDownListener = (ev) => {
            if (ev.key !== "Shift") {
                return;
            }

            if (this._savedSpeed === null) {
                this._savedSpeed = this.speed;
                this.speed *= 0.1;
            }
        });

        window.addEventListener("keyup", this._keyboardUpListener = (ev) => {
            if (ev.key !== "Shift") {
                return;
            }

            if (this._savedSpeed !== null) {
                this.speed = this._savedSpeed;
                this._savedSpeed = null;
            }
        });
    }

    /**
     * Destroy the camera and release the current resources hold by it.
     */
    public dispose(): void {
        super.dispose();

        window.removeEventListener("keyup", this._keyboardUpListener);
        window.removeEventListener("keydown", this._keyboardDownListener);
    }

    /**
     * Gets the current object class name.
     * @return the class name
     */
    public getClassName(): string {
        return "EditorCamera";
    }
}

Node.AddNodeConstructor("EditorCamera", (name, scene) => {
    return () => new EditorCamera(name, Vector3.Zero(), scene);
});
