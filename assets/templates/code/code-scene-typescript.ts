import { Scene, Color4 } from 'babylonjs';

export default class {{name}} implements IScript {
    // Public members
    public blackColor = new Color4(0, 0, 0, 1);

    /**
     * Constructor
     */
    constructor (public scene: Scene) {

    }

    /**
     * Called once starting the script
     */
    public start (): void {
        // You can access the scene everywhere
        this.scene.clearColor = this.blackColor;

        // You can access the attached object everywhere
        console.log(this.{{type}});
    }

    /**
     * Called on each frame
     */
    public update (deltaTimeMs: number): void {
        // Your code...
    }

    /**
     * Called once the attached object has been disposed
     */
    public dispose (): void {
        // Called once the attached object has been disposed
    }
}

// Export the script as an attached script
// (attached to a node or scene)
exportScript({{name}});