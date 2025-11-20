import { Node } from "@babylonjs/core/node";
import { Tools } from "@babylonjs/core/Misc/tools";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { AssetContainer, InstantiatedEntries } from "@babylonjs/core/assetContainer";

import { cloneJSObject } from "../tools/tools";

import { ScriptMap } from "./loader";
import { _applyScriptsForObject } from "./script";

interface _ISavedMapEntry {
	node: Node;
	metadata: any;
}

export class AdvancedAssetContainer {
	/**
	 * Defines the reference to the
	 */
	public container: AssetContainer;

	private _rootUrl: string;
	private _scriptsMap: ScriptMap;

	private _originalDescendants: Node[] = [];

	private _nodesMap: Map<Node, _ISavedMapEntry> = new Map<Node, _ISavedMapEntry>();
	private _animationGroupsMap: Map<string, AnimationGroup> = new Map<string, AnimationGroup>();

	public constructor(container: AssetContainer, rootUrl: string, scriptsMap: ScriptMap) {
		this.container = container;

		this._rootUrl = rootUrl;
		this._scriptsMap = scriptsMap;

		container.populateRootNodes();

		container.rootNodes.forEach((node) => {
			this._originalDescendants.push(node, ...node.getDescendants(false));
		});

		this._originalDescendants.forEach((node) => {
			this._nodesMap.set(node, {
				node,
				metadata: cloneJSObject(node.metadata),
			});
		});

		container.animationGroups.forEach((animationGroup) => {
			this._animationGroupsMap.set(animationGroup.name, animationGroup);
		});
	}

	public removeDefault(): void {
		this.container.removeAllFromScene();
	}

	public instantiate(): InstantiatedEntries {
		const namingId = Tools.RandomId();
		const nameFunction = (sourceName: string) => `${sourceName}-${namingId}`;

		const entries = this.container.instantiateModelsToScene(nameFunction, false);

		const newDescendants: Node[] = [];
		entries.rootNodes.forEach((node) => {
			newDescendants.push(node, ...node.getDescendants(false));
		});

		newDescendants.forEach((newNode, index) => {
			const originalNode = this._originalDescendants[index]!;
			const originalId = originalNode.id;

			newNode.id = Tools.RandomId();
			newNode.metadata = cloneJSObject(this._nodesMap.get(originalNode)!.metadata);

			newDescendants.forEach((node) => {
				node.metadata.scripts?.forEach((script) => {
					const valueKeys = Object.keys(script.values || {});
					valueKeys.forEach((key) => {
						const obj = script.values[key];
						if (obj.type === "entity") {
							if (obj.value === originalId) {
								obj.value = newNode.id;
							}

							if (obj.value === originalNode.name) {
								obj.value = newNode.name;
							}

							const originalAnimationGroup = this._animationGroupsMap.get(obj.value);
							if (originalAnimationGroup) {
								obj.value = nameFunction(originalAnimationGroup.name);
							}
						}
					});
				});
			});
		});

		newDescendants.forEach((node) => {
			_applyScriptsForObject(this.container.scene, node, this._scriptsMap, this._rootUrl);
		});

		return entries;
	}
}
