import { Matrix, Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import type { ITransform } from "babylonjs-editor-tools";

/**
 * Z-axis reflection matrix for RH → LH conversion
 */
const RH_TO_LH = Matrix.Scaling(1, 1, -1);

/**
 * Convert right-handed matrix to left-handed using:
 * C * M * C
 */
function convertMatrixRHtoLH(sourceMatrix: Matrix): Matrix {
	return RH_TO_LH.multiply(sourceMatrix).multiply(RH_TO_LH);
}

/**
 * Convert transform from Three.js / Quarks (RH) to Babylon.js (LH)
 * Matrix space conversion only.
 */
export function convertTransform(matrixArray?: number[], positionArray?: number[], rotationArray?: number[], scaleArray?: number[]): ITransform {
	const position = Vector3.Zero();
	const rotation = Quaternion.Identity();
	const scale = Vector3.One();

	let sourceMatrix: Matrix;

	// =========================
	// MATRIX PATH (Preferred)
	// =========================
	if (matrixArray && matrixArray.length >= 16) {
		// IMPORTANT:
		// Babylon Matrix.FromArray expects column-major already
		sourceMatrix = Matrix.FromArray(matrixArray);
	} else {
		// =========================
		// TRS PATH (Fallback)
		// =========================

		const tempPos = Vector3.Zero();
		const tempRot = Quaternion.Identity();
		const tempScale = Vector3.One();

		if (positionArray?.length === 3) {
			tempPos.set(positionArray[0] ?? 0, positionArray[1] ?? 0, positionArray[2] ?? 0);
		}

		if (rotationArray?.length === 3) {
			// Three.js Euler is XYZ intrinsic
			// Babylon FromEulerAngles expects same logical order
			tempRot.copyFrom(Quaternion.FromEulerAngles(rotationArray[0] ?? 0, rotationArray[1] ?? 0, rotationArray[2] ?? 0));
		}

		if (scaleArray?.length === 3) {
			tempScale.set(scaleArray[0] ?? 1, scaleArray[1] ?? 1, scaleArray[2] ?? 1);
		}

		sourceMatrix = Matrix.Compose(tempScale, tempRot, tempPos);
	}

	// =========================
	// HANDEDNESS CONVERSION
	// =========================

	const convertedMatrix = convertMatrixRHtoLH(sourceMatrix);

	// =========================
	// SAFE DECOMPOSE
	// =========================

	const outPos = Vector3.Zero();
	const outRot = Quaternion.Identity();
	const outScale = Vector3.One();

	convertedMatrix.decompose(outScale, outRot, outPos);

	position.copyFrom(outPos);
	scale.copyFrom(outScale);
	rotation.copyFrom(outRot);

	return {
		position,
		rotation,
		scale,
	};
}
