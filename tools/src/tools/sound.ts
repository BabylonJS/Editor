import { Node } from "@babylonjs/core/node";
import { Observable } from "@babylonjs/core/Misc/observable";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IAudioParameterRampOptions } from "@babylonjs/core/AudioV2/audioParameter";
import { IStaticSoundPlayOptions, IStaticSoundStopOptions, StaticSound } from "@babylonjs/core/AudioV2/abstractAudio/staticSound";

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

	setVolume(volume: number, options?: Partial<IAudioParameterRampOptions> | null): void;

	pause(): void;
	resume(): void;
	stop(options?: Partial<IStaticSoundStopOptions>): void;
	play(options?: Partial<IStaticSoundPlayOptions>): void;

	setSoundSpatial(spatial: boolean): Promise<void>;

	getClassName(): string;

	cloneAsync(name: string, newParent?: Node | null, doNotCloneChildren?: boolean): Promise<SoundNode>;
}
