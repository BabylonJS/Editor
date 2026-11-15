import { EditorAnimationEvent } from "./animation-event";

/**
 * Defines a key of an animation. Same shape as the Babylon.js `IAnimationKey` except the values are plain numbers
 * or arrays of numbers (vectors, quaternions, colors) instead of Babylon.js math objects.
 */
export interface IEditorAnimationKey {
	/**
	 * Defines the frame of the key.
	 */
	frame: number;
	/**
	 * Defines the value of the key: a number for float animations, an array of numbers otherwise.
	 */
	value: any;
	/**
	 * Defines the in tangent of the key (Hermite interpolation): a number for float animations, an array of numbers otherwise.
	 */
	inTangent?: any;
	/**
	 * Defines the out tangent of the key (Hermite interpolation): a number for float animations, an array of numbers otherwise.
	 */
	outTangent?: any;
	/**
	 * Defines the interpolation of the key (see `EditorAnimation.KEY_INTERPOLATION_*`).
	 */
	interpolation?: number;
}

/**
 * Defines an animation of a property of an object, the equivalent of a Babylon.js `Animation`. The values of the
 * keys are evaluated the same way Babylon.js does (linear, step and Hermite interpolations, quaternion spherical
 * interpolation, easing function) while the playback (loops, events, ranges, etc.) is handled by the animation
 * groups of the tools: Babylon Lite animations support neither Hermite tangents nor events.
 * @see EditorAnimationGroup
 */
export class EditorAnimation {
	public static readonly ANIMATIONTYPE_FLOAT = 0;
	public static readonly ANIMATIONTYPE_VECTOR3 = 1;
	public static readonly ANIMATIONTYPE_QUATERNION = 2;
	public static readonly ANIMATIONTYPE_MATRIX = 3;
	public static readonly ANIMATIONTYPE_COLOR3 = 4;
	public static readonly ANIMATIONTYPE_VECTOR2 = 5;
	public static readonly ANIMATIONTYPE_SIZE = 6;
	public static readonly ANIMATIONTYPE_COLOR4 = 7;

	public static readonly ANIMATIONLOOPMODE_RELATIVE = 0;
	public static readonly ANIMATIONLOOPMODE_CYCLE = 1;
	public static readonly ANIMATIONLOOPMODE_CONSTANT = 2;
	public static readonly ANIMATIONLOOPMODE_YOYO = 4;
	public static readonly ANIMATIONLOOPMODE_RELATIVE_FROM_CURRENT = 5;

	public static readonly KEY_INTERPOLATION_NONE = 0;
	public static readonly KEY_INTERPOLATION_STEP = 1;

	/**
	 * Defines the name of the animation.
	 */
	public name: string;
	/**
	 * Defines the path of the animated property (ie. "position", "position.x", "material.alpha", etc.).
	 */
	public targetProperty: string;
	/**
	 * Defines the number of frames per second of the animation.
	 */
	public framePerSecond: number;
	/**
	 * Defines the type of the animated value (see `EditorAnimation.ANIMATIONTYPE_*`).
	 */
	public dataType: number;
	/**
	 * Defines the loop mode of the animation (see `EditorAnimation.ANIMATIONLOOPMODE_*`).
	 */
	public loopMode: number;
	/**
	 * Defines the optional easing function applied between each key, taking the gradient in [0, 1] and returning the eased gradient.
	 */
	public easingFunction: ((gradient: number) => number) | null = null;

	private _keys: IEditorAnimationKey[] = [];
	private _events: EditorAnimationEvent[] = [];

	/**
	 * @internal
	 * Incremented each time the keys change so the compiled Babylon Lite clips are rebuilt.
	 */
	public _version: number = 0;

	public constructor(name: string, targetProperty: string, framePerSecond: number, dataType: number, loopMode: number = EditorAnimation.ANIMATIONLOOPMODE_CYCLE) {
		this.name = name;
		this.targetProperty = targetProperty;
		this.framePerSecond = framePerSecond;
		this.dataType = dataType;
		this.loopMode = loopMode;
	}

	/**
	 * Sets the keys of the animation. The keys are sorted by frame.
	 * @param keys defines the list of keys of the animation.
	 */
	public setKeys(keys: IEditorAnimationKey[]): void {
		this._keys = keys.slice().sort((a, b) => a.frame - b.frame);
		++this._version;
	}

	/**
	 * Returns the list of keys of the animation.
	 */
	public getKeys(): IEditorAnimationKey[] {
		return this._keys;
	}

	/**
	 * Returns the frame of the first key of the animation.
	 */
	public getLowestFrame(): number {
		return this._keys[0]?.frame ?? 0;
	}

