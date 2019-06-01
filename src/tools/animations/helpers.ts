import { Scene, Mesh, Animation, Vector3, Tags } from 'babylonjs';

export default class Helpers {
    // Private members
    private static _PositionLineMesh: Mesh = null;

    /**
     * Disposes the position line mesh used to help visualizing the position animation
     */
    public static DisposePositionLineMesh (): void {
        if (this._PositionLineMesh) {
            this._PositionLineMesh.dispose();
            this._PositionLineMesh = null;
        }
    }

    /**
     * Adds a new position line mesh used to help visualizing the position animation
     * @param scene the scene where to add the mesh
     * @param animation the position animation reference
     */
    public static AddPositionLineMesh (scene: Scene, animation: Animation): Mesh {
        // Clear before
        this.DisposePositionLineMesh();

        // Should create?
        if (animation.targetProperty !== 'position')
            return;

        // Create
        const keys = animation.getKeys();

        this._PositionLineMesh = Mesh.CreateLines('PositionHelperAnimationEditor', keys.map(k => <Vector3> k.value), scene);
        this._PositionLineMesh.doNotSerialize = true;
        Tags.AddTagsTo(this._PositionLineMesh, 'graph-hidden');

        return this._PositionLineMesh;
    }
}
