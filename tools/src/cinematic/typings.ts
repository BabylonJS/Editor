import { IAnimationKey } from "@babylonjs/core/Animations/animationKey";

export interface ICinematic {
	name: string;
	framesPerSecond: number;

	/**
	 * Defines the sequences of the cinematic. Sequences are played one after the other, in order.
	 */
	sequences: ICinematicSequence[];
	/**
	 * Defines the tracks of the cinematics saved before sequences existed: they are moved to a single sequence when the cinematic is parsed.
	 * @deprecated use `sequences` instead.
	 */
	tracks?: ICinematicTrack[];

	outputFramesPerSecond: number;
}

/**
 * A sequence is a part of a cinematic: it contains its own tracks and lasts until its last key. The frames of its keys are
 * relative to the start of the sequence.
 */
export interface ICinematicSequence {
	_id?: string;

	/**
	 * Defines the name of the sequence.
	 */
	name: string;
	/**
	 * Defines the tracks animated by the sequence.
	 */
	tracks: ICinematicTrack[];
}

export interface ICinematicTrack {
	_id?: string;

	animationGroup?: any;
	animationGroups?: ICinematicAnimationGroup[];
	animationGroupWeight?: (ICinematicKey | ICinematicKeyCut)[];

	node?: any;
	defaultRenderingPipeline?: boolean;
	volumetricLightScattering?: boolean;

	sound?: any;
	sounds?: ICinematicSound[];
	soundVolume?: (ICinematicKey | ICinematicKeyCut)[];

	propertyPath?: string;
	keyFrameAnimations?: (ICinematicKey | ICinematicKeyCut)[];
	keyFrameEvents?: ICinematicKeyEvent[];
}

export interface ICinematicAnimationGroup {
	type: "group";
	frame: number;

	speed: number;
	startFrame: number;
	endFrame: number;

	repeatCount?: number;
}

export interface ICinematicKey extends IAnimationKey {
	type: "key" | "cut";
}

export interface ICinematicKeyCut {
	type: "cut";
	key1: IAnimationKey;
	key2: IAnimationKey;
}

export interface ICinematicSound {
	type: "sound";

	frame: number;

	startFrame: number;
	endFrame: number;
}

export interface ICinematicKeyEvent {
	type: "event";
	frame: number;

	data?: any;
}

export type CinematicKeyType = ICinematicKey | ICinematicKeyCut | ICinematicAnimationGroup | ICinematicSound | ICinematicKeyEvent;