	/**
	 * Returns the frame of the last key of the animation.
	 */
	public getHighestFrame(): number {
		return this._keys[this._keys.length - 1]?.frame ?? 0;
	}

	/**
	 * Adds an event to the animation, called when the animation reaches the frame of the event.
	 * @param event defines the event to add.
	 */
	public addEvent(event: EditorAnimationEvent): void {
		this._events.push(event);
		this._events.sort((a, b) => a.frame - b.frame);
	}

	/**
	 * Removes all the events of the animation that are set at the given frame.
	 * @param frame defines the frame of the events to remove.
	 */
	public removeEvents(frame: number): void {
		this._events = this._events.filter((event) => event.frame !== frame);
	}

	/**
	 * Returns the list of events of the animation.
	 */
	public getEvents(): EditorAnimationEvent[] {
		return this._events;
	}

	/**
	 * Returns wether or not the animation is evaluated using a step interpolation (all keys use the step interpolation).
	 */
	public isStepInterpolation(): boolean {
		return this._keys.length > 0 && this._keys.every((key) => key.interpolation === EditorAnimation.KEY_INTERPOLATION_STEP);
	}

	/**
	 * Returns the number of components of the animated values (1 for floats, 3 for vectors, etc.).
	 */
	public getStride(): number {
		switch (this.dataType) {
			case EditorAnimation.ANIMATIONTYPE_FLOAT:
				return 1;
			case EditorAnimation.ANIMATIONTYPE_VECTOR2:
			case EditorAnimation.ANIMATIONTYPE_SIZE:
				return 2;
			case EditorAnimation.ANIMATIONTYPE_VECTOR3:
			case EditorAnimation.ANIMATIONTYPE_COLOR3:
				return 3;
			case EditorAnimation.ANIMATIONTYPE_QUATERNION:
			case EditorAnimation.ANIMATIONTYPE_COLOR4:
				return 4;
			default:
				return 16;
		}
	}

	/**
	 * Clones the animation (keys and events).
	 */
	public clone(): EditorAnimation {
		const clone = new EditorAnimation(this.name, this.targetProperty, this.framePerSecond, this.dataType, this.loopMode);
		clone.easingFunction = this.easingFunction;
		clone.setKeys(this._keys.map((key) => ({ ...key })));
		this._events.forEach((event) => clone.addEvent(event.clone()));

		return clone;
	}

	/**
	 * Parses the given serialized Babylon.js animation (`Animation.serialize`) and creates a new animation.
	 * @param data defines the serialized animation.
	 */
	public static Parse(data: any): EditorAnimation {
		const animation = new EditorAnimation(data.name, data.property, data.framePerSecond, data.dataType, data.loopBehavior ?? EditorAnimation.ANIMATIONLOOPMODE_CYCLE);

		const keys: IEditorAnimationKey[] = [];
		const stride = animation.getStride();

		for (const key of data.keys ?? []) {
			const values = key.values ?? [];
			const parsedKey: IEditorAnimationKey = {
				frame: key.frame,
				value: null,
			};

			switch (data.dataType) {
				// Same as Babylon.js: the tangents saved as null are kept (they are considered as zero tangents).
				case EditorAnimation.ANIMATIONTYPE_FLOAT:
					parsedKey.value = values[0];
					if (values.length >= 2) {
						parsedKey.inTangent = values[1];
					}
					if (values.length >= 3) {
						parsedKey.outTangent = values[2];
					}
					if (values.length >= 4) {
						parsedKey.interpolation = values[3] ?? undefined;
					}
					break;

				case EditorAnimation.ANIMATIONTYPE_QUATERNION:
					parsedKey.value = values.slice(0, 4);
					if (values.length >= 8 && values.slice(4, 8).some((value: number) => value !== 0)) {
						parsedKey.inTangent = values.slice(4, 8);
					}
					if (values.length >= 12 && values.slice(8, 12).some((value: number) => value !== 0)) {
						parsedKey.outTangent = values.slice(8, 12);
					}
					if (values.length >= 13) {
						parsedKey.interpolation = values[12];
					}
					break;

				case EditorAnimation.ANIMATIONTYPE_MATRIX:
					parsedKey.value = values.slice(0, 16);
					if (values.length >= 17) {
						parsedKey.interpolation = values[16];
					}
					break;

				default:
					parsedKey.value = values.slice(0, stride);
					if (values[stride]) {
						parsedKey.inTangent = values[stride];
					}
					if (values[stride + 1]) {
						parsedKey.outTangent = values[stride + 1];
					}
					if (values[stride + 2]) {
						parsedKey.interpolation = values[stride + 2];
					}
					break;
			}

			keys.push(parsedKey);
		}

		animation.setKeys(keys);

		return animation;
	}
}

