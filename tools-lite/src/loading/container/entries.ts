import { Camera, SceneContext, SceneNode } from "@babylonjs/lite";

import { disposeNode, getNodeCameras } from "../../tools/node";

import { EditorAnimationGroup } from "../../animation/animation-group";

import { getAllScriptsByClassForObject } from "../script/apply";

export class AdvancedAssetContainerInstantiatedEntries {
	private _rootNodes: (SceneNode | Camera)[];
	private _animationGroups: EditorAnimationGroup[];

	public constructor(
		public readonly scene: SceneContext,
		rootNodes: (SceneNode | Camera)[],
		animationGroups: EditorAnimationGroup[],
		public readonly namingId: string
	) {
		this._rootNodes = rootNodes;
		this._animationGroups = animationGroups;
	}

	/**
	 * Returns the list of root nodes of the instantiated container.
	 */
	public get rootNodes(): (SceneNode | Camera)[] {
		return this._rootNodes;
	}

	/**
	 * Returns the list of all skeletons of the instantiated container.
	 * Babylon Lite has no public API to create skeletons: the skeletons of the editor scenes are not loaded, this list is always empty.
	 */
	public get skeletons(): never[] {
		return [];
	}

	/**
	 * Returns the list of all animation groups of the instantiated container.
	 */
	public get animationGroups(): EditorAnimationGroup[] {
		return this._animationGroups;
	}

	/**
	 * Disposes all the instantiated entries (nodes, animation groups)
	 */
	public dispose(): void {
		this._rootNodes.slice(0).forEach((node) => disposeNode(this.scene, node));
		this._rootNodes.length = 0;

		this._animationGroups.slice(0).forEach((animationGroup) => animationGroup.dispose());
		this._animationGroups.length = 0;
	}

	/**
	 * Retrieve the reference to a root node of the instantiated container by its name.
	 * @param name defines the name of the root node to retrieve.
	 * @returns the reference to the root node of the instantiated container which matches the given name, or null if not found.
	 */
	public getRootNodeByName(name: string): SceneNode | Camera | null {
		const effectiveName = `${name}-${this.namingId}`;
		return this._rootNodes.find((node) => node.name === effectiveName) ?? null;
	}

	/**
	 * Retrieve the reference to a node present in the instantiated container by its name recursively.
	 * @param name defines the name of the node to retrieve.
	 * @returns the reference to the node of the instantiated container which matches the given name, or null if not found.
	 */
	public getNodeByName(name: string): SceneNode | Camera | null {
		const effectiveName = `${name}-${this.namingId}`;

		for (const node of this._rootNodes) {
			const result = this._recursivelyGetNodeByName(effectiveName, node);
			if (result) {
				return result;
			}
		}

		return null;
	}

	private _recursivelyGetNodeByName(name: string, root: SceneNode | Camera): SceneNode | Camera | null {
		if (root.name === name) {
			return root;
		}

		for (const child of [...root.children, ...getNodeCameras(root)]) {
			const result = this._recursivelyGetNodeByName(name, child);
			if (result) {
				return result;
			}
		}

		return null;
	}

	/**
	 * Retrieve the reference to a script instance of the given type attached to a node with the given name.
	 * @param name defines the name of the object to retrieve the script from.
	 * @param classType defines the class of the type to retrieve.
	 * @returns the reference to the script instance attached to the node which matches the given class type.
	 */
	public getScriptByClassByObjectName<T extends new (...args: any) => any>(name: string, classType: T): InstanceType<T> | null {
		const node = this.getNodeByName(name);
		if (node) {
			const scripts = getAllScriptsByClassForObject(node, classType);
			if (scripts?.length === 1) {
				return scripts[0];
			}
		}

		return null;
	}
}
