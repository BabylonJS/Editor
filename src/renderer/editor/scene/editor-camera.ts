import { Nullable } from "../../../shared/types";

import { Node, FreeCamera, Scene, Vector3, KeyboardEventTypes, Observer, KeyboardInfo } from "babylonjs";

export class EditorCamera extends FreeCamera {
    private _savedSpeed: Nullable<number> = null;
    private _keyboardObserver: Nullable<Observer<KeyboardInfo>>;

    /**
     * Consstructor.
     * @param name defines the name of the camera.
     * @param position defines the start position of the camera.
     * @param scene defines the reference to the scene where to add the camera.
     * @param setActiveOnSceneIfNoneActive defines wether or not camera should be set as active 
     */
    public constructor(name: string, position: Vector3, scene: Scene, setActiveOnSceneIfNoneActive?: boolean) {
        super(name, position, scene, setActiveOnSceneIfNoneActive);

        this._savedSpeed = this.speed;

        this.inputs.addMouseWheel();

        this._keyboardObserver = scene.onKeyboardObservable.add((e) => {

            if (e.event.key !== "Shift") {
                return;
            }

            switch (e.type) {
                case KeyboardEventTypes.KEYDOWN:
                    this._savedSpeed = this.speed;
                    this.speed *= 0.1;
                    break;

                case KeyboardEventTypes.KEYUP:
                    if (this._savedSpeed !== null) {
                        this.speed = this._savedSpeed;
                        this._savedSpeed = null;
                    }
                    break;
            }
        });
    }

    /**
     * Destroy the camera and release the current resources hold by it.
     */
    public dispose(): void {
        super.dispose();

        this._scene.onKeyboardObservable.remove(this._keyboardObserver);
        this._keyboardObserver = null;
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
