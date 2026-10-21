import { RampOptions, SceneNode, StaticSound, StaticSoundPlayOptions, StaticSoundStopOptions, TransformNode } from "@babylonjs/lite";

import { Observable } from "./observable";

/**
 * This interface is used to define extra properties on TransformNode. For example for SoundNode support.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface SoundNode extends TransformNode {
	soundRelativePath?: string;

	sound?: StaticSound;
	onSoundLoadedObservable: Observable<SoundNode>;

	autoUpdateSpatial: boolean;

	isPaused(): boolean;
	isPlaying(): boolean;
	isStopped(): boolean;

	get volume(): number;
	set volume(value: number);

	get playbackRate(): number;
	set playbackRate(value: number);

	setVolume(volume: number, options?: Partial<RampOptions> | null): void;

	pause(): void;
	resume(): void;
	stop(options?: Partial<StaticSoundStopOptions>): void;
	play(options?: Partial<StaticSoundPlayOptions>): void;

	setSoundSpatial(spatial: boolean): Promise<void>;

	getClassName(): string;

	cloneAsync(name: string, newParent?: SceneNode | null, doNotCloneChildren?: boolean): Promise<SoundNode>;
}

/**
 * Defines how the spatial sounds that follow their node (`SoundNode.autoUpdateSpatial`) are followed.
 * @see setSpatialSoundsUpdateOptions
 */
export interface ISpatialSoundsUpdateOptions {
	/**
	 * Defines the distance to the listener beyond which a playing sound is followed only every `farUpdateInterval`
	 * frames instead of on every frame. 0, the default, follows every sound on every frame.
	 */
	farDistance: number;
	/**
	 * Defines how many frames apart a sound farther than `farDistance` is followed. 1, the default, is every frame.
	 */
	farUpdateInterval: number;
}

export const spatialSoundsUpdateOptions: ISpatialSoundsUpdateOptions = {
	farDistance: 0,
	farUpdateInterval: 1,
};

/**
 * Sets how the spatial sounds that follow their node (`SoundNode.autoUpdateSpatial`) are followed: by default every
 * playing sound within its max distance is moved to its node on every frame. A sound far from the listener can be
 * moved less often (`farDistance`, `farUpdateInterval`): where it is heard from changes little from one frame to
 * the next, and each update costs the main thread and schedules new parameter values on the audio thread.
 * @param options defines the options to change, the others are kept.
 */
export function setSpatialSoundsUpdateOptions(options: Partial<ISpatialSoundsUpdateOptions>) {
	if (options.farDistance !== undefined) {
		spatialSoundsUpdateOptions.farDistance = Math.max(0, options.farDistance);
	}

	if (options.farUpdateInterval !== undefined) {
		spatialSoundsUpdateOptions.farUpdateInterval = Math.max(1, Math.floor(options.farUpdateInterval));
	}
}
