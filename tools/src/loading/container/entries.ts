import { Node } from "@babylonjs/core/node";
import { Skeleton } from "@babylonjs/core/Bones/skeleton";
import { InstantiatedEntries } from "@babylonjs/core/assetContainer";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

export class AdvancedAssetContainerInstantiatedEntries implements InstantiatedEntries {
	public constructor(
		public readonly entries: InstantiatedEntries,
		public readonly namingId: string
	) {}

	public get rootNodes(): Node[] {
		return this.entries.rootNodes;
	}

	public get skeletons(): Skeleton[] {
		return this.entries.skeletons;
	}

	public get animationGroups(): AnimationGroup[] {
		return this.entries.animationGroups;
	}

	public dispose(): void {
		this.entries.dispose();
	}

	public getNodeByName(name: string): Node | null {
		for (const node of this.entries.rootNodes) {
			const result = this._recursivelyGetNodeByName(`${name}-${this.namingId}`, node);
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
