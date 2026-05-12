import { Node } from "@babylonjs/core/node";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Sound } from "@babylonjs/core/Audio/sound";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";

import { cloneJSObject } from "../../tools/tools";
import { isAbstractMesh, isTransformNode } from "../../tools/guards";

import { ScriptMap } from "../loader";
import { configureTransformNodes } from "../transform-node";
import { _applyScriptsForObject, _removeRegisteredScriptInstance, getAllScriptsByClassForObject, scriptsDictionary } from "../script/apply";

import { AdvancedAssetContainerInstantiatedEntries } from "./entries";

export interface IAdvancedAssetContainerInstantiateOptions {
	/**
	 * Defines if the model must be instantiated or just cloned
	 */
	doNotInstantiate?: boolean | ((node: Node) => boolean);
	/**
	 * Defines a predicate used to filter whih mesh to instantiate/clone
	 */
	predicate?: (entity: any) => boolean;
}

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

		container.animationGroups.forEach((animationGroup) => {
			this._animationGroupsMap.set(animationGroup.name, animationGroup);
		});

		this._originalDescendants.forEach((node) => {
			this._nodesMap.set(node, {
				node,
				metadata: cloneJSObject(node.metadata),
			});
		});
	}

	/**
	 * By default, loaded advanced asset containers add their nodes in the scene.
	 * As it is not always wanted, this method allows to remove those nodes from the scene and only keep them in the container.
	 * This is particularely useful when you want to instantiate the container several times in the scene, but not use the original nodes of the container itself.
	 */
	public removeDefault(): void {
		this.container.getNodes().forEach((node) => {
			const scripts = scriptsDictionary.get(node);
			scripts?.forEach((script) => {
				_removeRegisteredScriptInstance(node, script);
			});
		});

		this.container.removeAllFromScene();
	}

	/**
	 * Retrieve the reference to a node present in the root nodes of the container by its name.
	 * This is useful only if the container is not intended to be instantiated so you never call `.removeDefault()`.
	 * @param name defines the name of the root node to retrieve.
	 */
	public getRootNodeByName(name: string): Node | null {
		return this.container.rootNodes.find((node) => node.name === name) ?? null;
	}

	/**
	 * Retrieve the reference to a script instance of the given type attached to a node with the given name.
	 * @param name defines the name of the object to retrieve the script from.
	 * @param classType defines the class of the type to retrieve.
	 * @returns the reference to the script instance attached to the node which matches the given class type.
	 */
	public getScriptByClassByObjectName<T extends new (...args: any) => any>(name: string, classType: T): InstanceType<T> | null {
		const nodes = this.container.getNodes();

		for (const node of nodes) {
			if (node.name === name) {
				const scripts = getAllScriptsByClassForObject(node, classType);
				if (scripts?.length === 1) {
					return scripts[0];
				}
			}
		}

		return null;
	}

	/**
	 * Instantiate or clone all meshes, skeletons and animations groups, and add the new ones to the scene.
	 * If the container contains scripts attached to its nodes, those scripts will also be applied on the instantiated/cloned nodes.
	 * @param options defines an optional list of options to control how to instantiate / clone models
	 * @param options.doNotInstantiate defines if the model must be instantiated or just cloned
	 * @param options.predicate defines a predicate used to filter whih mesh to instantiate/clone
	 * @returns a new reference to instantiated entries with the instantiated nodes, skeletons and animation groups.
	 * @see `BABYLON.AssetContainer.instantiateModelsToScene` for options.
	 */
	public instantiate(options?: IAdvancedAssetContainerInstantiateOptions): AdvancedAssetContainerInstantiatedEntries {
		const namingId = Tools.RandomId();
		const nameFunction = (sourceName: string) => sourceName;

		const entries = this.container.instantiateModelsToScene(nameFunction, false, {
			...options,
			predicate: (entity) => {
				entity.name = `${entity.name}@editor-tools@${namingId}_${entity.id}`;
				return options?.predicate?.(entity) ?? true;
			},
		});

		const result = new AdvancedAssetContainerInstantiatedEntries(entries, namingId);

		const allContainerEntries = [
			...this.container.transformNodes,
			...this.container.meshes,
			...this.container.lights,
			...this.container.cameras,
			...this.container.animationGroups,
			...this.container.skeletons,
		];

		allContainerEntries.forEach((entry) => {
			const nameSplit = entry.name.split("@editor-tools@");
			entry.name = nameSplit[0];
		});

		entries.animationGroups.forEach((animationGroup) => {
			const nameSplit = animationGroup.name.split("@editor-tools@");
			animationGroup.name = `${nameSplit[0]}-${namingId}`;
		});

		const newDescendants: Node[] = [];
		entries.rootNodes.forEach((node) => {
			newDescendants.push(node, ...node.getDescendants(false));
		});

		const clonedSounds: Record<string, Sound> = {};

		newDescendants.forEach((newNode) => {
			const nameSplit = newNode.name.split("@editor-tools@");
			const originalId = nameSplit[1].split("_").pop();

			newNode.name = `${nameSplit[0]}-${namingId}`;

			const originalNode = this._originalDescendants.find((n) => n.id === originalId)!;

			newNode.id = Tools.RandomId();

			newNode.metadata = cloneJSObject(this._nodesMap.get(originalNode)!.metadata);
			newNode.metadata ??= {};
			newNode.metadata.originalId = originalId;

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

							const originalSound = this.container.sounds?.find((s) => s.id === obj.value);
							if (originalSound) {
								let clonedSound = clonedSounds[originalSound.id];
								if (!clonedSound) {
									clonedSound = new Sound(originalSound.name, originalSound["_url"], this.container.scene, null, {
										autoplay: false,
										loop: originalSound.loop,
										volume: originalSound.getVolume(),
										playbackRate: originalSound.getPlaybackRate(),
										maxDistance: originalSound.maxDistance,
										refDistance: originalSound.refDistance,
										spatialSound: originalSound.spatialSound,
										distanceModel: originalSound.distanceModel,
										rolloffFactor: originalSound.rolloffFactor,
									});
									clonedSound.id = Tools.RandomId();
									clonedSound.metadata = {
										originalSourceId: originalSound["_connectedTransformNode"]?.id,
									};
									clonedSounds[originalSound.id] = clonedSound;

									this.container.scene.mainSoundTrack?.addSound(clonedSound);
								}

								obj.value = clonedSound.id;
							}

							const originalAnimationGroup = this._animationGroupsMap.get(obj.value);
							if (originalAnimationGroup) {
								obj.value = `${originalAnimationGroup.name}-${namingId}`;
							}
						}
					});
				});
			});
		});

		// Connect sounds to the new nodes based on the original source node they were connected to in the container
		Object.values(clonedSounds).forEach((sound) => {
			const originalSourceId = sound.metadata?.originalSourceId;
			if (originalSourceId) {
				const node = newDescendants.find((n) => n.metadata?.originalId === originalSourceId);
				if (node && (isAbstractMesh(node) || isTransformNode(node))) {
					sound.attachToMesh(node);
				}
			}
		});

		// Apply scripts after everything else is set up to avoid issues with dependencies between scripts
		newDescendants.forEach((node) => {
			_applyScriptsForObject(this.container.scene, node, this._scriptsMap, this._rootUrl);
		});

		configureTransformNodes(this.container.scene);

		return result;
	}
}
