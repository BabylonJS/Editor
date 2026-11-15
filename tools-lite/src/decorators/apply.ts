import { Mesh, parseNodeParticleSource, SceneContext } from "@babylonjs/lite";

import { Observer } from "../tools/observable";
import { copyAndParseRagdollConfiguration } from "../tools/ragdoll";
import { ISpriteAnimation, SpriteManagerNode } from "../tools/sprite";
import { IKeyboardInfo, IPointerInfo } from "../tools/inputs";
import { _isInternalNode, getNodeDescendants } from "../tools/node";
import { getAnimationGroupByName, getNodeById, getNodeByName, getNodeContainer, getSceneData } from "../tools/scene";
import { isAbstractMesh, isNode, isSoundNode, isSprite, isSpriteManagerNode } from "../tools/guards";

import { scriptAssetsCache, scriptTexturesCache } from "../loading/script/preload";
import { getScriptByClassForObject } from "../loading/script/apply";

import { NodeFromSceneOptions } from "./scene";
import { SoundFromSceneOptions } from "./sound";
import { IPointerEventDecoratorOptions } from "./events";
import { VisibleInInspectorDecoratorConfiguration, VisibleInInspectorDecoratorEntityConfiguration, VisibleInspectorDecoratorAssetConfiguration } from "./inspector";

export interface ISceneDecoratorData {
	// @nodeFromScene
	_NodesFromScene?: {
		nodeName: string;
		propertyKey: string | Symbol;
		options?: NodeFromSceneOptions;
	}[];

	// @nodeFromDescendants
	_NodesFromDescendants?: {
		nodeName: string;
		propertyKey: string | Symbol;
		directDescendantsOnly: boolean;
	}[];

	// @fromAnimationGroups
	_AnimationGroups?: {
		animationGroupName: string;
		propertyKey: string | Symbol;
	}[];

	// @soundFromScene
	_SoundsFromScene?: {
		soundName: string;
		propertyKey: string | Symbol;
		options?: SoundFromSceneOptions;
	}[];

	// @componentFromScene
	_ComponentsFromScene?: {
		componentConstructor: new (...args: any) => any;
		propertyKey: string | Symbol;
	}[];

	// @guiFromAsset
	_GuiFromAsset?: {
		pathInAssets: string;
		onGuiCreated?: (instance: unknown, gui: unknown) => unknown;
		propertyKey: string | Symbol;
	}[];

	// @fromParticleSystems
	_ParticleSystemsFromScene?: {
		particleSystemName: string;
		directDescendantsOnly: boolean;
		propertyKey: string | Symbol;
	}[];

	// @visibleAsNumber, @visibleAsBoolean etc.
	_VisibleInInspector?: {
		label?: string;
		propertyKey: string | Symbol;
		configuration: VisibleInInspectorDecoratorConfiguration;
	}[];

	// @sceneAsset
	_SceneAssets?: {
		sceneName: string;
		propertyKey: string | Symbol;
	}[];

	// @onPointerEvent
	_PointerEvents?: {
		eventTypes: number[];
		options: IPointerEventDecoratorOptions;
		propertyKey: string | Symbol;
	}[];

	// @onKeyboardEvent
	_KeyboardEvents?: {
		eventTypes: number[];
		propertyKey: string | Symbol;
	}[];

	// @spriteFromSpriteManager
	_SpritesFromSpriteManager?: {
		spriteName: string;
		propertyKey: string | Symbol;
	}[];

	// @animationFromSprite
	_AnimationsFromSprite?: {
		animationName: string;
		propertyKey: string | Symbol;
	}[];
}

function formatNameWithId(name: string, namingId?: string) {
	return namingId ? `${name}-${namingId}` : name;
}

/**
 * Returns the node the given picked mesh belongs to: the meshes created by the tools for the sub-meshes and the
 * levels of detail of a mesh are internal and resolve to the mesh itself.
 */
function getPickedNode(mesh: Mesh): any {
	let node: any = mesh;
	while (node && _isInternalNode(node) && node.parent) {
		node = node.parent;
	}

	return node;
}

export interface IApplyDecoratorsOptions {
	rootUrl: string;
	namingId?: string;
}

