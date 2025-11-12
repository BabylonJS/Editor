import { IAnimationKey } from "@babylonjs/core/Animations/animationKey";

export interface ICinematic {
	name: string;
	framesPerSecond: number;
	tracks: ICinematicTrack[];

	outputFramesPerSecond: number;
}

export interface ICinematicTrack {
	_id?: string;

	animationGroup?: any;
	animationGroups?: ICinematicAnimationGroup[];
	animationGroupWeight?: (ICinematicKey | ICinematicKeyCut)[];

	node?: any;
	defaultRenderingPipeline?: boolean;

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
