import { Node, SceneSerializer } from "babylonjs";

import { saveSingleFileDialog } from "../../../tools/dialog";
import { writeJSON } from "fs-extra";
import { toast } from "sonner";

import { Editor } from "../../main";
import filenamify from "filenamify/filenamify";

const JSON_CONFIG = {
	spaces: 4,
	encoding: "utf8",
};
/**
 * Exports the entire scene to a .babylon file.
 * @param editor defines the reference to the editor used to get the scene.
 */
export async function exportScene(editor: Editor): Promise<void> {
	const filePath = saveSingleFileDialog({
		title: "Export Scene",
		filters: [{ name: "Babylon Scene Files", extensions: ["babylon"] }],
		defaultPath: "scene.babylon",
	});

	if (!filePath) {
		return;
	}

	try {
		const scene = editor.layout.preview.scene;
		const data = await SceneSerializer.SerializeAsync(scene);

		await writeJSON(filePath, data, JSON_CONFIG);

		editor.layout.console.log(`Scene exported successfully to ${filePath}`);
		toast.success(`Scene exported successfully to ${filePath}`);
	} catch (e) {
		if (e instanceof Error) {
			editor.layout.console.error(`Error exporting scene: ${e.message}`);
			toast.error("Error exporting scene");
		}
	}
}

/**
 * Exports a specific node and all its children to a .babylon file.
 * @param editor defines the reference to the editor used to get the scene.
 * @param node defines the node to export along with its descendants.
 */
export async function exportNode(editor: Editor, node: Node): Promise<void> {
	const filePath = saveSingleFileDialog({
		title: "Export Node",
		filters: [{ name: "Babylon Scene Files", extensions: ["babylon"] }],
		defaultPath: `${filenamify(node.name)}.babylon`,
	});

	if (!filePath) {
		return;
	}

	try {
		const scene = editor.layout.preview.scene;

		// Get all nodes that should be included (selected node + descendants)
		const nodesToInclude = new Set<Node>();
		nodesToInclude.add(node);

		// Add all descendants
		const descendants = node.getDescendants(false);
		descendants.forEach((descendant) => nodesToInclude.add(descendant));

		// Store original doNotSerialize values
		const originalDoNotSerialize = new Map<Node, boolean>();

		exportMeshes(scene, nodesToInclude, originalDoNotSerialize);
		exportLights(scene, nodesToInclude, originalDoNotSerialize);
		exportCameras(scene, nodesToInclude, originalDoNotSerialize);
		exportTransformNodes(scene, nodesToInclude, originalDoNotSerialize);

		const originalParticleSystems = exportParticleSystems(scene, nodesToInclude);
		const originalSoundTracks = exportSounds(scene, nodesToInclude);

		// Serialize the filtered scene
		const data = await SceneSerializer.SerializeAsync(scene);

		// Restore original scene state
		restoreSceneState(scene, originalDoNotSerialize, {
			originalParticleSystems,
			originalSoundTracks
		});

		await writeJSON(filePath, data, JSON_CONFIG);

		editor.layout.console.log(`Node exported successfully to ${filePath}`);
		toast.success(`Node exported successfully to ${filePath}`);
	} catch (e) {
		if (e instanceof Error) {
			editor.layout.console.error(`Error exporting node: ${e.message}`);
			toast.error("Error exporting node");
		}
	}
}

/**
 * Restores the original scene state after export.
 * @param scene The scene to restore
 * @param originalDoNotSerialize Map containing original serialization states
 * @param exportData Data needed for restoration
 */
function restoreSceneState(
	scene: any, 
	originalDoNotSerialize: Map<Node, boolean>,
	exportData: { originalParticleSystems: any[]; originalSoundTracks: any[] }
): void {
	// Restore original doNotSerialize values
	originalDoNotSerialize.forEach((value, node) => {
		node.doNotSerialize = value;
	});
	
	// Restore particle systems
	scene.particleSystems.length = 0;
	exportData.originalParticleSystems.forEach((ps: any) => 
		scene.particleSystems.push(ps)
	);
	
	// Restore soundtracks
	scene.soundTracks = exportData.originalSoundTracks;
}

/**
 * Configures mesh nodes for export.
 * @param scene The scene containing the meshes
 * @param nodesToInclude Set of nodes to include in the export
 * @param originalDoNotSerialize Map to store original serialization state
 */
