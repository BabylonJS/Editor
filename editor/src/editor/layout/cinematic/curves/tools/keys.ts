import { Color3, Color4, IAnimationKey, Vector2, Vector3 } from "babylonjs";
import { ICinematicKey, ICinematicKeyCut, ICinematicTrack, isCinematicKeyCut } from "babylonjs-editor-tools";

import { isColor3, isColor4, isVector2, isVector3 } from "../../../../../tools/guards/math";

import { normalizeSoundVolumeKeys } from "./sound";
import { normalizeAnimationGroupWeightKeys } from "./animation-group";

export type CinematicCurveKey = ICinematicKey | ICinematicKeyCut;

/**
 * A component of an animated value drawn as a curve: null for numbers, "x", "y" or "z" for vectors and "r", "g", "b" or "a" for colors.
 */
export type CinematicCurveComponent = string | null;

/**
 * Side of a key: "in" is the end of the segment before the key, "out" the start of the segment after it.
 */
export type CinematicCurveSide = "in" | "out";

export type CinematicCurveTangentMode = "auto" | "flat" | "linear";

/**
 * Returns the keys edited as curves for the given track: the keys of the animated property, the volume of the sound or
 * the weight of the animation group. Returns null if the track has no curve.
 */
export function getTrackCurveKeys(track: ICinematicTrack): CinematicCurveKey[] | null {
	if (track.keyFrameAnimations) {
		return track.keyFrameAnimations;
	}

	if (track.sounds) {
		normalizeSoundVolumeKeys(track);
		return track.soundVolume ?? null;
	}

	if (track.animationGroups) {
		normalizeAnimationGroupWeightKeys(track);
		return track.animationGroupWeight ?? null;
	}

	return null;
}

/**
 * Returns the components drawn as curves for the given value, or null if the value can't be drawn as curves.
 */
export function getCurveComponents(value: unknown): CinematicCurveComponent[] | null {
	if (typeof value === "number") {
		return [null];
	}

	if (isVector2(value)) {
		return ["x", "y"];
	}

	if (isVector3(value)) {
		return ["x", "y", "z"];
	}

	if (isColor3(value)) {
		return ["r", "g", "b"];
	}

	if (isColor4(value)) {
		return ["r", "g", "b", "a"];
	}

	return null;
}

export function getComponentValue(value: any, component: CinematicCurveComponent): number {
	return component === null ? value : value[component];
}

/**
 * Creates a value of the same type as the given sample (number, vector or color) with the given components.
 */
export function createCurveValue(sample: unknown, components: number[]): any {
	if (typeof sample === "number") {
		return components[0];
	}

	if (isVector2(sample)) {
		return new Vector2(components[0], components[1]);
	}

	if (isVector3(sample)) {
		return new Vector3(components[0], components[1], components[2]);
	}

	if (isColor3(sample)) {
		return new Color3(components[0], components[1], components[2]);
	}

	if (isColor4(sample)) {
		return new Color4(components[0], components[1], components[2], components[3]);
	}

	return null;
}

export function getCurveKeyFrame(key: CinematicCurveKey): number {
	return isCinematicKeyCut(key) ? key.key1.frame : key.frame;
}

export function setCurveKeyFrame(key: CinematicCurveKey, frame: number): void {
	if (isCinematicKeyCut(key)) {
		key.key1.frame = frame;
		key.key2.frame = frame;
	} else {
		key.frame = frame;
	}
}

/**
 * Returns the animation key ending the segment before the given key: the first key of a cut, the key itself otherwise.
 */
export function getInKey(key: CinematicCurveKey): IAnimationKey {
	return isCinematicKeyCut(key) ? key.key1 : key;
}

/**
 * Returns the animation key starting the segment after the given key: the second key of a cut, the key itself otherwise.
 */
export function getOutKey(key: CinematicCurveKey): IAnimationKey {
	return isCinematicKeyCut(key) ? key.key2 : key;
}

