import { Scene, Camera, Tools, UniversalCamera, Vector3 } from "babylonjs";

import { isCamera } from "../../tools/guards/nodes";
import { UniqueNumber } from "../../tools/tools";

import { addFreeCamera, addArcRotateCamera } from "../../project/add/camera";

import { IMCPActionOptions } from "../action";
import { resolveNode, toNodeSummary, toVector3 } from "../tools/resolve";

/**
 * Creates a camera in the scene reusing the editor's "add" functions where available.
 */
export function createCamera(scene: Scene, data: any, options: IMCPActionOptions): any {
	const editor = options.editor;

	let camera: Camera;
	switch (data.type) {
		case "free":
			camera = addFreeCamera(editor);
			break;
		case "arcrotate":
			camera = addArcRotateCamera(editor);
			break;
		case "universal":
			const universal = new UniversalCamera("New Universal Camera", Vector3.Zero(), scene);
			universal.position.copyFrom(editor.layout.preview.camera.position);
			universal.setTarget(editor.layout.preview.camera.getTarget());
			universal.id = Tools.RandomId();
			universal.uniqueId = UniqueNumber.Get();
			editor.layout.graph.refresh().then(() => {
				editor.layout.graph.setSelectedNode(universal);
			});
			editor.layout.inspector.setEditedObject(universal);
			editor.layout.preview.gizmo.setAttachedObject(universal);
			camera = universal;
			break;
		default:
			throw new Error(`Unknown camera type: ${data.type}`);
	}

	if (data.name) {
		camera.name = data.name;
	}

	if (data.position && (camera as any).position) {
		(camera as any).position.copyFrom(toVector3(data.position));
	}

	if (data.target && (camera as any).setTarget) {
		(camera as any).setTarget(toVector3(data.target));
	}

	options.editor.layout.inspector.forceUpdate();

	return toNodeSummary(camera);
}

/**
 * Sets the scene's active camera.
 */
export function setActiveCamera(scene: Scene, data: any, options: IMCPActionOptions): any {
	const node = resolveNode({ scene, nodeId: data.nodeId, nodeName: data.nodeName });

	if (!isCamera(node)) {
		throw new Error(`Node "${node.name}" is not a camera.`);
	}

	scene.activeCamera = node as Camera;

	options.editor.layout.inspector.forceUpdate();

	return { activeCamera: node.name };
}
