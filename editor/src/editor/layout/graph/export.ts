import { Node, SceneSerializer } from "babylonjs";

import { saveSingleFileDialog } from "../../../tools/dialog";
import { writeJSON } from "fs-extra";
import { toast } from "sonner";

import { Editor } from "../../main";

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
		defaultPath: `${node.name}.babylon`,
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

		// Temporarily set doNotSerialize = true for all nodes except the ones we want to include
		scene.meshes.forEach((mesh) => {
			originalDoNotSerialize.set(mesh, mesh.doNotSerialize);
			mesh.doNotSerialize = !nodesToInclude.has(mesh);
		});

		scene.lights.forEach((light) => {
			originalDoNotSerialize.set(light, light.doNotSerialize);
			light.doNotSerialize = !nodesToInclude.has(light);
		});

		scene.cameras.forEach((camera) => {
			originalDoNotSerialize.set(camera, camera.doNotSerialize);
			camera.doNotSerialize = !nodesToInclude.has(camera);
		});

		scene.transformNodes.forEach((transformNode) => {
			originalDoNotSerialize.set(transformNode, transformNode.doNotSerialize);
			transformNode.doNotSerialize = !nodesToInclude.has(transformNode);
		});

		// Serialize the filtered scene
		const data = await SceneSerializer.SerializeAsync(scene);

		// Restore original doNotSerialize values
		originalDoNotSerialize.forEach((value, node) => {
			node.doNotSerialize = value;
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