export function getSideKey(key: CinematicCurveKey, side: CinematicCurveSide): IAnimationKey {
	return side === "in" ? getInKey(key) : getOutKey(key);
}

export function isTangentDefined(tangent: unknown): boolean {
	return tangent !== undefined && tangent !== null;
}

/**
 * Like Babylon.js animations, a segment is interpolated with its tangents (cubic hermite) only when its start key has an
 * out tangent and its end key has an in tangent. Otherwise it is linear.
 */
export function isHermiteSegment(keys: CinematicCurveKey[], segment: number): boolean {
	return isTangentDefined(getOutKey(keys[segment]).outTangent) && isTangentDefined(getInKey(keys[segment + 1]).inTangent);
}

export interface ICinematicCurveSegment {
	frame0: number;
	frame1: number;
	value0: number;
	value1: number;
	/**
	 * Slopes, in value per frame, at the start and the end of the segment.
	 */
	slope0: number;
	slope1: number;
	hermite: boolean;
}

/**
 * Returns the segment between the keys at the given index and the next one, for the given component.
 */
export function getCurveSegment(keys: CinematicCurveKey[], segment: number, component: CinematicCurveComponent): ICinematicCurveSegment {
	const start = getOutKey(keys[segment]);
	const end = getInKey(keys[segment + 1]);

	const frame0 = getCurveKeyFrame(keys[segment]);
	const frame1 = getCurveKeyFrame(keys[segment + 1]);
	const value0 = getComponentValue(start.value, component);
	const value1 = getComponentValue(end.value, component);

	const hermite = isHermiteSegment(keys, segment);
	const chord = frame1 !== frame0 ? (value1 - value0) / (frame1 - frame0) : 0;

	return {
		frame0,
		frame1,
		value0,
		value1,
		hermite,
		slope0: hermite ? getComponentValue(start.outTangent, component) : chord,
		slope1: hermite ? getComponentValue(end.inTangent, component) : chord,
	};
}

/**
 * Evaluates the given segment at the given frame exactly like Babylon.js animations do.
 */
export function evaluateCurveSegment(segment: ICinematicCurveSegment, frame: number): number {
	const duration = segment.frame1 - segment.frame0;
	if (duration <= 0) {
		return segment.value1;
	}

	const t = (frame - segment.frame0) / duration;

	if (!segment.hermite) {
		return segment.value0 + (segment.value1 - segment.value0) * t;
	}

	const t2 = t * t;
	const t3 = t2 * t;

	return (2 * t3 - 3 * t2 + 1) * segment.value0 + (t3 - 2 * t2 + t) * segment.slope0 * duration + (-2 * t3 + 3 * t2) * segment.value1 + (t3 - t2) * segment.slope1 * duration;
}

/**
 * Returns the slope, in value per frame, of the given segment at the given frame.
 */
export function getCurveSegmentSlope(segment: ICinematicCurveSegment, frame: number): number {
	const duration = segment.frame1 - segment.frame0;
	if (duration <= 0) {
		return 0;
	}

	if (!segment.hermite) {
		return (segment.value1 - segment.value0) / duration;
	}

	const t = (frame - segment.frame0) / duration;
	const t2 = t * t;

	const derivative =
		(6 * t2 - 6 * t) * segment.value0 + (3 * t2 - 4 * t + 1) * segment.slope0 * duration + (-6 * t2 + 6 * t) * segment.value1 + (3 * t2 - 2 * t) * segment.slope1 * duration;

	return derivative / duration;
}

/**
 * Returns the minimum and maximum values reached by the given segment, overshoots of the tangents included.
 */