function exportMeshes(
	scene: any, 
	nodesToInclude: Set<Node>,
	originalDoNotSerialize: Map<Node, boolean>
): void {
	scene.meshes.forEach((mesh: Node) => {
		originalDoNotSerialize.set(mesh, mesh.doNotSerialize);
		mesh.doNotSerialize = !nodesToInclude.has(mesh);
	});
}

/**
 * Configures light nodes for export.
 * @param scene The scene containing the lights
 * @param nodesToInclude Set of nodes to include in the export
 * @param originalDoNotSerialize Map to store original serialization state
 */
function exportLights(
	scene: any, 
	nodesToInclude: Set<Node>,
	originalDoNotSerialize: Map<Node, boolean>
): void {
	scene.lights.forEach((light: Node) => {
		originalDoNotSerialize.set(light, light.doNotSerialize);
		light.doNotSerialize = !nodesToInclude.has(light);
	});
}

/**
 * Configures camera nodes for export.
 * @param scene The scene containing the cameras
 * @param nodesToInclude Set of nodes to include in the export
 * @param originalDoNotSerialize Map to store original serialization state
 */
function exportCameras(
	scene: any, 
	nodesToInclude: Set<Node>,
	originalDoNotSerialize: Map<Node, boolean>
): void {
	scene.cameras.forEach((camera: Node) => {
		originalDoNotSerialize.set(camera, camera.doNotSerialize);
		camera.doNotSerialize = !nodesToInclude.has(camera);
	});
}

/**
 * Configures transform nodes for export.
 * @param scene The scene containing the transform nodes
 * @param nodesToInclude Set of nodes to include in the export
 * @param originalDoNotSerialize Map to store original serialization state
 */
function exportTransformNodes(
	scene: any, 
	nodesToInclude: Set<Node>,
	originalDoNotSerialize: Map<Node, boolean>
): void {
	scene.transformNodes.forEach((transformNode: Node) => {
		originalDoNotSerialize.set(transformNode, transformNode.doNotSerialize);
		transformNode.doNotSerialize = !nodesToInclude.has(transformNode);
	});
}

/**
 * Filters particle systems for export based on their attached nodes.
 * @param scene The scene containing the particle systems
 * @param nodesToInclude Set of nodes to include in the export
 * @returns The original array of particle systems (for restoration)
 */
function exportParticleSystems(scene: any, nodesToInclude: Set<Node>): Array<any> {
	// Save original particle systems
	const originalParticleSystems = scene.particleSystems.slice();
	
	// Filter particle systems to only include those attached to our nodes
	const particlesToKeep = originalParticleSystems.filter((ps: any) => {
		const emitter = ps.emitter;
		return emitter && nodesToInclude.has(emitter as Node);
	});
	
	// Replace the scene's particle systems with only those we want to include
	scene.particleSystems.length = 0;
	particlesToKeep.forEach((ps: any) => scene.particleSystems.push(ps));
	
	return originalParticleSystems;
}

/**
 * Filters sounds for export based on their attached nodes.
 * @param scene The scene containing the sounds
 * @param nodesToInclude Set of nodes to include in the export
 * @returns The original array of soundtracks (for restoration)
 */
function exportSounds(scene: any, nodesToInclude: Set<Node>): Array<any> {
	// Handle sounds - filter out sounds not attached to our nodes
	let originalSoundTracks: any[] = [];
	
	if (scene.soundTracks) {
		// Store original soundtracks to restore later
		originalSoundTracks = scene.soundTracks.slice();
		
		// Filter each soundtrack to only include sounds attached to our nodes
		const filteredSoundTracks = scene.soundTracks.map((soundtrack: any) => {
			// Create a new sound collection with only the sounds attached to our nodes
			const filteredSoundCollection = soundtrack.soundCollection.filter((sound: any) => {
				if (sound.spatialSound && sound.metadata && sound.metadata.connectedMeshName) {
					// Check if the connected mesh name matches any of our nodes
					for (const meshNode of nodesToInclude) {
						if (meshNode.name === sound.metadata.connectedMeshName) {
							return true;
						}
					}
				}
				return false;
			});
			
			// Replace the original sound collection with our filtered one
			soundtrack.soundCollection = filteredSoundCollection;
			return soundtrack;
		}).filter((st: any) => st.soundCollection.length > 0); // Remove empty soundtracks
		
		// Replace scene soundtracks with our filtered ones
		scene.soundTracks = filteredSoundTracks;
	}
	
	return originalSoundTracks;
}
