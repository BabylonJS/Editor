import { dirname, join, isAbsolute, basename, relative } from "path/posix";

import { Scene, Mesh } from "babylonjs";

import { normalizedGlob } from "../../tools/fs";
import { isAbstractMesh } from "../../tools/guards/nodes";
import { loadImportedParticleSystemFile } from "../../editor/layout/preview/import/particles";

import { addParticleSystem } from "../../project/add/particles";

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
 * Lists all the `.npss` node particle system assets in the project.
 */
export async function listParticleAssets(): Promise<any> {
	const directory = getProjectDirectory();

	const matches = await normalizedGlob(join(directory, "/**/*.npss"), {
		nodir: true,
		ignore: ["**/node_modules/**"],
	});

	return {
		assets: (matches as string[]).map((matchPath) => {
			const path = matchPath.toString();
			return {
				name: basename(path, ".npss"),
				path: relative(directory, path),
			};
		}),
	};
}

/**
 * Instantiates a `.npss` asset into the scene, or creates a default particle system.
 */
export async function instantiateParticleSystem(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	// Resolve the emitter mesh.
	let emitter: Mesh;
	if (data.emitterNodeId || data.emitterNodeName) {
		const node = resolveNode({ scene, nodeId: data.emitterNodeId, nodeName: data.emitterNodeName });
		if (!isAbstractMesh(node)) {
			throw new Error(`Emitter node "${node.name}" is not a mesh.`);
		}
		emitter = node as Mesh;
	} else {
		// Create an empty mesh to act as the emitter when none is provided.
		emitter = new Mesh(data.name ? `${data.name} Emitter` : "Particle System Emitter", scene);
	}

	if (data.position) {
		emitter.position.copyFrom(toVector3(data.position));
	}

	if (data.path) {
		const absolutePath = resolveProjectPath(data.path);
		const node = await loadImportedParticleSystemFile(scene, emitter, absolutePath);

		if (data.name) {
			node.name = data.name;
		}

		options.editor.layout.graph.refresh().then(() => {
			options.editor.layout.graph.setSelectedNode(node);
		});
		options.editor.layout.inspector.setEditedObject(node);

		return toNodeSummary(node);
	}

	// No asset path: create a default particle system on the emitter.
	addParticleSystem(options.editor, emitter);

	options.editor.layout.graph.refresh();

	return toNodeSummary(emitter);
}
