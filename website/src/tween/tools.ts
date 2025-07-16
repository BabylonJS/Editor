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
