import { IEditorAnimationKey } from "../animation/animation";

import { isCinematicKeyCut } from "./guards";
import { ICinematic, ICinematicAnimationGroup, ICinematicKey, ICinematicKeyCut, ICinematicSequence, ICinematicTrack } from "./typings";

/**
 * Defines the name of the sequence created for the cinematics saved before sequences existed.
 */
export const defaultCinematicSequenceName = "Sequence 1";

/**
 * Returns the sequences of the given cinematic. The tracks of the cinematics saved before sequences existed are returned
 * in a single sequence.
 * @param cinematic defines the reference to the cinematic (parsed or not) to get its sequences.
 */
export function getCinematicSequences(cinematic: ICinematic): ICinematicSequence[] {
	return cinematic.sequences ?? [{ name: defaultCinematicSequenceName, tracks: cinematic.tracks ?? [] }];
}

/**
 * Returns the number of frames an animation group of a track plays, its speed and repeat count included.
 * @param animationGroup defines the reference to the animation group key of the track.
 */
export function getCinematicAnimationGroupFramesCount(animationGroup: ICinematicAnimationGroup): number {
	const framesCount = (animationGroup.endFrame - animationGroup.startFrame) * (1 + (animationGroup.repeatCount ?? 0));
	return framesCount / (Math.abs(animationGroup.speed) || 1);
}

/**
 * Returns the number of frames of the given sequence: a sequence lasts until its last key, event, sound or animation group.
 * @param sequence defines the reference to the sequence to get its number of frames.
 */
export function getCinematicSequenceFramesCount(sequence: ICinematicSequence): number {
	let framesCount = 0;

	sequence.tracks.forEach((track) => {
		[track.keyFrameAnimations, track.animationGroupWeight, track.soundVolume].forEach((keys) => {
			if (Array.isArray(keys)) {
				keys.forEach((key) => {
					framesCount = Math.max(framesCount, getKeyFrame(key));
				});
			}
		});

		track.keyFrameEvents?.forEach((event) => {
			framesCount = Math.max(framesCount, event.frame);
		});

		track.sounds?.forEach((sound) => {
			framesCount = Math.max(framesCount, sound.frame + (sound.endFrame - sound.startFrame));
		});

		track.animationGroups?.forEach((animationGroup) => {
			framesCount = Math.max(framesCount, animationGroup.frame + getCinematicAnimationGroupFramesCount(animationGroup));
		});
	});

	return framesCount;
}

/**
 * Returns the frame, in the whole cinematic, where the given sequence starts: after all the sequences placed before it.
 * @param cinematic defines the reference to the cinematic that contains the sequence.
 * @param sequence defines the reference to the sequence to get its start frame.
 */
export function getCinematicSequenceStartFrame(cinematic: ICinematic, sequence: ICinematicSequence): number {
	let startFrame = 0;

	for (const s of getCinematicSequences(cinematic)) {
		if (s === sequence) {
			break;
		}

		startFrame += getCinematicSequenceFramesCount(s);
	}

	return startFrame;
}

/**
 * Returns the number of frames of the given cinematic: the sum of the number of frames of all its sequences.
 * @param cinematic defines the reference to the cinematic to get its number of frames.
 */
export function getCinematicFramesCount(cinematic: ICinematic): number {
	return getCinematicSequences(cinematic).reduce((framesCount, sequence) => framesCount + getCinematicSequenceFramesCount(sequence), 0);
}

interface ICinematicTrackPart {
	track: ICinematicTrack;
	startFrame: number;
}

/**
 * Merges the sequences of the given cinematic into the tracks of a single timeline: keys are moved to the frames of the
 * whole cinematic and the tracks that animate the same target (property, animation group or sound) in several sequences
 * are merged into a single track. A merged value holds until the next sequence that animates it starts, and jumps there to
 * its value in that sequence, like a cut. Tracks of a single sequence starting at frame 0 are returned as is.
 * @param cinematic defines the reference to the cinematic to merge its sequences.
 */
export function mergeCinematicSequences(cinematic: ICinematic): ICinematicTrack[] {
	const merged: ICinematicTrackPart[][] = [];
	const mergedByTarget = new Map<unknown, ICinematicTrackPart[][]>();
	const propertyTargets = new Map<unknown, Map<string, object>>();

	let startFrame = 0;

	getCinematicSequences(cinematic).forEach((sequence) => {
		// A target animated by several tracks of a same sequence keeps several tracks: the n-th track of each sequence
		// for a target is merged with the n-th tracks of the other sequences.
		const occurrences = new Map<unknown, number>();

		sequence.tracks.forEach((track) => {
			const target = getTrackTarget(track, propertyTargets);

			let parts: ICinematicTrackPart[] | undefined;

			if (target) {
				const occurrence = occurrences.get(target) ?? 0;
				occurrences.set(target, occurrence + 1);

				let targetParts = mergedByTarget.get(target);
				if (!targetParts) {
					targetParts = [];
					mergedByTarget.set(target, targetParts);
				}

				parts = targetParts[occurrence];
				if (!parts) {
					parts = targetParts[occurrence] = [];
					merged.push(parts);
				}
			} else {
				parts = [];
				merged.push(parts);
			}

			parts.push({ track, startFrame });
		});

		startFrame += getCinematicSequenceFramesCount(sequence);
	});

	return merged.map((parts) => mergeTrackParts(parts));
}

