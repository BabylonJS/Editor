import { Scene } from "babylonjs";

import { isMesh } from "../../tools/guards/nodes";

/**
 * Configures the given data from scene serializer to include custom metadata.
 * This function processes the customMetadata stored in nodes and makes it available
 * in the exported JSON while keeping it separate from internal editor metadata.
 * @param data defines the JSON data coming from the scene serializer.
 * @param scene defines the scene that contains the source nodes.
 */
export function configureCustomMetadata(data: any, scene: Scene) {
	// Process meshes
	data.meshes?.forEach((m: any) => {
		if (!m) {
			return;
		}

		const mesh = scene.getMeshById(m.id);
		if (!mesh || !isMesh(mesh)) {
			return;
		}

		if (mesh.metadata?.customMetadata) {
			m.metadata ??= {};
			m.metadata.customMetadata = mesh.metadata.customMetadata;
		}

		// Process instances
		m.instances?.forEach((instance: any) => {
			const instancedMesh = mesh.instances.find((i) => i.id === instance.id);
			if (instancedMesh?.metadata?.customMetadata) {
				instance.metadata ??= {};
				instance.metadata.customMetadata = instancedMesh.metadata.customMetadata;
			}
		});
	});

	// Process lights
	data.lights?.forEach((l: any) => {
		if (!l) {
			return;
		}

		const light = scene.getLightById(l.id);
		if (!light) {
			return;
		}

		if (light.metadata?.customMetadata) {
			l.metadata ??= {};
			l.metadata.customMetadata = light.metadata.customMetadata;
		}
	});

	// Process cameras
	data.cameras?.forEach((c: any) => {
		if (!c) {
			return;
		}

		const camera = scene.getCameraById(c.id);
		if (!camera) {
			return;
		}

		if (camera.metadata?.customMetadata) {
			c.metadata ??= {};
			c.metadata.customMetadata = camera.metadata.customMetadata;
		}
	});

	// Process transform nodes
	data.transformNodes?.forEach((t: any) => {
		if (!t) {
			return;
		}

		const transformNode = scene.getTransformNodeById(t.id);
		if (!transformNode) {
			return;
		}

		if (transformNode.metadata?.customMetadata) {
			t.metadata ??= {};
			t.metadata.customMetadata = transformNode.metadata.customMetadata;
		}
	});
}
