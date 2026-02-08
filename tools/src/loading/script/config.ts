import { Scene } from "@babylonjs/core/scene";
import { Material } from "@babylonjs/core/Materials/material";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { NodeParticleSystemSet } from "@babylonjs/core/Particles/Node/nodeParticleSystemSet";

import { getSoundById } from "../../tools/sound";

import {
	VisibleInInspectorDecoratorColor3Configuration,
	VisibleInInspectorDecoratorColor4Configuration,
	VisibleInInspectorDecoratorConfiguration,
	VisibleInInspectorDecoratorEntityConfiguration,
	VisibleInInspectorDecoratorNumberConfiguration,
	VisibleInInspectorDecoratorStringConfiguration,
	VisibleInInspectorDecoratorTextureConfiguration,
	VisibleInInspectorDecoratorVector2Configuration,
	VisibleInInspectorDecoratorVector3Configuration,
	VisibleInspectorDecoratorAssetConfiguration,
} from "../../decorators/inspector";

import { scriptAssetsCache } from "./preload";

export type ScriptConfig = {
	[key: string]: {
		label: string;
		value?: any;
		configuration:
			| VisibleInInspectorDecoratorConfiguration
			| VisibleInInspectorDecoratorStringConfiguration
			| VisibleInInspectorDecoratorNumberConfiguration
			| VisibleInInspectorDecoratorVector2Configuration
			| VisibleInInspectorDecoratorVector3Configuration
			| VisibleInInspectorDecoratorColor3Configuration
			| VisibleInInspectorDecoratorColor4Configuration
			| VisibleInInspectorDecoratorEntityConfiguration
			| VisibleInInspectorDecoratorTextureConfiguration
			| VisibleInspectorDecoratorAssetConfiguration;
	};
};

export function applyConfig(scene: Scene, instance: ScriptConfig, config: ScriptConfig, rootUrl: string) {
	const keys = Object.keys(instance);
	keys.forEach((key) => {
		const exportedValue = config[key];
		const originalValue = instance[key];

		if (!exportedValue || !originalValue) {
			return;
		}

		switch (originalValue.configuration.type) {
			case "number":
			case "boolean":
			case "keymap":
			case "string":
				originalValue.value = exportedValue.value;
				break;

			case "vector2":
				originalValue.value = Vector2.FromArray(exportedValue.value);
				break;
			case "vector3":
				originalValue.value = Vector3.FromArray(exportedValue.value);
				break;

			case "color3":
				originalValue.value = Color3.FromArray(exportedValue.value);
				break;
			case "color4":
				originalValue.value = Color4.FromArray(exportedValue.value);
				break;

			case "entity":
				const entityType = (originalValue.configuration as VisibleInInspectorDecoratorEntityConfiguration).entityType;
				switch (entityType) {
					case "node":
						originalValue.value = scene.getNodeById(exportedValue.value) ?? null;
						break;
					case "animationGroup":
						originalValue.value = scene.getAnimationGroupByName(exportedValue.value) ?? null;
						break;
					case "sound":
						originalValue.value = getSoundById(exportedValue.value, scene);
						break;
					case "particleSystem":
						originalValue.value = scene.particleSystems?.find((ps) => ps.id === exportedValue.value) ?? null;
						break;
				}
				break;

			case "texture":
				if (exportedValue.value) {
					originalValue.value = Texture.Parse(exportedValue.value, scene, rootUrl);
				}
				break;

			case "asset":
				if (exportedValue.value) {
					const assetType = (originalValue.configuration as VisibleInspectorDecoratorAssetConfiguration).assetType;
					const data = scriptAssetsCache.get(exportedValue.value);

					switch (assetType) {
						case "json":
						case "gui":
						case "scene":
						case "navmesh":
							originalValue.value = data;
							break;

						case "nodeParticleSystemSet":
							const npss = NodeParticleSystemSet.Parse(data);
							originalValue.value = npss;
							break;

						case "material":
							originalValue.value = Material.Parse(data, scene, rootUrl);
							break;
					}
				}
				break;
		}
	});
}
