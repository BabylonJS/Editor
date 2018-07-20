class Script implements IScript {
    // Public members
    public blackColor = new BABYLON.Color4(0, 0, 0, 1);

    /**
     * Constructor
     */
    constructor () {

    }

    /**
     * Called once starting the script
     */
    public start (): void {
        // You can access the scene everywhere
        scene.clearColor = this.blackColor;

        // You can access the attached object everywhere
        console.log({{type}});
    }

    /**
     * Called on each frame
     */
    public update (): void {
        // Your code...
    }
}

exportScript(Script);