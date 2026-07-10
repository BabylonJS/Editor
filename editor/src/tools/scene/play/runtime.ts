import { Scene } from "babylonjs";

import { Editor } from "../../../editor/main";

/**
 * Returns wether or not the game / application is currently playing in the editor.
 * Safe to call during the first renders of the editor layout: refs are assigned on commit,
 * so `editor.layout` (and its children) don't exist yet while the first render is in progress.
 * @param editor defines the reference to the editor.
 */
export function isScenePlaying(editor: Editor): boolean {
	return editor.layout?.preview?.play?.state.playing ?? false;
}

/**
 * Returns the scene the given object belongs to, or null if it cannot be determined.
 * Handles nodes, materials, textures, skeletons and particle systems (getScene),
 * sounds (_scene, which has no public accessor) and sprites (manager).
 * @param object defines the reference to the object to get the scene of.
 */
export function getObjectScene(object: any): Scene | null {
	if (!object) {
		return null;
	}

	if (object instanceof Scene) {
		return object;
	}

	return object.getScene?.() ?? object._scene ?? object.manager?.scene ?? null;
}

/**
 * Returns wether or not the given object belongs to the play scene (aka is a runtime object).
 * Objects whose scene cannot be determined are considered NOT runtime (safe default for graph guards).
 * @param editor defines the reference to the editor.
 * @param object defines the reference to the object to check.
 */
export function isPlaySceneObject(editor: Editor, object: any): boolean {
	const playScene = editor.layout?.preview?.play?.scene ?? null;
	if (!playScene) {
		return false;
	}

	return getObjectScene(object) === playScene;
}
