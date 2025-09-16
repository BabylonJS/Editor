import { Node } from "@babylonjs/core/node";
import { Scene } from "@babylonjs/core/scene";
import { Material } from "@babylonjs/core/Materials/material";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { GPUParticleSystem } from "@babylonjs/core/Particles/gpuParticleSystem";
import { NodeParticleSystemSet } from "@babylonjs/core/Particles/Node/nodeParticleSystemSet";

import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

import type { AudioSceneComponent as _AudioSceneComponent } from "@babylonjs/core/Audio/audioSceneComponent";

import { getSoundById } from "../tools/sound";
import { isAbstractMesh, isNode } from "../tools/guards";

import { IPointerEventDecoratorOptions } from "./events";
import { VisibleInInspectorDecoratorConfiguration, VisibleInInspectorDecoratorEntityConfiguration, VisibleInspectorDecoratorAssetConfiguration } from "./inspector";

export interface ISceneDecoratorData {
	// @nodeFromScene
	_NodesFromScene: {
		nodeName: string;
		propertyKey: string | Symbol;
	}[];

	// @nodeFromDescendants
	_NodesFromDescendants: {
		nodeName: string;
		propertyKey: string | Symbol;
		directDescendantsOnly: boolean;
	}[];

	// @fromAnimationGroups
	_AnimationGroups: {
		animationGroupName: string;
		propertyKey: string | Symbol;
	}[];

	// @soundFromScene
	_SoundsFromScene: {
		soundName: string;
		propertyKey: string | Symbol;
	}[];

	// @guiFromAsset
	_GuiFromAsset: {
		pathInAssets: string;
		onGuiCreated?: (instance: unknown, gui: AdvancedDynamicTexture) => unknown;
		propertyKey: string | Symbol;
	}[];

	// @fromParticleSystems
	_ParticleSystemsFromScene: {
		particleSystemName: string;
		directDescendantsOnly: boolean;
		propertyKey: string | Symbol;
	}[];

	// @visibleAsNumber, @visibleAsBoolean etc.
	_VisibleInInspector: {
		label?: string;
		propertyKey: string | Symbol;
		configuration: VisibleInInspectorDecoratorConfiguration;
	}[];

	// @onPointerEvent
	_PointerEvents: {
		eventTypes: number[];
		options: IPointerEventDecoratorOptions;
		propertyKey: string | Symbol;
	}[];

	// @onKeyboardEvent
	_KeyboardEvents: {
		eventTypes: number[];
		propertyKey: string | Symbol;
	}[];
}

