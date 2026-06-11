import { dirname, join, basename, relative } from "path/posix";

import { Scene } from "babylonjs";

import { normalizedGlob } from "../../tools/fs";
import { saveProject } from "../../project/save/save";
import { projectConfiguration } from "../../project/configuration";

import { IMCPActionOptions } from "../action";
import { deepSet } from "../tools/resolve";

/**
 * Returns the absolute path of the project directory.
 */
function getProjectDirectory(): string {
	if (!projectConfiguration.path) {
		throw new Error("No project is currently open.");
	}

	return dirname(projectConfiguration.path);
}

/**
 * Lists all the `.scene` assets available in the project.
 */
export async function listScenes(_scene: Scene, _data: any, options: IMCPActionOptions): Promise<any> {
	const directory = getProjectDirectory();
	const activeScenePath = options.editor.state.lastOpenedScenePath;

	const folders = await normalizedGlob(join(directory, "/**/*.scene"), {
		nodir: false,
		ignore: ["**/node_modules/**"],
	});

	return {
		scenes: folders.map((folderPath) => {
			const path = folderPath.toString();
			return {
				name: basename(path, ".scene"),
				path: relative(directory, path),
				isActive: !!activeScenePath && join(activeScenePath) === join(path),
			};
		}),
	};
}

/**
 * Returns the name/path of the currently edited scene with entity counts.
 */
export function getActiveScene(scene: Scene, _data: any, options: IMCPActionOptions): any {
	const directory = getProjectDirectory();
	const activeScenePath = options.editor.state.lastOpenedScenePath;

	return {
		name: activeScenePath ? basename(activeScenePath, ".scene") : null,
		path: activeScenePath ? relative(directory, activeScenePath) : null,
		meshCount: scene.meshes.length,
		lightCount: scene.lights.length,
		materialCount: scene.materials.length,
	};
}

/**
 * Saves the current scene/project.
 */
export async function saveScene(_scene: Scene, _data: any, options: IMCPActionOptions): Promise<any> {
	await saveProject(options.editor);

	return { saved: true };
}

/**
 * Returns the current scene-level settings.
 */
export function getSceneSettings(scene: Scene): any {
	return {
		clearColor: [scene.clearColor.r, scene.clearColor.g, scene.clearColor.b, scene.clearColor.a],
		ambientColor: [scene.ambientColor.r, scene.ambientColor.g, scene.ambientColor.b],
		environmentTexture: scene.environmentTexture?.name ?? null,
		environmentIntensity: scene.environmentIntensity,
		fogMode: scene.fogMode,
		fogColor: [scene.fogColor.r, scene.fogColor.g, scene.fogColor.b],
		fogStart: scene.fogStart,
		fogEnd: scene.fogEnd,
		fogDensity: scene.fogDensity,
		activeCamera: scene.activeCamera?.name ?? null,
	};
}

/**
 * Sets scene-level settings using dotted property paths.
 */
export function setSceneSettings(scene: Scene, data: any, options: IMCPActionOptions): any {
	const properties = data.properties ?? {};

	for (const path of Object.keys(properties)) {
		deepSet(scene, path, properties[path]);
	}

	options.editor.layout.inspector.forceUpdate();

	return getSceneSettings(scene);
}
