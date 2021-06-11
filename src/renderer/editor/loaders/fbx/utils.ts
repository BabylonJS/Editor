import { Matrix, Quaternion, Vector3 } from "babylonjs";

export class FBXUtils {
    /**
     * Applies the euler angles to the given rotation quaternion.
     * @param rotation defines the reference to the rotation quaternion.
     * @param eulerOrder defines the order of the euler angles.
     * @returns the reference to the result quaternion.
     */
    public static GetRotationQuaternion(rotation: Quaternion, eulerOrder: string): Quaternion {
        const r = rotation.toEulerAngles();

		const x = Quaternion.RotationAxis(Vector3.Left(), r.x);
		const y = Quaternion.RotationAxis(Vector3.Up(), r.y);
		const z = Quaternion.RotationAxis(Vector3.Forward(), r.z);
		const q = Quaternion.Inverse(x.multiply(y).multiply(z)).toEulerAngles(eulerOrder).toQuaternion();

        return q;
    }

    /**
     * Applies the euler angles to the given rotation quaternion.
     * @param rotation defines the reference to the rotation vector.
     * @param eulerOrder defines the order of the euler angles.
     * @returns the reference to the result quaternion.
     */
     public static GetRotationQuaternionFromVector(rotation: Vector3, eulerOrder: string): Quaternion {
		const x = Quaternion.RotationAxis(Vector3.Left(), rotation.x);
		const y = Quaternion.RotationAxis(Vector3.Up(), rotation.y);
		const z = Quaternion.RotationAxis(Vector3.Forward(), rotation.z);
		const q = Quaternion.Inverse(x.multiply(y).multiply(z)).toEulerAngles(eulerOrder).toQuaternion();

        return q;
    }

    /**
     * Applies the euler angles to the given matrix and applies translation.
     * @param matrix defines the reference to the matrix to configure.
     * @param eulerOrder defines the order of the euler angles.
     * @returns the reference to the new matrix configured.
     */
    public static GetMatrix(matrix: Matrix, eulerOrder: string): Matrix {
        const scale = Vector3.Zero();
		const rotation = Quaternion.Identity();
		const translation = Vector3.Zero();

		matrix.decompose(scale, rotation, translation);

		translation.x = -translation.x;

		return Matrix.Compose(scale, this.GetRotationQuaternion(rotation, eulerOrder), translation);
    }
}