export function getCurveSegmentRange(segment: ICinematicCurveSegment): [number, number] {
	let min = Math.min(segment.value0, segment.value1);
	let max = Math.max(segment.value0, segment.value1);

	const duration = segment.frame1 - segment.frame0;
	if (!segment.hermite || duration <= 0) {
		return [min, max];
	}

	// Roots of the derivative of the hermite polynomial: a.t² + b.t + c = 0.
	const m0 = segment.slope0 * duration;
	const m1 = segment.slope1 * duration;

	const a = 6 * segment.value0 + 3 * m0 - 6 * segment.value1 + 3 * m1;
	const b = -6 * segment.value0 - 4 * m0 + 6 * segment.value1 - 2 * m1;
	const c = m0;

	const roots: number[] = [];
	if (Math.abs(a) < 1e-12) {
		if (Math.abs(b) > 1e-12) {
			roots.push(-c / b);
		}
	} else {
		const delta = b * b - 4 * a * c;
		if (delta >= 0) {
			const sqrt = Math.sqrt(delta);
			roots.push((-b + sqrt) / (2 * a), (-b - sqrt) / (2 * a));
		}
	}

	roots.forEach((t) => {
		if (t > 0 && t < 1) {
			const value = evaluateCurveSegment(segment, segment.frame0 + t * duration);
			min = Math.min(min, value);
			max = Math.max(max, value);
		}
	});

	return [min, max];
}

/**
 * Evaluates the curve of the given component at the given frame. Before the first key and after the last one, the
 * value of the closest key is held like in the cinematic.
 */
export function evaluateCurve(keys: CinematicCurveKey[], component: CinematicCurveComponent, frame: number): number {
	if (frame <= getCurveKeyFrame(keys[0])) {
		return getComponentValue(getInKey(keys[0]).value, component);
	}

	for (let i = 0; i < keys.length - 1; ++i) {
		if (frame <= getCurveKeyFrame(keys[i + 1])) {
			return evaluateCurveSegment(getCurveSegment(keys, i, component), frame);
		}
	}

	return getComponentValue(getOutKey(keys[keys.length - 1]).value, component);
}

/**
 * Returns the slope, in value per frame, the curve has on the given side of the key at the given index: its tangent when
 * the segment on that side is interpolated with tangents, the slope of the straight segment otherwise.
 */
export function getKeySlope(keys: CinematicCurveKey[], index: number, side: CinematicCurveSide, component: CinematicCurveComponent): number {
	const segment = side === "out" ? index : index - 1;

	if (segment < 0 || segment >= keys.length - 1) {
		const tangent = side === "out" ? getOutKey(keys[index]).outTangent : getInKey(keys[index]).inTangent;
		return isTangentDefined(tangent) ? getComponentValue(tangent, component) : 0;
	}

	const curveSegment = getCurveSegment(keys, segment, component);
	return side === "out" ? curveSegment.slope0 : curveSegment.slope1;
}

/**
 * Makes the segment at the given index interpolated with tangents. A linear segment gets the tangents of the straight
 * line on all its components so its shape doesn't change. Tangents left on one end of a linear segment are ignored by
 * Babylon.js, they are replaced too.
 */
export function ensureHermiteSegment(keys: CinematicCurveKey[], segment: number): void {
	if (isHermiteSegment(keys, segment)) {
		return;
	}

	const start = getOutKey(keys[segment]);
	const end = getInKey(keys[segment + 1]);

	const components = getCurveComponents(start.value);
	if (!components) {
		return;
	}

	const slopes = components.map((component) => getCurveSegment(keys, segment, component).slope0);

	start.outTangent = createCurveValue(start.value, slopes);
	end.inTangent = createCurveValue(end.value, slopes);
}

/**
 * Sets the slope, in value per frame, of the given component on the given side of the key at the given index. The segment
 * on that side becomes interpolated with tangents when it was linear. Sides without segment (before the first key, after
 * the last one) are ignored as they have no effect.
 */
