import { Node } from "@babylonjs/core/node";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { IAudioParameterRampOptions } from "@babylonjs/core/AudioV2/audioParameter";
import { SpatialAudioAttachmentType } from "@babylonjs/core/AudioV2/spatialAudioAttachmentType";
import { IStaticSoundPlayOptions, IStaticSoundStopOptions, StaticSound } from "@babylonjs/core/AudioV2/abstractAudio/staticSound";

declare module "@babylonjs/core/Audio/sound" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface Sound {
		id: string;
		uniqueId: number;
	}
}

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

/**
 * Searches for a sound by its id in the scene by traversing all soundtracks.
 * @param id defines the id of the sound to retrieve.
 * @param scene defines the reference to the scene where to find the instantiated sound.
 */
export function getSoundById(id: string, scene: Scene) {
	const soundTracks = scene.soundTracks ?? [];
	if (!soundTracks.length) {
		soundTracks.push(scene.mainSoundTrack);
	}

	for (let i = 0, len = soundTracks.length; i < len; i++) {
		const sound = soundTracks[i].soundCollection.find((s) => s.id === id);
		if (sound) {
			return sound;
		}
	}

	return null;
}