export async function applyDecorators(scene: Scene, object: any, script: any, instance: any, rootUrl: string) {
	const ctor = instance.constructor as ISceneDecoratorData;
	if (!ctor) {
		return;
	}

	// @nodeFromScene
	ctor._NodesFromScene?.forEach((params) => {
		instance[params.propertyKey.toString()] = scene.getNodeByName(params.nodeName);
	});

	// @nodeFromDescendants
	ctor._NodesFromDescendants?.forEach((params) => {
		const descendant = (object as Partial<Node>).getDescendants?.(params.directDescendantsOnly, (node) => node.name === params.nodeName)[0];
		instance[params.propertyKey.toString()] = descendant ?? null;
	});

	// @fromAnimationGroups
	ctor._AnimationGroups?.forEach((params) => {
		instance[params.propertyKey.toString()] = scene.getAnimationGroupByName(params.animationGroupName);
	});

	// @soundFromScene
	ctor._SoundsFromScene?.forEach((params) => {
		const sound = scene.getSoundByName?.(params.soundName);
		instance[params.propertyKey.toString()] = sound ?? null;
	});

	// @guiFromAsset
	await Promise.all(
		(ctor._GuiFromAsset ?? []).map(async (params) => {
			const guiUrl = `${rootUrl}assets/${params.pathInAssets}`;

			try {
				const response = await fetch(guiUrl);
				const data = await response.json();

				const gui = AdvancedDynamicTexture.CreateFullscreenUI(data.name, true, scene);
				gui.parseSerializedObject(data.content, false);

				instance[params.propertyKey.toString()] = gui;
				params.onGuiCreated?.(instance, gui);
			} catch (e) {
				console.error(`Failed to load GUI from asset: ${guiUrl}`);
				throw e;
			}
		})
	);

	// @fromParticleSystems
	ctor._ParticleSystemsFromScene?.forEach((params) => {
		const particleSystem = scene.particleSystems?.find((particleSystem: ParticleSystem | GPUParticleSystem) => {
			if (particleSystem.name !== params.particleSystemName) {
				return false;
			}

			return params.directDescendantsOnly ? particleSystem.emitter === object : particleSystem;
		});

		instance[params.propertyKey.toString()] = particleSystem;
	});

	// @visibleAsNumber, @visibleAsBoolean etc.
	await Promise.all(
		(ctor._VisibleInInspector ?? []).map(async (params) => {
			const propertyKey = params.propertyKey.toString();
			const attachedScripts = script.values;

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
						instance[propertyKey] = Vector2.FromArray(value);
						break;
					case "vector3":
						instance[propertyKey] = Vector3.FromArray(value);
						break;

					case "color3":
						instance[propertyKey] = Color3.FromArray(value);
						break;
					case "color4":
						instance[propertyKey] = Color4.FromArray(value);
						break;

					case "entity":
						const entityType = (params.configuration as VisibleInInspectorDecoratorEntityConfiguration).entityType;
						switch (entityType) {
							case "node":
								instance[propertyKey] = scene.getNodeById(value) ?? null;
								break;
							case "animationGroup":
								instance[propertyKey] = scene.getAnimationGroupByName(value) ?? null;
								break;
							case "sound":
								instance[propertyKey] = getSoundById(value, scene);
								break;
							case "particleSystem":
								instance[propertyKey] = scene.particleSystems?.find((ps) => ps.id === value) ?? null;
								break;
						}
						break;

					case "texture":
						if (value) {
							instance[propertyKey] = Texture.Parse(value, scene, rootUrl);
						}
						break;

					case "asset":
						if (value) {
							const assetType = (params.configuration as VisibleInspectorDecoratorAssetConfiguration).assetType;

							const response = await fetch(`${rootUrl}${value}`);
							const data = await response.json();
							switch (assetType) {
								case "nodeParticleSystemSet":
									const npss = NodeParticleSystemSet.Parse(data);
									instance[propertyKey] = npss;
									break;

								case "material":
									instance[propertyKey] = Material.Parse(data, scene, rootUrl);
									break;
							}
						}
				}
			}
		})
	);

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

		scene.onPointerObservable.add((pointerInfo) => {
			let pickInfo: PickingInfo | null = null;

			ctor._PointerEvents.forEach((params) => {
				if (!params.eventTypes.includes(pointerInfo.type)) {
					return;
				}

				const propertyKey = params.propertyKey.toString();

				if (params.options.mode === "global") {
					return instance[propertyKey]?.(pointerInfo);
				}

				pickInfo = pointerInfo.pickInfo;
				if (!pickInfo) {
					pickInfo = scene.pick(
						scene.pointerX,
						scene.pointerY,
						(m) => {
							return m.isVisible && m.isPickable && m.isEnabled(true) && !m._masterMesh;
						},
						false
					);
				}

				const pickedMesh = pickInfo.pickedMesh;
				if (pickedMesh) {
					if (params.options.mode === "attachedMeshOnly" && pickedMesh === object) {
						return instance[propertyKey]?.(pointerInfo);
					}

					if (params.options.mode === "includeDescendants" && isNode(object)) {
						const descendants = [object, ...object.getDescendants(false)];
						const pickedDescendant = descendants.find((d) => d === pickedMesh);
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
		scene.onKeyboardObservable.add((keyboardInfo) => {
			ctor._KeyboardEvents.forEach((params) => {
				if (!params.eventTypes.includes(keyboardInfo.type)) {
					return;
				}

				instance[params.propertyKey.toString()]?.(keyboardInfo);
			});
		});
	}
}
