import { AbstractMesh } from "babylonjs";

/**
 * Sets the metadata of the given mesh to not be serializable or not.
 * @param mesh defines the reference to the mesh to set the metadata to.
 * @param value defines the value to set to the metadata.
 */
export function setMeshMetadataNotSerializable(mesh: AbstractMesh, value: boolean): void {
	mesh.metadata ??= {};
	mesh.metadata.doNotSerialize = value;
}

/**
 * Sets the metadata of the given mesh to not be visible in graph or not.
 * @param mesh defines the reference to the mesh to set the metadata to.
 * @param value defines the value to set to the metadata.
 */
export function setMeshMetadataNotVisibleInGraph(mesh: AbstractMesh, value: boolean): void {
	mesh.metadata ??= {};
	mesh.metadata.notVisibleInGraph = value;
}

/**
 * Gets wether or not the given mesh is visible in graph.
 * @param mesh defines the reference to the mesh to get the metadata to.
 */
export function isMeshMetadataNotVisibleInGraph(mesh: AbstractMesh): boolean {
	return mesh.metadata?.notVisibleInGraph ?? false;
}
