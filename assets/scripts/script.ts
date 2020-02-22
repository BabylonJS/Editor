import { Node } from "@babylonjs/core";

/**
 * This represents a script that is attached to a node in the editor.
 * Available nodes are:
 *      - Meshes
 *      - Lights
 *      - Cameas
 *      - Transform nodes
 * 
 * You can extend the desired class according to the node type.
 * Example:
 *      export default class MyMesh extends Mesh {
 *          public onUpdate(): void {
 *              this.rotation.y += 0.04;
 *          }
 *      }
 * The functions "onStart" and "onUpdate" are called automatically.
 */
export default class MyScript extends Node {
    /**
     * Export that property as number to be shown in the inspector.
     * That will allow to configure scripts using the editor.
     */
    @visibleInInspector("number", "My Property")
    private _myProperty: number = 0;

    /**
     * Override constructor.
     * @warn do not fill.
     */
    // @ts-ignore ignoring the super call as we don't want to re-init
    private constructor() { }

    /**
     * Called on the scene starts.
     */
    public onStart(): void {
        console.log(this._myProperty);
    }

    /**
     * Called each frame.
     */
    public onUpdate(): void {

    }
}