export function applyDecorators(scene: SceneContext, object: any, script: any, instance: any, options: IApplyDecoratorsOptions) {
	const ctor = instance.constructor as ISceneDecoratorData;
	if (!ctor) {
		return;
	}

	const sceneData = getSceneData(scene);

	// @nodeFromScene
	ctor._NodesFromScene?.forEach((params) => {
		instance[params.propertyKey.toString()] = getNodeByName(
			formatNameWithId(params.nodeName, params.options?.global ? undefined : options.namingId),
			scene,
			params.options?.global ? undefined : getNodeContainer(object)
		);
	});

	// @componentFromScene
	if (ctor._ComponentsFromScene?.length) {
		sceneData.onBeginFrameObservable.addOnce(() => {
			ctor._ComponentsFromScene?.forEach((params) => {
				const components: any[] = [];

				const nodes = [scene, ...sceneData.transformNodes, ...sceneData.meshes, ...sceneData.lights, ...sceneData.cameras];
				nodes.forEach((node) => {
					const component = getScriptByClassForObject(node, params.componentConstructor);
					if (component) {
						components.push(component);
					}
				});

				if (components.length > 1) {
					throw new Error(
						`Multiple components of type ${ctor._ComponentsFromScene![0].componentConstructor.name} found in scene for property "${ctor._ComponentsFromScene![0].propertyKey.toString()}".`
					);
				}

				instance[params.propertyKey.toString()] = components[0] ?? null;
			});
		});
	}

	// @nodeFromDescendants
	ctor._NodesFromDescendants?.forEach((params) => {
		const descendant = isNode(object)
			? getNodeDescendants(object, params.directDescendantsOnly, (node) => node.name === formatNameWithId(params.nodeName, options.namingId))[0]
			: undefined;
		instance[params.propertyKey.toString()] = descendant ?? null;
	});

	// @fromAnimationGroups
	ctor._AnimationGroups?.forEach((params) => {
		instance[params.propertyKey.toString()] = getAnimationGroupByName(formatNameWithId(params.animationGroupName, options.namingId), scene);
	});

	// @soundFromScene
	ctor._SoundsFromScene?.forEach((params) => {
		const sound = getNodeByName(
			formatNameWithId(params.soundName, params.options?.global ? undefined : options.namingId),
			scene,
			params.options?.global ? undefined : getNodeContainer(object)
		);
		if (sound && isSoundNode(sound)) {
			instance[params.propertyKey.toString()] = sound ?? null;
		}
	});

	// @guiFromAsset, deprecated
	(ctor._GuiFromAsset ?? []).forEach((params) => {
		console.error(`Failed to load GUI from asset "${params.pathInAssets}": Babylon Lite has no GUI system.`);
		instance[params.propertyKey.toString()] = null;
	});

	// @fromParticleSystems
	ctor._ParticleSystemsFromScene?.forEach((params) => {
		const particleSystem = sceneData.particleSystems.find((particleSystem: any) => {
			if (particleSystem.name !== formatNameWithId(params.particleSystemName, options.namingId)) {
				return false;
			}

			return params.directDescendantsOnly ? particleSystem.emitter === object : particleSystem;
		});

		instance[params.propertyKey.toString()] = particleSystem;
	});

	// @visibleAsNumber, @visibleAsBoolean etc.
	(ctor._VisibleInInspector ?? []).forEach((params) => {
		const propertyKey = params.propertyKey.toString();
		const attachedScripts = script.values;

		if (!attachedScripts) {
			throw new Error(`No values found for script with key "${script.key}".`);
		}

		if (attachedScripts.hasOwnProperty(propertyKey) && attachedScripts[propertyKey].hasOwnProperty("value")) {
			const value = attachedScripts[propertyKey].value;

			switch (params.configuration.type) {
				case "number":
				case "boolean":
				case "keymap":
				case "string":
					instance[propertyKey] = value;
					break;

				case "vector2":
					instance[propertyKey] = { x: value[0], y: value[1] };
					break;
				case "vector3":
					instance[propertyKey] = { x: value[0], y: value[1], z: value[2] };
					break;

				case "color3":
					instance[propertyKey] = [value[0], value[1], value[2]];
					break;
				case "color4":
					instance[propertyKey] = [value[0], value[1], value[2], value[3]];
					break;

				case "entity":
					const entityType = (params.configuration as VisibleInInspectorDecoratorEntityConfiguration).entityType;
					switch (entityType) {
						case "node":
						case "sound":
							instance[propertyKey] = getNodeById(value, scene) ?? null;
							break;
						case "animationGroup":
							instance[propertyKey] = getAnimationGroupByName(value, scene) ?? null;
							break;
						case "particleSystem":
							instance[propertyKey] = sceneData.particleSystems.find((ps: any) => ps.id === value) ?? null;
							break;
					}
					break;

				case "texture":
					if (value) {
						instance[propertyKey] = scriptTexturesCache.get(scene)?.get(value.name ?? value.url) ?? null;
					}
					break;

				case "asset":
					if (value) {
						const assetType = (params.configuration as VisibleInspectorDecoratorAssetConfiguration).assetType;

						const assetsCache = scriptAssetsCache.get(scene)!;
						const data = assetsCache?.get(value);

						switch (assetType) {
							case "json":
							case "gui":
							case "scene":
							case "navmesh":
							case "cinematic":
							case "material":
								instance[propertyKey] = data;
								break;

							case "ragdoll":
								instance[propertyKey] = copyAndParseRagdollConfiguration(data);
								break;

							case "nodeParticleSystemSet":
								instance[propertyKey] = data ? parseNodeParticleSource(data) : null;
								break;
						}
					}
			}
		}
	});

	let pointerObserver: Observer<IPointerInfo> | null = null;
	let keyboardObserver: Observer<IKeyboardInfo> | null = null;

	// @onPointerEvent
	if (ctor._PointerEvents?.length) {
		const wrongMeshListener = ctor._PointerEvents.find((params) => params.options.mode === "attachedMeshOnly");
		if (wrongMeshListener && !isAbstractMesh(object)) {
			throw new Error(`@onPointerEvent with mode "attachedMeshOnly" can only be used on scripts attached to meshes (extends AbstractMesh).`);
		}

		const wrongSceneListener = ctor._PointerEvents.find((params) => params.options.mode !== "global");
		if (wrongSceneListener && !isNode(object)) {
			throw new Error(`@onPointerEvent with mode different from "global" can be used only on scripts attached to Node: Mesh, Light, Camera, TransformNode.`);
		}

		pointerObserver = sceneData.onPointerObservable.add((pointerInfo) => {
			ctor._PointerEvents!.forEach((params) => {
				if (!params.eventTypes.includes(pointerInfo.type)) {
					return;
				}

				const propertyKey = params.propertyKey.toString();

				if (params.options.mode === "global") {
					return instance[propertyKey]?.(pointerInfo);
				}

				const pickedMesh = pointerInfo.pickInfo?.pickedMesh;
				if (pickedMesh) {
					const pickedNode = getPickedNode(pickedMesh as Mesh);

					if (params.options.mode === "attachedMeshOnly" && pickedNode === object) {
						return instance[propertyKey]?.(pointerInfo);
					}

					if (params.options.mode === "includeDescendants" && isNode(object)) {
						const descendants = [object, ...getNodeDescendants(object, false)];
						const pickedDescendant = descendants.find((d) => d === pickedNode);
						if (pickedDescendant) {
							return instance[propertyKey]?.(pointerInfo);
						}
					}
				}
			});
		});
	}

	// @onKeyboardEvent
	if (ctor._KeyboardEvents?.length) {
		keyboardObserver = sceneData.onKeyboardObservable.add((keyboardInfo) => {
			ctor._KeyboardEvents!.forEach((params) => {
				if (!params.eventTypes.includes(keyboardInfo.type)) {
					return;
				}

				instance[params.propertyKey.toString()]?.(keyboardInfo);
			});
		});
	}

	// @spriteFromSpriteManager
	if (ctor._SpritesFromSpriteManager?.length) {
		const spriteManagerNode = object as SpriteManagerNode;

		if (!isSpriteManagerNode(spriteManagerNode) || !spriteManagerNode.isSpriteManager) {
			return console.error(`@spriteFromSpriteManager decorator can only be used on SpriteManagerNode.`);
		}

		if (!spriteManagerNode.spriteManager) {
			return console.error(`SpriteManagerNode "${spriteManagerNode.name}" has no sprite manager assigned.`);
		}

		ctor._SpritesFromSpriteManager?.forEach((params) => {
			const sprite = spriteManagerNode.spriteManager?.sprites.find((s) => s.name === formatNameWithId(params.spriteName, options.namingId)) || null;
			instance[params.propertyKey.toString()] = sprite;
		});
	}

	// @animationFromSprite
	if (ctor._AnimationsFromSprite?.length) {
		if (!isSprite(object)) {
			return console.error(`@animationFromSprite decorator can only be used in scripts attached on Sprite.`);
		}

		const spriteAnimations = object.metadata?.spriteAnimations as ISpriteAnimation[];
		if (!spriteAnimations?.length) {
			return console.error(`Sprite "${object.name}" has no sprite animations assigned.`);
		}

		ctor._AnimationsFromSprite.forEach((params) => {
			const animation = spriteAnimations.find((a) => a.name === formatNameWithId(params.animationName, options.namingId));
			if (animation) {
				instance[params.propertyKey.toString()] = animation ?? null;
			} else {
				console.warn(`Sprite animation named "${formatNameWithId(params.animationName, options.namingId)}" not found on sprite "${object.name}".`);
			}
		});
	}

	// @sceneAsset
	ctor._SceneAssets?.forEach((params) => {
		const assetsCache = scriptAssetsCache.get(scene)!;
		instance[params.propertyKey.toString()] = assetsCache?.get(params.sceneName);
	});

	return {
		observers: {
			pointerObserver,
			keyboardObserver,
		},
	};
}
