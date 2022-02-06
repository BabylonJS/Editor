import { Node, FreeCamera, Scene, Vector3 } from "babylonjs";

export class EditorCamera extends FreeCamera {
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
