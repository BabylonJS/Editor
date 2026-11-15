import { Camera, LightBase, Mesh, rebuildSceneRenderables, SceneContext, SceneNode } from "@babylonjs/lite";

import { SoundNode } from "../../tools/sound";
import { cloneJSObject, randomId } from "../../tools/tools";
import { _setNodeContainer, getSceneData, registerSceneNode, SceneNodeKind } from "../../tools/scene";
import { getClassName, isAbstractMesh, isCamera, isLight, isSoundNode, isTransformNode, setClassName } from "../../tools/guards";
import {
	_addNodeToScene,
	_cloneNodeWithoutChildren,
	_copyNodeStates,
	_isInternalNode,
	_refreshNodeVisibility,
	_removeNodeFromScene,
	_setCameraParent,
	disposeNode,
	getNodeCameras,
	getNodeDescendants,
	isNodeEnabled,
	setNodeEnabled,
} from "../../tools/node";

import { EditorAnimationGroup } from "../../animation/animation-group";

import { ScriptMap } from "../loader";
import { cloneCamera } from "../camera";
import { configureSourceNodeFrom } from "../sound";
import { configureTransformNodes } from "../transform-node";
import { IParsedSceneEntities } from "../scene-parser";
import { configureMeshLods, getMeshBehaviors, getMeshLodLevels, registerMeshBehaviors } from "../mesh";
import { _applyScriptsForObject, _removeRegisteredScriptInstance, getAllScriptsByClassForObject, scriptsDictionary } from "../script/apply";

import { AdvancedAssetContainerInstantiatedEntries } from "./entries";

export interface IAdvancedAssetContainerInstantiateOptions {
	/**
	 * Kept for compatibility with the Babylon.js version of the tools. Babylon Lite has no instanced meshes: the nodes
	 * are always cloned, the clones of the meshes share the geometry (GPU buffers) and the material of the original meshes.
	 */
	doNotInstantiate?: boolean | ((node: SceneNode | Camera) => boolean);
	/**
	 * Defines a predicate used to filter whih mesh to instantiate/clone
	 */
	predicate?: (entity: any) => boolean;
}

interface _ISavedMapEntry {
	node: SceneNode | Camera;
	metadata: any;
	enabled: boolean;
	kind: SceneNodeKind | null;
}

export class AdvancedAssetContainer {
	/**
	 * Defines the reference to the scene the container belongs to.
	 */
	public readonly scene: SceneContext;
	/**
	 * Defines the entities (nodes, materials, animation groups, etc.) of the container.
	 * Babylon Lite has no asset container: the entities created while loading the scene asset are kept here.
	 */
	public readonly entities: IParsedSceneEntities;

	private _rootUrl: string;
	private _scriptsMap: ScriptMap;

	private _removedFromScene: boolean = false;

	private _originalDescendants: (SceneNode | Camera)[] = [];

	private _nodesMap: Map<SceneNode | Camera, _ISavedMapEntry> = new Map<SceneNode | Camera, _ISavedMapEntry>();
	private _animationGroupsMap: Map<string, EditorAnimationGroup> = new Map<string, EditorAnimationGroup>();

	public constructor(scene: SceneContext, entities: IParsedSceneEntities, rootUrl: string, scriptsMap: ScriptMap) {
		this.scene = scene;
		this.entities = entities;

		this._rootUrl = rootUrl;
		this._scriptsMap = scriptsMap;

		const kinds = new Map<SceneNode | Camera, SceneNodeKind>();
		entities.transformNodes.forEach((node) => kinds.set(node, "transformNode"));
		entities.meshes.forEach((node) => kinds.set(node, "mesh"));
		entities.lights.forEach((node) => kinds.set(node, "light"));
		entities.cameras.forEach((node) => kinds.set(node, "camera"));

		this.getNodes().forEach((node) => _setNodeContainer(node, this));

		this.rootNodes.forEach((node) => {
			this._originalDescendants.push(node, ...getNodeDescendants(node, false));
		});

		entities.animationGroups.forEach((animationGroup) => {
			this._animationGroupsMap.set(animationGroup.name, animationGroup);
		});

		this._originalDescendants.forEach((node) => {
			this._nodesMap.set(node, {
				node,
				metadata: cloneJSObject(node.metadata),
				enabled: isNodeEnabled(node, false),
				kind: kinds.get(node) ?? null,
			});
		});
	}

	/**
	 * Returns the list of all the nodes of the container (meshes, lights, cameras and transform nodes).
	 */
	public getNodes(): (SceneNode | Camera)[] {
		return [...this.entities.meshes, ...this.entities.lights, ...this.entities.cameras, ...this.entities.transformNodes];
	}

	/**
	 * Returns the list of the root nodes of the container (the nodes without parent).
	 */
	public get rootNodes(): (SceneNode | Camera)[] {
		return this.getNodes().filter((node) => !(node as SceneNode).parent && !_isInternalNode(node));
	}

