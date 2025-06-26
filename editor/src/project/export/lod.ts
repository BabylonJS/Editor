import { Scene } from "babylonjs";

import { isMesh } from "../../tools/guards/nodes";

/**
 * Configures the given data from scene serializer to support LOD meshes.
 * @param data defines the JSON data coming from the scene serializer.
 * @param scene defines the scene that contains the source meshes.
 */
export function configureMeshesLODs(data: any, scene: Scene) {
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