export function setKeySlope(keys: CinematicCurveKey[], index: number, side: CinematicCurveSide, component: CinematicCurveComponent, slope: number): void {
	const segment = side === "out" ? index : index - 1;
	if (segment < 0 || segment >= keys.length - 1) {
		return;
	}

	ensureHermiteSegment(keys, segment);

	const key = getSideKey(keys[index], side);
	const property = side === "out" ? "outTangent" : "inTangent";

	if (component === null) {
		key[property] = slope;
	} else {
		key[property][component] = slope;
	}
}

/**
 * Returns wether or not the in and out tangents of the given key are linked: editing one edits the other so the curve
 * stays smooth through the key. Keys whose link was never chosen are linked unless their tangents already differ, which
 * means they were broken on purpose. Cuts are discontinuous by nature: their tangents are never linked.
 */
export function isKeyTangentLinked(key: CinematicCurveKey): boolean {
	if (isCinematicKeyCut(key)) {
		return false;
	}

	if (key.lockedTangent !== undefined) {
		return key.lockedTangent;
	}

	if (!isTangentDefined(key.inTangent) || !isTangentDefined(key.outTangent)) {
		return true;
	}

	const components = getCurveComponents(key.value) ?? [];
	return components.every((component) => Math.abs(getComponentValue(key.inTangent, component) - getComponentValue(key.outTangent, component)) < 1e-6);
}

/**
 * Links or breaks the tangents of the key at the given index. When linked, both tangents take the average of their slopes
 * so the curve becomes smooth through the key.
 */
export function setKeyTangentLinked(keys: CinematicCurveKey[], index: number, linked: boolean): void {
	const key = keys[index];
	if (isCinematicKeyCut(key)) {
		return;
	}

	key.lockedTangent = linked;

	if (!linked || index === 0 || index === keys.length - 1) {
		return;
	}

	const components = getCurveComponents(key.value) ?? [];
	const slopes = components.map((component) => (getKeySlope(keys, index, "in", component) + getKeySlope(keys, index, "out", component)) * 0.5);

	components.forEach((component, componentIndex) => {
		setKeySlope(keys, index, "in", component, slopes[componentIndex]);
		setKeySlope(keys, index, "out", component, slopes[componentIndex]);
	});
}

/**
 * Applies the given tangent mode to the key at the given index, like the tangent presets of animation software:
 * - auto: smooth tangents following the neighbor keys,
 * - flat: horizontal tangents,
 * - linear: no tangents, the segments around the key are straight lines.
 */
export function applyKeyTangentMode(keys: CinematicCurveKey[], index: number, mode: CinematicCurveTangentMode): void {
	const key = keys[index];
	const components = getCurveComponents(getInKey(key).value) ?? [];

	if (mode === "linear") {
		delete getInKey(key).inTangent;
		delete getOutKey(key).outTangent;
		return;
	}

	components.forEach((component) => {
		let inSlope = 0;
		let outSlope = 0;

		if (mode === "auto") {
			const previous = index > 0 ? index - 1 : null;
			const next = index < keys.length - 1 ? index + 1 : null;

			const inValue = getComponentValue(getInKey(key).value, component);
			const outValue = getComponentValue(getOutKey(key).value, component);
			const frame = getCurveKeyFrame(key);

			const previousSlope = previous !== null ? (inValue - getComponentValue(getOutKey(keys[previous]).value, component)) / (frame - getCurveKeyFrame(keys[previous])) : null;
			const nextSlope = next !== null ? (getComponentValue(getInKey(keys[next]).value, component) - outValue) / (getCurveKeyFrame(keys[next]) - frame) : null;

			if (isCinematicKeyCut(key)) {
				inSlope = previousSlope ?? 0;
				outSlope = nextSlope ?? 0;
			} else if (previous !== null && next !== null) {
				inSlope = outSlope =
					(getComponentValue(getInKey(keys[next]).value, component) - getComponentValue(getOutKey(keys[previous]).value, component)) /
					(getCurveKeyFrame(keys[next]) - getCurveKeyFrame(keys[previous]));
			} else {
				inSlope = outSlope = previousSlope ?? nextSlope ?? 0;
			}
		}

		setKeySlope(keys, index, "in", component, isFinite(inSlope) ? inSlope : 0);
		setKeySlope(keys, index, "out", component, isFinite(outSlope) ? outSlope : 0);
	});

	if (!isCinematicKeyCut(key)) {
		key.lockedTangent = true;
	}
}

