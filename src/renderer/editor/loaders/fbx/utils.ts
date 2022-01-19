import { Matrix, Quaternion, Vector3 } from "babylonjs";

import { IFBXTransformData } from "./node/transform";

export class FBXUtils {
    /**
     * Applies the euler angles to the given rotation quaternion.
     * @param rotation defines the reference to the rotation quaternion.
     * @returns the reference to the result quaternion.
     */
    public static GetFinalRotationQuaternion(rotation: Quaternion): Quaternion {
        const r = rotation.toEulerAngles();
        return this.GetFinalRotationQuaternionFromVector(r);
    }

    /**
     * Applies the euler angles to the given rotation quaternion.
     * @param rotation defines the reference to the rotation vector.
     * @returns the reference to the result quaternion.
     */
    public static GetFinalRotationQuaternionFromVector(rotation: Vector3): Quaternion {
        const x = Quaternion.RotationAxis(Vector3.Left(), rotation.x);
        const y = Quaternion.RotationAxis(Vector3.Up(), rotation.y);
        const z = Quaternion.RotationAxis(Vector3.Forward(), rotation.z);
        const q = Quaternion.Inverse(x.multiply(y).multiply(z));

        return q;
    }

    /**
     * Applies the euler angles to the given matrix and applies translation.
     * @param matrix defines the reference to the matrix to configure.
     * @returns the reference to the new matrix configured.
     */
    public static GetMatrix(matrix: Matrix, transformData: IFBXTransformData): Matrix {
        const scale = Vector3.Zero();
        const rotation = Quaternion.Identity();
        const translation = Vector3.Zero();

        matrix.decompose(scale, rotation, translation);

        translation.x = -translation.x;

        let finalRotation = FBXUtils.GetFinalRotationQuaternion(rotation);

        if (transformData.preRotation) {
            const pre = FBXUtils.GetFinalRotationQuaternionFromVector(transformData.preRotation);
            finalRotation = pre.multiply(finalRotation);
        }
        
        if (transformData.postRotation) {
            const post = FBXUtils.GetFinalRotationQuaternionFromVector(transformData.postRotation);
            finalRotation = finalRotation.multiply(Quaternion.Inverse(post));
        }

        return Matrix.Compose(scale, finalRotation.normalize(), translation);
    }
}
