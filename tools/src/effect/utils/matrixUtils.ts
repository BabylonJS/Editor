import { Matrix } from "@babylonjs/core/Maths/math.vector";

/**
 * Utility functions for matrix operations
 */
export class MatrixUtils {
	/**
	 * Extracts rotation matrix from Three.js matrix array
	 * @param matrix Three.js matrix array (16 elements)
	 * @returns Rotation matrix or null if invalid
	 */
	public static extractRotationMatrix(matrix: number[] | undefined): Matrix | null {
		if (!matrix || matrix.length < 16) {
			return null;
		}

		const mat = Matrix.FromArray(matrix);
		mat.transpose();
		return mat.getRotationMatrix();
	}
}