	/**
	 * By default, loaded advanced asset containers add their nodes in the scene.
	 * As it is not always wanted, this method allows to remove those nodes from the scene and only keep them in the container.
	 * This is particularely useful when you want to instantiate the container several times in the scene, but not use the original nodes of the container itself.
	 * Babylon Lite disposes the meshes removed from their last scene and a disposed mesh can't be cloned anymore: the
	 * meshes of the container are kept in the scene but disabled (not rendered). The lights and cameras are removed from the scene.
	 */
	public removeDefault(): void {
		this.getNodes().forEach((node) => {
			const scripts = scriptsDictionary.get(node);
			scripts?.forEach((script) => {
				_removeRegisteredScriptInstance(node, script);
			});
		});

		if (this._removedFromScene) {
			return;
		}

		this._removedFromScene = true;

		const sceneData = getSceneData(this.scene);
		const removeFromList = (list: any[], item: any) => {
			const index = list.indexOf(item);
			if (index !== -1) {
				list.splice(index, 1);
			}
		};

		this.getNodes().forEach((node) => {
			removeFromList(sceneData.transformNodes, node);
			removeFromList(sceneData.meshes, node);
			removeFromList(sceneData.lights, node);
			removeFromList(sceneData.cameras, node);
		});

		this.entities.animationGroups.forEach((animationGroup) => {
			removeFromList(sceneData.animationGroups, animationGroup);
		});

		this.rootNodes.forEach((node) => setNodeEnabled(node, false));

		this.entities.cameras.forEach((camera) => _removeNodeFromScene(this.scene, camera));

		if (this.entities.lights.length) {
			this.entities.lights.forEach((light) => _removeNodeFromScene(this.scene, light as LightBase));
			rebuildSceneRenderables(this.scene).catch((e) => console.error(e));
		}
	}

	/**
	 * Retrieve the reference to a node present in the root nodes of the container by its name.
	 * This is useful only if the container is not intended to be instantiated so you never call `.removeDefault()`.
	 * @param name defines the name of the root node to retrieve.
	 */
	public getRootNodeByName(name: string): SceneNode | Camera | null {
		return this.rootNodes.find((node) => node.name === name) ?? null;
	}

