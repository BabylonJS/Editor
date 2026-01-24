import { ParticleSystem, GPUParticleSystem } from "babylonjs";

export interface IParticleSystemMetadata {
	/**
	 * Defines wether or not the object should be serialized when the scene is exported.
	 */
	doNotSerialize?: boolean;
	/**
	 * Defines wether or not the object is visible in the graph panel in the editor.
	 */
	notVisibleInGraph?: boolean;
}

/**
 * Ensures that metadata exists for the given node.
 * @param node defines the node to ensure metadata for.
 * @returns the metadata of the node, creating it if does not exist.
 */
export function ensureParticleSystemMetadata(node: ParticleSystem | GPUParticleSystem): IParticleSystemMetadata {
	node.metadata ??= {};
	return node.metadata;
}

/**
 * Gets wether or not the given node is not serializable.
 * @param node defines the reference to the node to get the metadata to.
 */
export function isParticleSystemSerializable(node: ParticleSystem | GPUParticleSystem): boolean {
	const value = ensureParticleSystemMetadata(node).doNotSerialize;
	return value === undefined ? true : !value;
}

/**
 * Sets wether or not the given node is not serializable.
 * @param node defines the reference to the node to set configuration.
 * @param value defines the value to set.
 */
export function setParticleSystemSerializable(node: ParticleSystem | GPUParticleSystem, value: boolean): void {
	ensureParticleSystemMetadata(node).doNotSerialize = !value;
}

/**
 * Gets wether or not the given node is visible in the graph panel of the editor.
 * @param node defines the reference to the node to check.
 */
export function isParticleSystemVisibleInGraph(node: ParticleSystem | GPUParticleSystem): boolean {
	const value = ensureParticleSystemMetadata(node).notVisibleInGraph;
	return value === undefined ? true : !value;
}

/**
 * Sets wether or not the given node is visible in the graph panel of the editor.
 * @param node defines the reference to the node to set configuration.
 * @param value defines the value to set.
 */
export function setParticleSystemVisibleInGraph(node: ParticleSystem | GPUParticleSystem, value: boolean): void {
	ensureParticleSystemMetadata(node).notVisibleInGraph = !value;
}
