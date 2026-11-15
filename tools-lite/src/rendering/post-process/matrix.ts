import { Camera, getViewMatrix } from "@babylonjs/lite";

/**
 * Defines a 4x4 matrix stored as Babylon.js `Matrix` stores its values (16 floats in 32 bits, the translation in the
 * elements 12, 13 and 14). The post-processes ported from Babylon.js compute their matrices with the same operations,
 * rounded to 32 bits floats as Babylon.js does.
 */
export type BabylonMatrix = Float32Array;

/**
 * Same as Babylon.js `Matrix.FromValues`.
 */
export function _matrixFromValues(...values: number[]): BabylonMatrix {
	return new Float32Array(values);
}

/**
 * Same as Babylon.js `MultiplyMatricesToArray`: returns a × b.
 */
export function _multiplyMatrices(a: ArrayLike<number>, b: ArrayLike<number>): BabylonMatrix {
	const result = new Float32Array(16);

	for (let row = 0; row < 4; ++row) {
		const t0 = a[row * 4];
		const t1 = a[row * 4 + 1];
		const t2 = a[row * 4 + 2];
		const t3 = a[row * 4 + 3];

		for (let column = 0; column < 4; ++column) {
			result[row * 4 + column] = t0 * b[column] + t1 * b[4 + column] + t2 * b[8 + column] + t3 * b[12 + column];
		}
	}

	return result;
}

/**
 * Same as Babylon.js `InvertMatrixToArray`. Returns a copy of the matrix when it can't be inverted.
 */
export function _invertMatrix(m: ArrayLike<number>): BabylonMatrix {
	const m00 = m[0],
		m01 = m[1],
		m02 = m[2],
		m03 = m[3];
	const m10 = m[4],
		m11 = m[5],
		m12 = m[6],
		m13 = m[7];
	const m20 = m[8],
		m21 = m[9],
		m22 = m[10],
		m23 = m[11];
	const m30 = m[12],
		m31 = m[13],
		m32 = m[14],
		m33 = m[15];

	const det_22_33 = m22 * m33 - m32 * m23;
	const det_21_33 = m21 * m33 - m31 * m23;
	const det_21_32 = m21 * m32 - m31 * m22;
	const det_20_33 = m20 * m33 - m30 * m23;
	const det_20_32 = m20 * m32 - m22 * m30;
	const det_20_31 = m20 * m31 - m30 * m21;

	const cofact_00 = +(m11 * det_22_33 - m12 * det_21_33 + m13 * det_21_32);
	const cofact_01 = -(m10 * det_22_33 - m12 * det_20_33 + m13 * det_20_32);
	const cofact_02 = +(m10 * det_21_33 - m11 * det_20_33 + m13 * det_20_31);
	const cofact_03 = -(m10 * det_21_32 - m11 * det_20_32 + m12 * det_20_31);

	const det = m00 * cofact_00 + m01 * cofact_01 + m02 * cofact_02 + m03 * cofact_03;
	if (det === 0) {
		return new Float32Array(Array.from({ length: 16 }, (_, i) => m[i]));
	}

	const detInv = 1 / det;

	const det_12_33 = m12 * m33 - m32 * m13;
	const det_11_33 = m11 * m33 - m31 * m13;
	const det_11_32 = m11 * m32 - m31 * m12;
	const det_10_33 = m10 * m33 - m30 * m13;
	const det_10_32 = m10 * m32 - m30 * m12;
	const det_10_31 = m10 * m31 - m30 * m11;
	const det_12_23 = m12 * m23 - m22 * m13;
	const det_11_23 = m11 * m23 - m21 * m13;
	const det_11_22 = m11 * m22 - m21 * m12;
	const det_10_23 = m10 * m23 - m20 * m13;
	const det_10_22 = m10 * m22 - m20 * m12;
	const det_10_21 = m10 * m21 - m20 * m11;

	const cofact_10 = -(m01 * det_22_33 - m02 * det_21_33 + m03 * det_21_32);
	const cofact_11 = +(m00 * det_22_33 - m02 * det_20_33 + m03 * det_20_32);
	const cofact_12 = -(m00 * det_21_33 - m01 * det_20_33 + m03 * det_20_31);
	const cofact_13 = +(m00 * det_21_32 - m01 * det_20_32 + m02 * det_20_31);
	const cofact_20 = +(m01 * det_12_33 - m02 * det_11_33 + m03 * det_11_32);
	const cofact_21 = -(m00 * det_12_33 - m02 * det_10_33 + m03 * det_10_32);
	const cofact_22 = +(m00 * det_11_33 - m01 * det_10_33 + m03 * det_10_31);
	const cofact_23 = -(m00 * det_11_32 - m01 * det_10_32 + m02 * det_10_31);
	const cofact_30 = -(m01 * det_12_23 - m02 * det_11_23 + m03 * det_11_22);
	const cofact_31 = +(m00 * det_12_23 - m02 * det_10_23 + m03 * det_10_22);
	const cofact_32 = -(m00 * det_11_23 - m01 * det_10_23 + m03 * det_10_21);
	const cofact_33 = +(m00 * det_11_22 - m01 * det_10_22 + m02 * det_10_21);

	return _matrixFromValues(
		cofact_00 * detInv,
		cofact_10 * detInv,
		cofact_20 * detInv,
		cofact_30 * detInv,
		cofact_01 * detInv,
		cofact_11 * detInv,
		cofact_21 * detInv,
		cofact_31 * detInv,
		cofact_02 * detInv,
		cofact_12 * detInv,
		cofact_22 * detInv,
		cofact_32 * detInv,
		cofact_03 * detInv,
		cofact_13 * detInv,
		cofact_23 * detInv,
		cofact_33 * detInv
	);
}

