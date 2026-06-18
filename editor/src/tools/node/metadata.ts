import { Node } from "babylonjs";

export interface INodeMetadata {
	/**
	 * Defines wether or not the object is locked.
	 */
	isLocked?: boolean;
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
export function ensureNodeMetadata(node: Node): INodeMetadata {
	node.metadata ??= {};
	return node.metadata;
}

/**
 * Gets wether or not the given node is locked in the editor.
 * @param node defines the node to check.
 * @returns true if the node is locked, false otherwise.
 */
export function isNodeLocked(node: Node): boolean {
	return ensureNodeMetadata(node).isLocked ?? false;
}

/**
 * Sets wether or not the given node is locked in the editor.
 * @param node defines the node to configure.
 * @param locked defines the value to set.
 */
export function setNodeLocked(node: Node, locked: boolean): void {
	ensureNodeMetadata(node).isLocked = locked;
}

/**
 * Gets wether or not the given node is not serializable.
 * @param node defines the reference to the node to get the metadata to.
 */
export function isNodeSerializable(node: Node): boolean {
	const value = ensureNodeMetadata(node).doNotSerialize;
	return value === undefined ? true : !value;
}

/**
 * Sets wether or not the given node is not serializable.
 * @param node defines the reference to the node to set configuration.
 * @param value defines the value to set.
 */
export function setNodeSerializable(node: Node, value: boolean): void {
	ensureNodeMetadata(node).doNotSerialize = !value;
}

/**
 * Gets wether or not the given node is visible in the graph panel of the editor.
 * @param node defines the reference to the node to check.
 */
export function isNodeVisibleInGraph(node: Node): boolean {
	const value = ensureNodeMetadata(node).notVisibleInGraph;
	return value === undefined ? true : !value;
}

/**
 * Sets wether or not the given node is visible in the graph panel of the editor.
 * @param node defines the reference to the node to set configuration.
 * @param value defines the value to set.
 */
export function setNodeVisibleInGraph(node: Node, value: boolean): void {
	ensureNodeMetadata(node).notVisibleInGraph = !value;
}