/**
 * Returns the object that identifies what the given track animates, so tracks animating the same target in several
 * sequences can be merged. Events are never merged.
 */
function getTrackTarget(track: ICinematicTrack, propertyTargets: Map<unknown, Map<string, object>>): unknown {
	if (track.keyFrameEvents) {
		return null;
	}

	if (track.propertyPath) {
		const object = track.defaultRenderingPipeline ? "defaultRenderingPipeline" : track.volumetricLightScattering ? "volumetricLightScattering" : track.node;
		if (!object) {
			return null;
		}

		let properties = propertyTargets.get(object);
		if (!properties) {
			properties = new Map();
			propertyTargets.set(object, properties);
		}

		let target = properties.get(track.propertyPath);
		if (!target) {
			target = {};
			properties.set(track.propertyPath, target);
		}

		return target;
	}

	return track.animationGroup ?? track.sound ?? null;
}

function mergeTrackParts(parts: ICinematicTrackPart[]): ICinematicTrack {
	const track = parts[0].track;

	if (parts.length === 1 && parts[0].startFrame === 0) {
		return track;
	}

	return {
		...track,
		keyFrameAnimations: mergeKeys(parts, (track) => track.keyFrameAnimations),
		animationGroupWeight: mergeKeys(parts, (track) => track.animationGroupWeight),
		soundVolume: mergeKeys(parts, (track) => track.soundVolume),

		animationGroups: mergeFrameItems(parts, (track) => track.animationGroups),
		sounds: mergeFrameItems(parts, (track) => track.sounds),
		keyFrameEvents: mergeFrameItems(parts, (track) => track.keyFrameEvents),
	};
}

type CinematicKeyFrameAnimations = ICinematicTrack["keyFrameAnimations"];

/**
 * Merges the keys of the given parts of a track: keys are moved to the start of their sequence and, between two
 * sequences, a cut makes the value hold until the next sequence starts and jump to the first value of that sequence.
 */
function mergeKeys(parts: ICinematicTrackPart[], getKeys: (track: ICinematicTrack) => CinematicKeyFrameAnimations): CinematicKeyFrameAnimations {
	if (!parts.some((part) => Array.isArray(getKeys(part.track)))) {
		return getKeys(parts[0].track);
	}

	const result: (ICinematicKey | ICinematicKeyCut)[] = [];

	parts.forEach((part) => {
		const keys = getKeys(part.track);
		if (!Array.isArray(keys) || !keys.length) {
			return;
		}

		const shiftedKeys = keys.map((key) => shiftKey(key, part.startFrame)).sort((a, b) => getKeyFrame(a) - getKeyFrame(b));

		const previousKey = result[result.length - 1];
		if (previousKey) {
			const firstKey = shiftedKeys[0];

			// The first key of the sequence is the value after the jump when it is at the start of the sequence.
			// Otherwise, the first value of the sequence holds until its first key.
			let afterJump: IEditorAnimationKey;
			if (getKeyFrame(firstKey) > part.startFrame) {
				afterJump = { frame: part.startFrame, value: getInKey(firstKey).value };
			} else {
				shiftedKeys.shift();
				afterJump = getOutKey(firstKey);
			}

			result.push({
				type: "cut",
				key1: { frame: part.startFrame, value: getOutKey(previousKey).value },
				key2: afterJump,
			});
		}

		result.push(...shiftedKeys);
	});

	return result;
}

function mergeFrameItems<T extends { frame: number }>(parts: ICinematicTrackPart[], getItems: (track: ICinematicTrack) => T[] | undefined): T[] | undefined {
	if (!parts.some((part) => getItems(part.track))) {
		return getItems(parts[0].track);
	}

	return parts.flatMap((part) => {
		return (getItems(part.track) ?? []).map((item) => ({ ...item, frame: item.frame + part.startFrame }));
	});
}

function shiftKey(key: ICinematicKey | ICinematicKeyCut, frames: number): ICinematicKey | ICinematicKeyCut {
	if (isCinematicKeyCut(key)) {
		return {
			...key,
			key1: { ...key.key1, frame: key.key1.frame + frames },
			key2: { ...key.key2, frame: key.key2.frame + frames },
		};
	}

	return { ...key, frame: key.frame + frames };
}

function getKeyFrame(key: ICinematicKey | ICinematicKeyCut): number {
	return isCinematicKeyCut(key) ? key.key1.frame : key.frame;
}

/**
 * Returns the key that gives the value before the given key: the first key of a cut.
 */
function getInKey(key: ICinematicKey | ICinematicKeyCut): IEditorAnimationKey {
	return isCinematicKeyCut(key) ? key.key1 : key;
}

/**
 * Returns the key that gives the value after the given key: the second key of a cut.
 */
function getOutKey(key: ICinematicKey | ICinematicKeyCut): IEditorAnimationKey {
	return isCinematicKeyCut(key) ? key.key2 : key;
}
