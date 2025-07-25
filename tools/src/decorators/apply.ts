import { Node } from "@babylonjs/core/node";
import { Scene } from "@babylonjs/core/scene";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";

import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

import type { AudioSceneComponent as _AudioSceneComponent } from "@babylonjs/core/Audio/audioSceneComponent";

import { getSoundById } from "../tools/sound";

import {
	VisibleInInspectorDecoratorConfiguration, VisibleInInspectorDecoratorEntityConfiguration,
} from "./inspector";

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
		propertyKey: string | Symbol;
	}[];

	// @visibleAsNumber, @visibleAsBoolean etc.
	_VisibleInInspector: {
		label?: string;
		propertyKey: string | Symbol;
		configuration: VisibleInInspectorDecoratorConfiguration;
	}[];
}

export function applyDecorators(scene: Scene, object: any, script: any, instance: any, rootUrl: string) {
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
	ctor._GuiFromAsset?.forEach(async (params) => {
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
	});

	// @fromParticleSystems
	ctor._ParticleSystemsFromScene?.forEach((params) => {
		const particleSystem = scene.particleSystems?.find((particleSystem) => {
			return particleSystem.name === params.particleSystemName;
		});

		instance[params.propertyKey.toString()] = particleSystem;
	});

	// @visibleAsNumber, @visibleAsBoolean etc.
	ctor._VisibleInInspector?.forEach((params) => {
		const propertyKey = params.propertyKey.toString();
		const attachedScripts = script.values;

		if (
			attachedScripts.hasOwnProperty(propertyKey) &&
			attachedScripts[propertyKey].hasOwnProperty("value")
		) {
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
			}
		}
	});
}
