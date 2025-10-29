import { getAnimationTypeForObject } from "babylonjs-editor-tools";
import { Animatable, Animation, EasingFunction, IAnimationKey, Nullable, Scene } from "babylonjs";

import { tweensMap, registerTarget, registerTween, checkTargetTweens, registerTweenEnded } from "./tools";

export interface ITweenEasingConfiguration {
	mode: number;
	type: EasingFunction;
}

export interface ITweenPropertyConfiguration {
	from: any;
	to: any;

	duration?: number;
	delay?: number;

	easing?: ITweenEasingConfiguration;

	value: any;
}

export interface ITweenConfiguration {
	scene?: Scene;
	delay?: number;
	easing?: ITweenEasingConfiguration;

	loop?: boolean;

	properties?: {
		[propertyPath: string]: ITweenPropertyConfiguration | any;
	};

	onStart?: () => void;
	onUpdate?: () => void;
	onComplete?: () => void;

	[propertyPath: string]: ITweenPropertyConfiguration | any;

	noOptimize?: boolean;
	killAllTweensOfTarget?: boolean;
}

const reservedProperties = ["scene", "delay", "easing", "loop", "killAllTweensOfTarget", "properties", "onStart", "onUpdate", "onComplete"];

export class Tween {
	/**
	 * Defines the reference to the promise resolved on the tween ended.
	 */
	public promise: Promise<void[]>;

	/**
	 * Constructor.
	 * @param animatable defines the reference to the animatable that is being played.
	 */
	public constructor(public animatables: Animatable[]) {
		this.promise = Promise.all(
			animatables.map((a) => {
				return new Promise<void>((resolve) => {
					a.onAnimationEndObservable.addOnce(() => resolve());
				});
			})
		);
	}

	/**
	 * Pauses the tween animation.
	 */
	public pause(): void {
		this.animatables.forEach((a) => a.pause());
	}

	/**
	 * Restarts the animation.
	 */
	public reset(): void {
		this.animatables.forEach((a) => a.reset());
	}

	/**
	 * Stops the tween animation. Resolves the promise.
	 */
	public stop(): void {
		this.animatables.forEach((a) => a.stop());
	}

	/**
	 * Attaches callbacks for the resolution and/or rejection of the Promise.
	 * @param onfulfilled The callback to execute when the Promise is resolved.
	 * @param onrejected The callback to execute when the Promise is rejected.
	 * @returns A Promise for the completion of which ever callback is executed.
	 */
	public then<T1 = void, T2 = never>(
		onfulfilled?: ((value: any) => T1 | PromiseLike<T1>) | undefined | null,
		onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | undefined | null
	): PromiseLike<T1 | T2> {
		return this.promise.then(onfulfilled, onrejected);
	}

	/**
	 * Defines the reference to the scene where to play the tweens.
	 */
	public static Scene: Nullable<Scene> = null;

	/**
	 * Defines the default easing function used when playing tweens.
	 */
	public static DefaultEasing: Nullable<ITweenEasingConfiguration> = null;

	/**
	 * Kills (stops) all the tweens that animate to given target.
	 * @param target defines the reference to the target to kill all its attached tweens.
	 * @returns true if at least one tween has been killed.
	 */
	public static killTweensOf<T>(target: T | T[]): boolean {
		target = Array.isArray(target) ? target : [target];

		const result = target.map((t) => {
			const tweens = tweensMap.get(t);
			if (!tweens?.length) {
				return false;
			}

			tweens.forEach((t) => t.stop());
			tweensMap.delete(t);

			return true;
		});

		return result.includes(true);
	}

	public static killAllTweens(): void {
		tweensMap.forEach((v) => {
			v.forEach((t) => t.stop());
		});

		tweensMap.clear();
	}

	/**
	 * Creates a new tween reference to anmate CSS properties of the given HTML element for the given duration.
	 * @param target defines the target HTML object to animate its properties.
	 * @param duration defines the duration of the animation(s) expressed in seconds.
	 * @param properties defines the dictionary of all animated properties.
	 * @returns a reference to a tween.
	 */
	public static createForCSS(target: HTMLElement, duration: number, options: ITweenConfiguration): Tween {
		this._configureOptions(options);

		const keys = Object.keys(options.properties!);
		const values: { [propertyPath: string]: number } = {};

		keys.forEach((k: any) => {
			values[k] = options.properties![k].from ?? (parseFloat(target.style[k]) || 0);
		});

		return this.create<any>(values, duration, {
			...options,
			onUpdate: () => {
				keys.forEach((k: any) => {
					target.style[k] = values[k]?.toString();
				});
			},
		});
	}

