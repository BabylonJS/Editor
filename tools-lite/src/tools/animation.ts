import { EditorAnimation } from "../animation/animation";

/**
 * Returns the animation type according to the given animated property type.
 * Babylon Lite values are plain data: numbers, vectors ({ x, y, z }), quaternions ({ x, y, z, w }) and colors
 * (arrays of 3 or 4 numbers).
 * @param effectiveProperty defines the reference to the animated property to get its animation type.
 */
export function getAnimationTypeForObject(effectiveProperty: any): number | null {
	if (!isNaN(parseFloat(effectiveProperty)) && isFinite(effectiveProperty)) {
		return EditorAnimation.ANIMATIONTYPE_FLOAT;
	}

	if (Array.isArray(effectiveProperty) || ArrayBuffer.isView(effectiveProperty)) {
		switch ((effectiveProperty as ArrayLike<number>).length) {
			case 2:
				return EditorAnimation.ANIMATIONTYPE_VECTOR2;
			case 3:
				return EditorAnimation.ANIMATIONTYPE_COLOR3;
			case 4:
				return EditorAnimation.ANIMATIONTYPE_COLOR4;
			case 16:
				return EditorAnimation.ANIMATIONTYPE_MATRIX;
		}

		return null;
	}

	if (!effectiveProperty || typeof effectiveProperty !== "object") {
		return null;
	}

	if ("r" in effectiveProperty && "g" in effectiveProperty && "b" in effectiveProperty) {
		return "a" in effectiveProperty ? EditorAnimation.ANIMATIONTYPE_COLOR4 : EditorAnimation.ANIMATIONTYPE_COLOR3;
	}

	if ("width" in effectiveProperty && "height" in effectiveProperty) {
		return EditorAnimation.ANIMATIONTYPE_SIZE;
	}

	if ("x" in effectiveProperty && "y" in effectiveProperty) {
		if ("z" in effectiveProperty) {
			return "w" in effectiveProperty ? EditorAnimation.ANIMATIONTYPE_QUATERNION : EditorAnimation.ANIMATIONTYPE_VECTOR3;
		}

		return EditorAnimation.ANIMATIONTYPE_VECTOR2;
	}

	return null;
}
