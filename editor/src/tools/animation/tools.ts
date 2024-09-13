import { Animation, Color3, Color4, Quaternion, Size, Vector2, Vector3 } from "babylonjs";

import { Tween } from "./tween";

/**
 * Defines the reference to the map that contains, for each target object, a list of tweens.
 */
export const tweensMap: Map<any, Tween[]> = new Map<any, Tween[]>();

/**
 * Registers the given target object that is being animated by tweens.
 * @param target defines the reference to the target object to register.
 */
export function registerTarget<T>(target: T): void {
    if (!tweensMap.get(target)) {
        tweensMap.set(target, []);
    }
}

/**
 * Registers the given tween that animates the given target.
 * @param target defines the reference to the animated target object.
 * @param tween defines the reference to the tween to register that animates the given target object.
 */
export function registerTween<T>(target: T, tween: Tween): void {
    tweensMap.get(target)?.push(tween);
}

/**
 * Checks for the given target to delete or keep active tweens array from the cache.
 * @param target defines the reference to the target to check its attached tweens.
 */
export function checkTargetTweens<T>(target: T): void {
    const tweens = tweensMap.get(target);
    if (tweens?.length === 0) {
        tweensMap.delete(target);
    }
}

/**
 * Removes the given tween from the attached tweens of the given target object once the tween ended.
 * @param target defines the reference to the target to check its array of tweens.
 * @param tween defines the reference to the tween to check its "ended" event.
 */
export function registerTweenEnded<T>(target: T, tween: Tween): void {
    void tween.then(() => {
        const tweens = tweensMap.get(target);
        const index = tweens?.indexOf(tween) ?? -1;
        if (index !== -1) {
            tweens?.splice(index, 1);
        }

        checkTargetTweens(target);
    });
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