const ndcToHalfZRange = _matrixFromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0.5, 0, 0, 0, 0.5, 1);

/**
 * Returns the projection matrix of the given camera as Babylon.js computes it with WebGPU (`Camera.getProjectionMatrix`:
 * left-handed perspective, vertical field of view fixed, depth of the clip space from 0 to 1, depth buffer not
 * reversed). Babylon Lite uses a reversed depth buffer: the post-processes ported from Babylon.js reconstruct the
 * positions from the projection of Babylon.js.
 * @param camera defines the reference to the camera.
 * @param aspectRatio defines the aspect ratio of the rendering ("engine.getAspectRatio(camera)" of Babylon.js).
 */
export function _getBabylonProjectionMatrix(camera: Camera, aspectRatio: number): BabylonMatrix {
	const n = camera.nearPlane;
	const f = camera.farPlane;

	const t = 1.0 / Math.tan(camera.fov * 0.5);
	const a = t / aspectRatio;
	const b = t;
	const c = f !== 0 ? (f + n) / (f - n) : 1;
	const d = f !== 0 ? (-2.0 * f * n) / (f - n) : -2 * n;

	const projection = _matrixFromValues(a, 0.0, 0.0, 0.0, 0.0, b, 0.0, 0.0, 0.0, 0.0, c, 1.0, 0.0, 0.0, d, 0.0);
	return _multiplyMatrices(projection, ndcToHalfZRange);
}

/**
 * Returns the view matrix of the given camera, rounded to 32 bits floats as Babylon.js stores it.
 * @param camera defines the reference to the camera.
 */
export function _getBabylonViewMatrix(camera: Camera): BabylonMatrix {
	return new Float32Array(getViewMatrix(camera) as unknown as ArrayLike<number>);
}

/**
 * Returns the aspect ratio of the rendering of the given camera, same as Babylon.js `engine.getAspectRatio(camera)`.
 * @param camera defines the reference to the camera.
 * @param width defines the width of the rendering in pixels.
 * @param height defines the height of the rendering in pixels.
 */
export function _getCameraAspectRatio(camera: Camera, width: number, height: number): number {
	const viewport = camera.viewport;
	return (width * (viewport?.width ?? 1)) / (height * (viewport?.height ?? 1));
}
