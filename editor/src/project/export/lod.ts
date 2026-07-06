import { Scene } from "babylonjs";

import { isMesh } from "../../tools/guards/nodes";

/**
 * Configures the given data from scene serializer to support LOD meshes.
 * @param data defines the JSON data coming from the scene serializer.
 * @param scene defines the scene that contains the source meshes.
 */
export function configureMeshesLODs(data: any, scene: Scene) {
	// Remove LOD meshes for not-serialized meshes
	data.meshes = data.meshes?.filter((m: any) => {
		if (!m) {
			return false;
		}

		const mesh = scene.getMeshById(m.id);
		const masterMeshId = mesh?._masterMesh?.id;
		if (!masterMeshId) {
			return true;
		}

		const serializedMasterMesh = data.meshes!.find((m2: any) => m2.id === masterMeshId);
		if (serializedMasterMesh) {
			return true;
		}

		return false;
	});

	// Setup lod meshes
	data.meshes?.forEach((m: any) => {
		if (!m) {
			return;
		}

		const mesh = scene.getMeshById(m.id);
		if (!mesh || !isMesh(mesh)) {
			return;
		}

		const lods = mesh.getLODLevels();
		if (!lods.length) {
			return;
		}

		m.lodMeshIds = lods.filter((lod) => lod.mesh).map((lod) => lod.mesh!.id);
		m.lodDistances = lods.map((lod) => lod.distanceOrScreenCoverage);
		m.lodCoverages = lods.map((lod) => lod.distanceOrScreenCoverage);
	});
}
