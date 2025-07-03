import { Scene } from "@babylonjs/core/scene";

declare module "@babylonjs/core/Audio/sound" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface Sound {
		id: string;
		uniqueId: number;
	}
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
