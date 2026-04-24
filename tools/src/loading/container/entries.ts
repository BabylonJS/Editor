import { Node } from "@babylonjs/core/node";
import { Skeleton } from "@babylonjs/core/Bones/skeleton";
import { InstantiatedEntries } from "@babylonjs/core/assetContainer";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

export class AdvancedAssetContainerInstantiatedEntries implements InstantiatedEntries {
	public constructor(
		public readonly entries: InstantiatedEntries,
		public readonly namingId: string
	) {}

	/**
	 * Returns the list of root nodes of the instantiated container.
	 */
	public get rootNodes(): Node[] {
		return this.entries.rootNodes;
	}

	/**
	 * Returns the list of all nodes of the instantiated container.
	 */
	public get skeletons(): Skeleton[] {
		return this.entries.skeletons;
	}

	/**
	 * Returns the list of all animation groups of the instantiated container.
	 */
	public get animationGroups(): AnimationGroup[] {
		return this.entries.animationGroups;
	}

	/**
	 * Disposes all the instantiated entries (meshes, skeletons, animation groups)
	 */
	public dispose(): void {
		this.entries.dispose();
	}

	/**
	 * Retrieve the reference to a root node of the instantiated container by its name.
	 * @param name defines the name of the root node to retrieve.
	 * @returns the reference to the root node of the instantiated container which matches the given name, or null if not found.
	 */
	public getRootNodeByName(name: string): Node | null {
		const effectiveName = `${name}-${this.namingId}`;
		return this.entries.rootNodes.find((node) => node.name === effectiveName) ?? null;
	}

	/**
	 * Retrieve the reference to a node present in the instantiated container by its name recursively.
	 * @param name defines the name of the node to retrieve.
	 * @returns the reference to the node of the instantiated container which matches the given name, or null if not found.
	 */
	public getNodeByName(name: string): Node | null {
		const effectiveName = `${name}-${this.namingId}`;

		for (const node of this.entries.rootNodes) {
			const result = this._recursivelyGetNodeByName(effectiveName, node);
			if (result) {
				return result;
			}
		}

		return null;
	}

	private _recursivelyGetNodeByName(name: string, root: Node): Node | null {
		if (root.name === name) {
			return root;
		}

		for (const child of root.getDescendants(true)) {
			const result = this._recursivelyGetNodeByName(name, child);
			if (result) {
				return result;
			}
		}

		return null;
	}
}
