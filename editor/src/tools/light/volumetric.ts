import { Color3, Light } from "babylonjs";
import { IVolumetricLightConfiguration, ensureVolumetricLightConfiguration } from "babylonjs-editor-tools";

import { Editor } from "../../editor/main";

import { isCascadedShadowGenerator } from "../guards/shadows";
import { isDirectionalLight, isHemisphericLight } from "../guards/nodes";

import { getVolumetricLightingRenderingPipeline, markVolumetricLightsDirty } from "../../editor/rendering/volumetric-lighting";

import { isClusteredLight } from "./cluster";

/**
 * Returns wether or not the given light can take part in the volumetric lighting.
 * @param light defines the reference to the light to check.
 */
export function isVolumetricLightingAvailable(light: Light): boolean {
	return !isHemisphericLight(light);
}

/**
 * Returns a proxy over the volumetric lighting configuration of the given light. Assigning a property of
 * the returned object notifies the pipeline so the change is visible on the next frame, which lets the
 * inspector bind its fields directly and keep their built-in undo/redo support.
 * @param light defines the reference to the light to get its volumetric lighting configuration.
 */
const volumetricLightProxies = new WeakMap<Light, IVolumetricLightConfiguration>();

export function getVolumetricLightConfigurationProxy(light: Light): IVolumetricLightConfiguration {
	const configuration = ensureVolumetricLightConfiguration(light as any);

	// Cached: the inspector fields keep the object they were given in their internal state and re-seed it
	// whenever its identity changes, so handing them a new Proxy on every render would reset them mid-edit
	// and leave the undo/redo entries they register pointing at a throw-away object.
	let proxy = volumetricLightProxies.get(light);
	if (!proxy) {
		proxy = new Proxy(configuration, {
			set: (target, property, value) => {
				(target as any)[property] = value;
				markVolumetricLightsDirty();

				return true;
			},
		});

		volumetricLightProxies.set(light, proxy);
	}

	return proxy;
}

/**
 * Creates a Color3 whose three channels are accessors over the given array instead of plain values.
 *
 * The color field of the inspector mutates a Color3 in place, and its per-channel number fields register
 * their own undo/redo that writes straight into that Color3, bypassing every callback. Binding the channels
 * to the array makes all of those paths, including undo and redo, update the configuration itself.
 * @param read defines the function returning the array backing the color.
 * @param write defines the function storing the new array.
 */
export function createArrayBoundColor3(read: () => number[], write: (value: number[]) => void): Color3 {
	const color = new Color3();

	(["r", "g", "b"] as const).forEach((channel, index) => {
		Object.defineProperty(color, channel, {
			enumerable: true,
			configurable: true,
			get: () => read()[index] ?? 0,
			set: (value: number) => {
				const current = read();
				if (current[index] === value) {
					return;
				}

				const next = current.slice();
				next[index] = value;
				write(next);
			},
		});
	});

	return color;
}

const volumetricLightColors = new WeakMap<Light, { color: Color3 }>();

/**
 * Returns a stable object holding the custom volumetric color of the given light as a Color3 bound to the
 * array stored in its configuration, so the inspector can edit it like any other color.
 * @param light defines the reference to the light to get its custom volumetric color.
 */
export function getVolumetricLightColorObject(light: Light): { color: Color3 } {
	let entry = volumetricLightColors.get(light);
	if (!entry) {
		entry = {
			color: createArrayBoundColor3(
				() => ensureVolumetricLightConfiguration(light as any).color,
				(value) => {
					ensureVolumetricLightConfiguration(light as any).color = value;
					markVolumetricLightsDirty();
				}
			),
		};

		volumetricLightColors.set(light, entry);
	}

	return entry;
}

/**
 * Returns how the light shafts of the given light are occluded by the geometry of the scene, and explains it.
 *
 * A light that renders a shadow map is occluded by it, which is exact. Any other light, including every light
 * of a clustered light container, falls back on the depth buffer of the scene, which is an approximation but
 * is what stops its shafts from showing through the walls that stand between it and the camera.
 * @param light defines the reference to the light to check.
 * @param editor defines the reference to the editor.
 */
export function getVolumetricLightOcclusionMode(light: Light, editor: Editor): { usesShadowMap: boolean; reason: string } {
	const scene = editor.layout.preview.scene;
	const pipeline = getVolumetricLightingRenderingPipeline();

	if (pipeline && !pipeline.configuration.screenSpaceShadows) {
		const generator = light.getShadowGenerator(scene.activeCamera) ?? light.getShadowGenerator();
		const usesShadowMap = !isClusteredLight(light, editor) && !!generator && scene.shadowsEnabled && light.shadowEnabled;

		return {
			usesShadowMap,
			reason: usesShadowMap
				? "Occluded using the shadow map the light already renders for the surfaces of the scene."
				: 'Not occluded at all: this light has no shadow map and "Occlude Lights With Geometry" is disabled on the pipeline.',
		};
	}

	if (!scene.shadowsEnabled || !light.shadowEnabled) {
		return {
			usesShadowMap: false,
			reason: "Occluded using the depth buffer of the scene: shadows are disabled on this light or on the scene.",
		};
	}

	if (isClusteredLight(light, editor)) {
		return {
			usesShadowMap: false,
			reason: "Occluded using the depth buffer of the scene: clustered lighting doesn't support shadow maps.",
		};
	}

	const generator = light.getShadowGenerator(scene.activeCamera) ?? light.getShadowGenerator();
	if (!generator) {
		return {
			usesShadowMap: false,
			reason: "Occluded using the depth buffer of the scene. Enable shadows on this light to use its shadow map instead, which is more accurate.",
		};
	}

	if (isCascadedShadowGenerator(generator) && !isDirectionalLight(light)) {
		return {
			usesShadowMap: false,
			reason: "Occluded using the depth buffer of the scene: cascaded shadow maps are only supported on directional lights.",
		};
	}

	return {
		usesShadowMap: true,
		reason: "Occluded using the shadow map the light already renders for the surfaces of the scene.",
	};
}

/**
 * Returns a human readable description of what the given light currently does in the volumetric lighting
 * rendering pipeline, drawn under the fields of the inspector.
 * @param light defines the reference to the light to describe.
 * @param editor defines the reference to the editor.
 */
export function getVolumetricLightStatusLabel(light: Light, editor: Editor): string {
	const pipeline = getVolumetricLightingRenderingPipeline();
	if (!pipeline) {
		return 'Volumetric lighting is disabled on this camera. Enable it in the "Volumetric Lighting" section of the scene inspector.';
	}

	if (pipeline.camera !== (editor.layout.preview.scene.activeCamera as any)) {
		return "Volumetric lighting is enabled on another camera.";
	}

	return pipeline.getStats()?.perLight.get(light.uniqueId)?.reason ?? "Waiting for the next update of the volumetric lighting.";
}