	private static _configureOptions(options: ITweenConfiguration): void {
		options.properties ??= {};

		Object.keys(options).forEach((k) => {
			if (reservedProperties.includes(k)) {
				return;
			}

			options.properties![k] = options[k];
		});
	}

	/**
	 * Creates a new tween reference to animate properties of the given target for the given duration.
	 * @param target defines the target object to animate its properties.
	 * @param duration defines the duration of the animation(s) expressed in seconds.
	 * @param options defines the options the tween (easing, delay, etc.).
	 * @returns a reference to a tween.
	 */
	public static create<T>(target: Nullable<T> | Nullable<T>[], duration: number, options: ITweenConfiguration): Tween {
		if (!this.Scene) {
			throw new Error("Scene not available for tween");
		}

		if (options.killAllTweensOfTarget) {
			this.killTweensOf(target);
		}

		this._configureOptions(options);

		target = Array.isArray(target) ? target : [target];

		const animations: Animation[] = [];
		const animatables: Animatable[] = [];

		const scene = options.scene ?? Tween.Scene!;
		const properties = Object.keys(options.properties!);

		let maxFrame = 0;

		target.forEach((t) => {
			if (!t) {
				return;
			}

			registerTarget(t);

			properties.forEach((k) => {
				const property = options.properties![k];

				if ((property ?? null) === null) {
					return;
				}

				const targetProperty = k.split(".").pop()!;
				const effectiveTarget = this._getEffectiveTarget(t, k);
				const animatedProperty = effectiveTarget?.[targetProperty];

				if ((animatedProperty ?? null) === null) {
					return console.warn(`Can't create tween for animated property "${k}" on target ${t}: the property doesn't exist.`);
				}

				// Delay
				const delay = (options.delay ?? 0) + (property.delay ?? 0);

				// Determine end frame
				let endFrame = 60 * (property.duration ?? duration);
				endFrame += 60 * delay;

				maxFrame = Math.max(maxFrame, endFrame);

				// Create animation
				const endValue = property.value ?? property.to ?? property;
				const startValue = property.from ?? animatedProperty.clone?.() ?? animatedProperty;

				if (!options.noOptimize) {
					if (!delay && (endValue.equals?.(startValue) || endValue === startValue)) {
						return;
					}
				}

				if (endFrame) {
					effectiveTarget[targetProperty] = startValue.clone?.() ?? startValue;
				} else {
					return (effectiveTarget[targetProperty] = endValue.clone?.() ?? endValue);
				}

				const keys: IAnimationKey[] = [];

				if (delay) {
					keys.push({ frame: 0, value: startValue });
				}

				keys.push(
					...[
						{ frame: 60 * delay, value: startValue },
						{ frame: endFrame, value: endValue },
					]
				);

				const a = new Animation(k, k, 60, getAnimationTypeForObject(animatedProperty)!, Animation.ANIMATIONLOOPMODE_RELATIVE);
				a.setKeys(keys);

				// Easing
				const easing = property.easing ?? options.easing ?? Tween.DefaultEasing;
				if (easing?.type) {
					if ((easing.mode ?? null) !== null) {
						easing.type.setEasingMode(easing.mode);
					}

					a.setEasingFunction(easing.type);
				}

				animations.push(a);
			});

			const animatable = scene.beginDirectAnimation(t, animations, 0, maxFrame, options.loop ?? false, 1.0, () => {
				options.onComplete?.();
			});

			animatables.push(animatable);
		});

		scene.onBeforeAnimationsObservable.addOnce(() => options.onStart?.());

		const tween = new Tween(animatables);

		if (options.onUpdate) {
			const observer = scene.onAfterRenderObservable.add(() => {
				options.onUpdate?.();
			});

			void tween.then(() => scene.onAfterRenderObservable.remove(observer));
		}

		// Manage tweens cache
		target.forEach((t) => {
			if (!t) {
				return;
			}

			registerTween(t, tween);
			registerTweenEnded(t, tween);
			checkTargetTweens(t);
		});

		return tween;
	}

	/**
	 * Given a path to a property, return the effective property by deconstructing the path.
	 */
	private static _getEffectiveTarget(target: any, propertyPath: string): any {
		const properties = propertyPath.split(".");

		for (let index = 0; index < properties.length - 1; index++) {
			target = target[properties[index]!];
		}

		return target;
	}
}
