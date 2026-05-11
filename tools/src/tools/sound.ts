import { Node } from "@babylonjs/core/node";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IAudioParameterRampOptions } from "@babylonjs/core/AudioV2/audioParameter";
import { SpatialAudioAttachmentType } from "@babylonjs/core/AudioV2/spatialAudioAttachmentType";
import { IStaticSoundPlayOptions, IStaticSoundStopOptions, StaticSound } from "@babylonjs/core/AudioV2/abstractAudio/staticSound";

/**
 * This interface is used to define extra properties on TransformNode. For example for SoundNode support.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface SoundNode extends TransformNode {
	isSoundNode?: boolean;
	soundRelativePath?: string;

	sound?: StaticSound;

	isPaused(): boolean;
	isPlaying(): boolean;

	get volume(): number;
	set volume(value: number);

	get playbackRate(): number;
	set playbackRate(value: number);

	setVolume(volume: number, options?: Partial<IAudioParameterRampOptions> | null): void;

	pause(): void;
	resume(): void;
	stop(options?: Partial<IStaticSoundStopOptions>): void;
	play(options?: Partial<IStaticSoundPlayOptions>): void;
	attachTo(sceneNode: Node | null, useBoundingBox?: boolean, attachmentType?: SpatialAudioAttachmentType): void;
}
