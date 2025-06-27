import { Animation } from "@babylonjs/core/Animations/animation";

/**
 * Returns the animation type according to the given animated property type.
 * @param effectiveProperty defines the reference to the animated property to get its animation type.
 */
export function getAnimationTypeForObject(effectiveProperty: any): number | null {
	if (!isNaN(parseFloat(effectiveProperty)) && isFinite(effectiveProperty)) {
		return Animation.ANIMATIONTYPE_FLOAT;
	}

	switch (effectiveProperty?.getClassName?.()) {
		case "Vector2": return Animation.ANIMATIONTYPE_VECTOR2;
		case "Vector3": return Animation.ANIMATIONTYPE_VECTOR3;
		case "Quaternion": return Animation.ANIMATIONTYPE_QUATERNION;
		case "Color3": return Animation.ANIMATIONTYPE_COLOR3;
		case "Color4": return Animation.ANIMATIONTYPE_COLOR4;
		case "Size": return Animation.ANIMATIONTYPE_SIZE;
		case "Matrix": return Animation.ANIMATIONTYPE_MATRIX;
	}

	return null;
}