	/**
	 * Retrieve the reference to a script instance of the given type attached to a node with the given name.
	 * @param name defines the name of the object to retrieve the script from.
	 * @param classType defines the class of the type to retrieve.
	 * @returns the reference to the script instance attached to the node which matches the given class type.
	 */
	public getScriptByClassByObjectName<T extends new (...args: any) => any>(name: string, classType: T): InstanceType<T> | null {
		const nodes = this.getNodes();

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
	 * As with Babylon.js `AssetContainer.instantiateModelsToScene`, the hierarchies of the root transform nodes and meshes are cloned.
	 * @param options defines an optional list of options to control how to instantiate / clone models
	 * @param options.doNotInstantiate kept for compatibility, the nodes are always cloned
	 * @param options.predicate defines a predicate used to filter whih mesh to instantiate/clone
	 * @returns a new reference to instantiated entries with the instantiated nodes, skeletons and animation groups.
	 */
	public instantiate(options?: IAdvancedAssetContainerInstantiateOptions): AdvancedAssetContainerInstantiatedEntries {
		const scene = this.scene;
		const namingId = randomId();

		const clones = new Map<SceneNode | Camera, SceneNode | Camera>();
		const rootNodes: (SceneNode | Camera)[] = [];

		const cloneHierarchy = (source: SceneNode | Camera, parent: SceneNode | Camera | null) => {
			// The internal nodes (sub-meshes, levels of detail) are always cloned with their node.
			if (!_isInternalNode(source) && options?.predicate && !options.predicate(source)) {
				return;
			}

			const clone = this._cloneNode(source);
			if (!clone) {
				return;
			}

			clones.set(source, clone);

			if (!parent) {
				rootNodes.push(clone);
			} else if (isCamera(clone)) {
				_setCameraParent(clone, parent);
			} else {
				(clone as SceneNode).parent = parent as SceneNode;
				parent.children.push(clone as SceneNode);
			}

			source.children.forEach((child) => cloneHierarchy(child, clone));
			getNodeCameras(source).forEach((camera) => cloneHierarchy(camera, clone));
		};

		[...this.entities.transformNodes, ...this.entities.meshes].forEach((node) => {
			if (!node.parent && !_isInternalNode(node)) {
				cloneHierarchy(node, null);
			}
		});

		// Copy the states the tools keep for the nodes
		clones.forEach((clone, source) => {
			clone.name = source.name ?? "";
			clone.id = source.id;
			clone.uniqueId = source.uniqueId;
			clone.metadata = cloneJSObject(source.metadata) ?? {};

			const className = getClassName(source);
			if (className) {
				setClassName(clone, className);
			}

			if (isAbstractMesh(clone)) {
				clone.physicsAggregate = undefined;

				const sourceMesh = (source as Mesh).sourceMesh;
				if (sourceMesh) {
					clone.sourceMesh = (clones.get(sourceMesh) as Mesh) ?? sourceMesh;
				}
			}

			_copyNodeStates(source, clone);

			const entry = this._nodesMap.get(source);
			if (entry) {
				setNodeEnabled(clone, entry.enabled);
			}
		});

		// Add the meshes and lights to the scene
		let hasLights = false;

		clones.forEach((clone) => {
			if (isLight(clone)) {
				hasLights = true;
				_addNodeToScene(scene, clone as LightBase);
			} else if ("_gpu" in clone && "material" in clone) {
				try {
					_addNodeToScene(scene, clone as unknown as Mesh);
				} catch (e) {
					console.error(`Babylon.js Editor Tools Lite: failed to add the mesh "${clone.name}" to the scene.`, e);
				}
			}
		});

		// Levels of detail and behaviors of the meshes
		clones.forEach((clone, source) => {
			if (!isAbstractMesh(source)) {
				return;
			}

			const levels = getMeshLodLevels(source).filter((level) => !level.mesh || clones.has(level.mesh));
			if (levels.length) {
				configureMeshLods(
					scene,
					clone as Mesh,
					levels.map((level) => ({
						distanceOrScreenCoverage: level.distanceOrScreenCoverage,
						mesh: level.mesh ? (clones.get(level.mesh) as Mesh) : null,
					}))
				);
			}

			const behaviors = getMeshBehaviors(source);
			registerMeshBehaviors(scene, clone as Mesh, behaviors.billboardMode, behaviors.infiniteDistance);
		});

		rootNodes.forEach((node) => _refreshNodeVisibility(node));

		if (hasLights) {
			rebuildSceneRenderables(scene).catch((e) => console.error(e));
		}

		// Animation groups
		const animationGroups: EditorAnimationGroup[] = [];
		this.entities.animationGroups.forEach((animationGroup) => {
			if (options?.predicate && !options.predicate(animationGroup)) {
				return;
			}

			animationGroups.push(animationGroup.clone(`${animationGroup.name}-${namingId}`, (target) => clones.get(target) ?? target));
		});

		const result = new AdvancedAssetContainerInstantiatedEntries(scene, rootNodes, animationGroups, namingId);

		const sources = new Map<SceneNode | Camera, SceneNode | Camera>();
		clones.forEach((clone, source) => sources.set(clone, source));

		const newDescendants: (SceneNode | Camera)[] = [];
		rootNodes.forEach((node) => {
			newDescendants.push(node, ...getNodeDescendants(node, false));
		});

		// Names, ids and metadata of the new nodes
		newDescendants.forEach((newNode) => {
			const originalNode = sources.get(newNode)!;
			const originalId = originalNode.id;

			newNode.name = `${originalNode.name}-${namingId}`;
			newNode.id = randomId();

			newNode.metadata = cloneJSObject(this._nodesMap.get(originalNode)?.metadata ?? originalNode.metadata);
			newNode.metadata ??= {};
			newNode.metadata.originalId = originalId;

			if (isSoundNode(originalNode) && isTransformNode(newNode)) {
				setClassName(newNode, "SoundNode");
				configureSourceNodeFrom(originalNode, newNode as SoundNode);
			}

			registerSceneNode(scene, newNode, this._nodesMap.get(originalNode)?.kind ?? (isCamera(newNode) ? "camera" : "transformNode"));
		});

		// Make the entities referenced by the scripts point to the new nodes and animation groups
		newDescendants.forEach((newNode) => {
			const originalNode = sources.get(newNode)!;
			const originalId = originalNode.id;

			newDescendants.forEach((node) => {
				node.metadata?.scripts?.forEach((script) => {
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
								obj.value = `${originalAnimationGroup.name}-${namingId}`;
							}
						}
					});
				});
			});
		});

		// Apply scripts after everything else is set up to avoid issues with dependencies between scripts
		newDescendants.forEach((node) => {
			_applyScriptsForObject(this.scene, node, this._scriptsMap, {
				namingId,
				rootUrl: this._rootUrl,
			});
		});

		configureTransformNodes(this.scene);

		return result;
	}

	/**
	 * Disposes the nodes and the animation groups of the container.
	 */
	public dispose(): void {
		this.entities.animationGroups.forEach((animationGroup) => animationGroup.dispose());
		this.rootNodes.forEach((node) => disposeNode(this.scene, node));
	}

	private _cloneNode(source: SceneNode | Camera): SceneNode | Camera | null {
		try {
			if (isCamera(source)) {
				return cloneCamera(source, source.name ?? "");
			}

			return _cloneNodeWithoutChildren(source as SceneNode);
		} catch (e) {
			console.error(`Babylon.js Editor Tools Lite: failed to clone the node "${source.name}".`, e);
			return null;
		}
	}
}
