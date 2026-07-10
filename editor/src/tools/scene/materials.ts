import { Scene } from "babylonjs";

import { isInstancedMesh } from "../guards/nodes";

/**
 * Force compile all materials of the given scene.
 * This is useful to ensure that all materials are compiled and ready to use to avoid lag in the editor.
 * @param scene The scene to force compile all materials
 */
export function forceCompileAllSceneMaterials(scene: Scene) {
	const compilation = Promise.all(
		scene.materials.map(async (material) => {
			const meshes = material.getBindedMeshes();

			await Promise.all(
				meshes.map(async (mesh) => {
					if (isInstancedMesh(mesh)) {
						return;
					}

					await material.forceCompilationAsync(mesh, {
						clipPlane: !!scene.clipPlane,
						useInstances: mesh.hasInstances,
					});
				})
			);
		})
	).catch(() => {
		// Compilation is a best-effort warm-up: materials of a scene disposed mid-compilation may fail to compile.
	});

	// Pending compilations of a disposed scene may never settle: resolve on dispose so callers never hang.
	const disposed = new Promise<void>((resolve) => {
		scene.onDisposeObservable.addOnce(() => resolve());
	});

	return Promise.race([compilation, disposed]);
}
