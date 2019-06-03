import { Scene, Mesh, Animation, Vector3, Tags, Vector2, Path3D } from 'babylonjs';

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
        this._PositionLineMesh.enableEdgesRendering();
        this._PositionLineMesh.doNotSerialize = true;
        Tags.AddTagsTo(this._PositionLineMesh, 'graph-hidden');

        return this._PositionLineMesh;
    }

    /**
     * Returns the effective property according to the given animatable and animation.
     * @param animatable the animatable object which is the source the property to animate.
     * @param animation the animation being selected in the animations editor.
     */
    public static GetEffectiveProperty<T> (animatable: any, animation: Animation): T {
        let value = animatable;
        animation.targetPropertyPath.forEach(tpp => value = value[tpp]);

        return value;
    }

    /**
     * Projects the given key (frame/value) to the 2D graph.
     * @param frame the frame (position on x).
     * @param maxFrame the maximum frame.
     * @param width the width of the graph.
     * @param middle the middle of the graph.
     * @param value the value (position on y).
     * @param valueInterval the value interval.
     */
    public static ProjectToGraph (frame: number, maxFrame: number, width: number, middle: number, value: number, valueInterval: number): Vector2 {
        let x = (frame * width) / maxFrame;
        let y = middle;

        if (value !== 0 && maxFrame !== 0)
            y += ((value * middle) / (valueInterval * (value > 0 ? 1 : -1)) * (value > 0 ? -1 : 1)) / 2;

        return new Vector2(x, y);
    }

    /**
     * Scales the given value taking the given scale amount.
     * @param value the value to scale.
     * @param amount the scale amount.
     */
    public static ScaleValue (value: any, amount: number) {
        if (value.scale)
            return value.scale(amount);

        return value * amount;
    }

    /**
     * Computes the tangents of the given Vector3 animation.
     * @param animation the animation containing the keys to setup their tangents.
     * @param amount the scale amount to apply on tangents.
     */
    public static ComputeTangents (animation: Animation, amount: number): void {
        const keys = animation.getKeys();
        const path = new Path3D(keys.map(k => k.value));
        const tangents = path.getTangents();
        
        keys.forEach((k, index) => {
            k.inTangent = amount === 0 ? undefined : tangents[index].multiplyByFloats(amount, amount, amount);
            k.outTangent = amount === 0 ? undefined : tangents[index].multiplyByFloats(amount, amount, amount);
        });
    }
}