/**
 * Inserts a key at the given frame without changing the shape of the curve: the value and the tangents of the new key
 * are the ones of the curve at that frame. Returns the new key, or null if a key already exists at that frame.
 */
export function insertCurveKey(keys: CinematicCurveKey[], frame: number): ICinematicKey | null {
	if (keys.some((key) => getCurveKeyFrame(key) === frame)) {
		return null;
	}

	const sample = getInKey(keys[0]).value;
	const components = getCurveComponents(sample);
	if (!components) {
		return null;
	}

	const index = keys.findIndex((key) => getCurveKeyFrame(key) > frame);
	const segment = index > 0 ? index - 1 : null;
	const hermite = segment !== null && isHermiteSegment(keys, segment);

	const values = components.map((component) => evaluateCurve(keys, component, frame));

	const key: ICinematicKey = {
		type: "key",
		frame,
		value: createCurveValue(sample, values),
	};

	if (hermite) {
		const slopes = components.map((component) => getCurveSegmentSlope(getCurveSegment(keys, segment!, component), frame));

		key.inTangent = createCurveValue(sample, slopes);
		key.outTangent = createCurveValue(sample, slopes);
		key.lockedTangent = true;
	}

	keys.splice(index === -1 ? keys.length : index, 0, key);

	return key;
}

/**
 * Snapshot of an array of keys and of their content, used to undo and redo edits made on curves.
 */
export interface ICinematicCurveKeysSnapshot {
	keys: CinematicCurveKey[];
	data: any[];
}

export function snapshotCurveKeys(keys: CinematicCurveKey[]): ICinematicCurveKeysSnapshot {
	return {
		keys: keys.slice(),
		data: keys.map((key) => {
			if (isCinematicKeyCut(key)) {
				return {
					key1: snapshotAnimationKey(key.key1),
					key2: snapshotAnimationKey(key.key2),
				};
			}

			return snapshotAnimationKey(key);
		}),
	};
}

/**
 * Restores the given array of keys as it was when the snapshot was taken. Keys and values are updated in place as they
 * are referenced by the animations generated for the preview.
 */
export function restoreCurveKeys(keys: CinematicCurveKey[], snapshot: ICinematicCurveKeysSnapshot): void {
	keys.splice(0, keys.length, ...snapshot.keys);

	snapshot.keys.forEach((key, index) => {
		const data = snapshot.data[index];

		if (isCinematicKeyCut(key)) {
			restoreAnimationKey(key.key1, data.key1);
			restoreAnimationKey(key.key2, data.key2);
		} else {
			restoreAnimationKey(key, data);
		}
	});
}

function cloneValue(value: any): any {
	return value?.clone?.() ?? value;
}

function snapshotAnimationKey(key: IAnimationKey): any {
	return {
		frame: key.frame,
		value: cloneValue(key.value),
		inTangent: cloneValue(key.inTangent),
		outTangent: cloneValue(key.outTangent),
		lockedTangent: key.lockedTangent,
	};
}

function restoreAnimationKey(key: IAnimationKey, data: any): void {
	key.frame = data.frame;

	if (key.value?.copyFrom && data.value?.getClassName?.() === key.value.getClassName?.()) {
		key.value.copyFrom(data.value);
	} else {
		key.value = cloneValue(data.value);
	}

	(["inTangent", "outTangent", "lockedTangent"] as const).forEach((property) => {
		if (data[property] === undefined) {
			delete key[property];
		} else {
			key[property] = cloneValue(data[property]);
		}
	});
}
