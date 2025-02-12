import { Scene } from "babylonjs";

/**
 * Searches for a sound by its id in the scene by traversing all soundtracks.
 * @param id defines the id of the sound to retrieve.
 * @param scene defines the reference to the scene where to find the instantiated sound.
 */
export function getSoundById(id: string, scene: Scene) {
    if (!scene.soundTracks?.length) {
        return null;
    }

    for (let i = 0, len = scene.soundTracks?.length; i < len; i++) {
        const sound = scene.soundTracks[i].soundCollection.find((s) => s.id === id);
        if (sound) {
            return sound;
        }
    }

    return null;
}
