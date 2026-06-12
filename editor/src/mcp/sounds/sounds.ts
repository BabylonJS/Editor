import { dirname, join, isAbsolute, basename, relative } from "path/posix";

import { Scene, Node } from "babylonjs";

import { normalizedGlob } from "../../tools/fs";
import { isSoundNode } from "../../tools/guards/sound";

import { SoundNode } from "../../editor/nodes/sound";

import { projectConfiguration } from "../../project/configuration";

import { IMCPActionOptions } from "../action";
import { resolveNode, toNodeSummary, toVector3 } from "../tools/resolve";

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
 * Resolves an absolute path from a project-relative or absolute path.
 */
function resolveProjectPath(path: string): string {
	return isAbsolute(path) ? path : join(getProjectDirectory(), path);
}

/**
 * Lists all the `.mp3`, `.ogg` and `.wav` sound assets in the project.
 */
export async function listSoundAssets(): Promise<any> {
	const directory = getProjectDirectory();

	const matches = await normalizedGlob(join(directory, "/**/*.{mp3,ogg,wav}"), {
		nodir: true,
		ignore: ["**/node_modules/**"],
	});

	return {
		assets: (matches as string[]).map((matchPath) => {
			const path = matchPath.toString();
			return {
				name: basename(path),
				path: relative(directory, path),
			};
		}),
	};
}

/**
 * Applies the spatial-related properties (volume, isSpatial, maxDistance, distanceModel, panningModel)
 * provided in the given data object to the given sound node, only when present.
 */
function applySoundProperties(node: SoundNode, data: any): void {
	if (data.volume !== undefined) {
		node.volume = data.volume;
	}

	if (data.spatial !== undefined) {
		node.isSpatial = data.spatial;
	}

	if (data.maxDistance !== undefined) {
		node.maxDistance = data.maxDistance;
	}

	if (data.distanceModel !== undefined) {
		node.distanceModel = data.distanceModel;
	}

	if (data.panningModel !== undefined) {
		node.panningModel = data.panningModel;
	}

	if (data.autoUpdateSpatial !== undefined) {
		node.autoUpdateSpatial = data.autoUpdateSpatial;
	}
}

/**
 * Creates a `SoundNode` in the scene from a sound asset and loads it.
 * Use `spatial: true` (default) with `parentId`/`parentName`/`position` for 3D positional ambience,
 * or `spatial: false` for a global 2D ambience/music bed.
 */
export async function createSound(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	if (!data.path) {
		throw new Error("`path` to a sound asset (.mp3/.ogg/.wav) is required to create a sound.");
	}

	const node = new SoundNode(data.name ?? "New Sound Node", scene);

	let parent: Node | null = null;
	if (data.parentId || data.parentName) {
		parent = resolveNode({ scene, nodeId: data.parentId, nodeName: data.parentName });
	}
	node.parent = parent;

	if (data.position) {
		node.position.copyFrom(toVector3(data.position));
	}

	applySoundProperties(node, data);

	const absolutePath = resolveProjectPath(data.path);
	await node.setSoundAbsolutePath(absolutePath);

	options.editor.layout.graph.refresh().then(() => {
		options.editor.layout.graph.setSelectedNode(node);
	});
	options.editor.layout.inspector.setEditedObject(node);
	options.editor.layout.preview.gizmo.setAttachedObject(node);

	return toNodeSummary(node);
}

/**
 * Updates the properties of an existing `SoundNode`. Only the provided fields are applied.
 */
export function setSoundProperties(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!isSoundNode(node)) {
		throw new Error(`Node "${node.name}" is not a SoundNode.`);
	}

	applySoundProperties(node, data);

	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(node);
}
