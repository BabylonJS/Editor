import { Matrix, Scene, Vector2, Vector3 } from "babylonjs";

export function projectVectorOnScreen(vector: Vector3, scene: Scene): Vector2 {
    const result = Vector2.Zero();
    if (!scene.activeCamera) {
        return result;
    }

    const engine = scene.getEngine();

    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const hardwareScalingLevel = engine.getHardwareScalingLevel();
    const viewport = scene.activeCamera.viewport.toGlobal(width, height);

    const projectionResult = Vector3.Project(vector, Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport);
    projectionResult.scaleInPlace(hardwareScalingLevel);

    return result.set(projectionResult.x, projectionResult.y);
}
