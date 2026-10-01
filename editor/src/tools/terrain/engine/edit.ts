import { Vector3, type Mesh } from "babylonjs";
import { getTerrainMaterialPlugin } from "babylonjs-editor-tools";

import { markTerrainDependentsChanged } from "./dependents";
import { createTerrainRefusedError } from "./operations";
import { getTerrainBinding, peekTerrainBinding, type TerrainBinding } from "./registry";
import type { ITerrainEditTarget } from "./stroke";
import { TerrainTransform } from "./transform";
import type { TerrainStrokeRefusal } from "./types";
import { TerrainWeightsBinding } from "./weights-binding";

/**
 * Returns the live data of a terrain for strokes and operations: creates the geometry binding on first use and acquires the weights when
 * the mesh has a terrain material whose weights are available (null until loaded). Throws TerrainRefusedError "shared-geometry" /
 * "not-eligible" when the terrain can't be edited.
 * @param mesh defines the terrain.
 */
export function getTerrainEditTarget(mesh: Mesh): ITerrainEditTarget {
	const result = getTerrainBinding(mesh);
	if (!result.binding) {
		throw createTerrainRefusedError(result.refusal);
	}

	return createBindingEditTarget(mesh, result.binding);
}

/**
 * Returns the live data of a terrain through its EXISTING binding, without the sharing refusals of getTerrainEditTarget; null when the mesh
 * has no valid binding (never created, geometry replaced, disposed). Restores and commits of changes already applied through the binding
 * use it, like undo/redo: a graph Clone sharing the geometry since then shares those changes, so it shares their restore and their undo entry.
 * @param mesh defines the terrain.
 */
export function getExistingTerrainEditTarget(mesh: Mesh): ITerrainEditTarget | null {
	const binding = peekTerrainBinding(mesh);
	return binding ? createBindingEditTarget(mesh, binding) : null;
}

/**
 * Returns why the weight maps of the terrain can't be edited now: "no-material", "no-layer", "weights-loading" (not loaded yet) or
 * "weights-error" (the load failed); null when they can (missing maps without a file are created). Called after waiting for the loads.
 * @param mesh defines the terrain.
 */
export function getTerrainWeightsRefusal(mesh: Mesh): TerrainStrokeRefusal | null {
	return TerrainWeightsBinding.acquire(getTerrainMaterialPlugin(mesh.material as any)).refusal;
}

function createBindingEditTarget(mesh: Mesh, binding: TerrainBinding): ITerrainEditTarget {
	const transform = TerrainTransform.FromMesh(mesh);
	const weights = binding.plugin ? binding.acquireWeights().weights : null;

	return {
		mesh,
		target: binding.createStrokeTarget(transform, weights),
		provider: binding.provider,
		signature: binding.signature,
		toLocalRay: (ray) => transform.worldRayToLocal(ray),
		raycast: (ray, solidHoles) => binding.raycastLocal(ray, solidHoles),
		localToWorld: (x, y, z) => transform.localToWorldToRef(x, y, z, new Vector3()),
		flush: (final) => (final ? binding.flush({ uploadBudgetBytes: Infinity, forceIndices: true }) : binding.flush()).uploadedBytes,
		finalize: (changed) => {
			const kinds = binding.finalize(changed);
			markTerrainDependentsChanged(mesh, kinds, changed);
		},
	};
}
