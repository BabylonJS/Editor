import { Size } from "@babylonjs/core/Maths/math.size";
import { Animation } from "@babylonjs/core/Animations/animation";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { IAnimationKey } from "@babylonjs/core/Animations/animationKey";
import { Quaternion, Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";

export function cloneKey(dataType: number, key: IAnimationKey): IAnimationKey {
    let value: any;
    switch (dataType) {
        case Animation.ANIMATIONTYPE_FLOAT: value = key.value; break;
        default: value = key.value.clone(); break;
    }

    return {
        value,
        frame: key.frame,
        interpolation: key.interpolation,
        inTangent: dataType === Animation.ANIMATIONTYPE_FLOAT ? key.inTangent : key.inTangent?.clone(),
        outTangent: dataType === Animation.ANIMATIONTYPE_FLOAT ? key.outTangent : key.outTangent?.clone(),
    };
}

/**
 * Returns the animation type according to the given animated property type.
 * @param effectiveProperty defines the reference to the animated property to get its animation type.
 */
export function getAnimationTypeForObject(effectiveProperty: any): number | null {
    if (!isNaN(parseFloat(effectiveProperty)) && isFinite(effectiveProperty)) {
        return Animation.ANIMATIONTYPE_FLOAT;
    } else if (effectiveProperty instanceof Quaternion) {
        return Animation.ANIMATIONTYPE_QUATERNION;
    } else if (effectiveProperty instanceof Vector3) {
        return Animation.ANIMATIONTYPE_VECTOR3;
    } else if (effectiveProperty instanceof Vector2) {
        return Animation.ANIMATIONTYPE_VECTOR2;
    } else if (effectiveProperty instanceof Color3) {
        return Animation.ANIMATIONTYPE_COLOR3;
    } else if (effectiveProperty instanceof Color4) {
        return Animation.ANIMATIONTYPE_COLOR4;
    } else if (effectiveProperty instanceof Size) {
        return Animation.ANIMATIONTYPE_SIZE;
    }

    return null;
}

/**
 * Returns the current value of the given property of the given object.
 * @param object defines the root object where to parse the property and return its value.
 * @param property defines the path of the property to get its value.
 * @example getPropertyValue(scene, "ambientColor");
 * @example getPropertyValue(scene, "ambientColor.r");
 */
export function getPropertyValue(object: any, property: string) {
    const parts = property.split('.');

    let value = object;

    for (let i = 0; i < parts.length; ++i) {
        value = value[parts[i]];
    }

    return value;
}