function getKeyValue(value: any, stride: number): number | number[] {
	if (stride === 1) {
		return typeof value === "number" ? value : Number(value ?? 0);
	}

	const result = new Array<number>(stride);
	for (let i = 0; i < stride; ++i) {
		result[i] = value?.[i] ?? 0;
	}

	return result;
}

function hermite(value1: number, tangent1: number, value2: number, tangent2: number, amount: number): number {
	const squared = amount * amount;
	const cubed = amount * squared;
	const part1 = 2.0 * cubed - 3.0 * squared + 1.0;
	const part2 = -2.0 * cubed + 3.0 * squared;
	const part3 = cubed - 2.0 * squared + amount;
	const part4 = cubed - squared;

	return value1 * part1 + value2 * part2 + tangent1 * part3 + tangent2 * part4;
}

function slerp(left: number[], right: number[], amount: number): number[] {
	let num2: number;
	let num3: number;
	let num4 = left[0] * right[0] + left[1] * right[1] + left[2] * right[2] + left[3] * right[3];
	let flag = false;

	if (num4 < 0) {
		flag = true;
		num4 = -num4;
	}

	if (num4 > 0.999999) {
		num3 = 1 - amount;
		num2 = flag ? -amount : amount;
	} else {
		const num5 = Math.acos(num4);
		const num6 = 1.0 / Math.sin(num5);
		num3 = Math.sin((1.0 - amount) * num5) * num6;
		num2 = flag ? -Math.sin(amount * num5) * num6 : Math.sin(amount * num5) * num6;
	}

	return [num3 * left[0] + num2 * right[0], num3 * left[1] + num2 * right[1], num3 * left[2] + num2 * right[2], num3 * left[3] + num2 * right[3]];
}

/**
 * @internal
 * Evaluates the value of the given animation at the given frame, the same way Babylon.js `Animation._interpolate`
 * does: linear, step and Hermite interpolations, spherical interpolation of the quaternions, easing function.
 * Matrices are not interpolated (same as Babylon.js by default).
 * @returns the value at the given frame (a number for float animations, an array of numbers otherwise) or null if the animation has no key.
 */
export function _evaluateAnimationAt(animation: EditorAnimation, frame: number): number | number[] | null {
	const keys = animation.getKeys();
	const keysLength = keys.length;

	if (!keysLength) {
		return null;
	}

	const stride = animation.getStride();

	// Find the last key before the frame
	let low = 0;
	let high = keysLength - 1;
	let key = -1;

	while (low <= high) {
		const middle = (low + high) >> 1;
		if (keys[middle].frame <= frame) {
			key = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}

	if (key < 0) {
		return getKeyValue(keys[0].value, stride);
	}

	if (key + 1 > keysLength - 1) {
		return getKeyValue(keys[keysLength - 1].value, stride);
	}

	const startKey = keys[key];
	const endKey = keys[key + 1];

	const startValue = getKeyValue(startKey.value, stride);
	const endValue = getKeyValue(endKey.value, stride);

	if (startKey.interpolation === EditorAnimation.KEY_INTERPOLATION_STEP) {
		return endKey.frame > frame ? startValue : endValue;
	}

	if (animation.dataType === EditorAnimation.ANIMATIONTYPE_MATRIX) {
		return startValue;
	}

	const useTangent = startKey.outTangent !== undefined && endKey.inTangent !== undefined;
	const frameDelta = endKey.frame - startKey.frame;

	let gradient = (frame - startKey.frame) / frameDelta;
	if (animation.easingFunction) {
		gradient = animation.easingFunction(gradient);
	}

	if (useTangent) {
		const outTangent = getKeyValue(startKey.outTangent, stride);
		const inTangent = getKeyValue(endKey.inTangent, stride);

		if (stride === 1) {
			return hermite(startValue as number, (outTangent as number) * frameDelta, endValue as number, (inTangent as number) * frameDelta, gradient);
		}

		return (startValue as number[]).map((value, index) =>
			hermite(value, (outTangent as number[])[index] * frameDelta, (endValue as number[])[index], (inTangent as number[])[index] * frameDelta, gradient)
		);
	}

	if (stride === 1) {
		return (startValue as number) + ((endValue as number) - (startValue as number)) * gradient;
	}

	if (animation.dataType === EditorAnimation.ANIMATIONTYPE_QUATERNION) {
		return slerp(startValue as number[], endValue as number[], gradient);
	}

	return (startValue as number[]).map((value, index) => value + ((endValue as number[])[index] - value) * gradient);
}
