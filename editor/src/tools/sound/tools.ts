import { join, dirname } from "path/posix";

import { Scene, Sound } from "babylonjs";

import { Editor } from "../../editor/main";

import { projectConfiguration } from "../../project/configuration";

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

/**
 * Reloads the given sound. This is useful when the sound has been modified externally and needs to be reloaded in the editor.
 * @param editor defines the reference to the editor.
 * @param sound defines the reference to the sound to reload.
 * @returns the new sound instance.
 */
export function reloadSound(editor: Editor, sound: Sound) {
	const url = sound["_url"];
	if (!url || !projectConfiguration.path) {
		return null;
	}

	const serializationObject = sound.serialize();

	const newSound = Sound.Parse(serializationObject, editor.layout.preview.scene, join(dirname(projectConfiguration.path), "/"));

	newSound["_url"] = serializationObject.url;
	newSound.id = sound.id;
	newSound.uniqueId = sound.uniqueId;

	sound.dispose();

	editor.layout.graph.refresh();

	return newSound;
}
