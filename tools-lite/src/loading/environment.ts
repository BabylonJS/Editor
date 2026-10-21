import { isPbrMaterial, loadEnvironment, loadHdrEnvironment, loadProceduralSkyEnvironment, Material, SceneContext, setEnvironmentRotation, setFog } from "@babylonjs/lite";

import { getLoadableUrl } from "../tools/request";

import { getSkySunPosition } from "./materials/sky";

/**
 * Returns the URL of the BRDF lookup texture to use for the given options: the provided one or the texture embedded
 * in the tools (loaded on demand).
 * @param brdfUrl defines the optional URL of the BRDF lookup texture provided by the application.
 */
export async function getBrdfTextureUrl(brdfUrl?: string): Promise<string> {
	if (brdfUrl) {
		return brdfUrl;
	}

	const { defaultBrdfTextureUrl } = await import("./brdf");
	return defaultBrdfTextureUrl;
}

/**
 * Applies the clear color and the fog of the given serialized scene.
 * @param scene defines the reference to the scene to configure.
 * @param data defines the serialized scene.
 */
export function applySceneProperties(scene: SceneContext, data: any): void {
	if (data.clearColor) {
		scene.clearColor = {
			r: data.clearColor[0],
			g: data.clearColor[1],
			b: data.clearColor[2],
			a: data.clearColor[3] ?? 1,
		};
	}

	if (data.fogMode) {
		const color = data.fogColor ?? [0.2, 0.2, 0.3];

		setFog(scene, {
			mode: data.fogMode,
			density: data.fogDensity ?? 0.1,
			start: data.fogStart ?? 0,
			end: data.fogEnd ?? 1000,
			color: [color[0], color[1], color[2]],
		});
	}
}

/**
 * Returns the URL of the environment texture of the given serialized scene, if any.
 * @param data defines the serialized scene.
 */
export function getEnvironmentTextureUrl(data: any): string | null {
	const environmentTexture = data.environmentTexture;
	if (!environmentTexture) {
		return null;
	}

	if (typeof environmentTexture === "string") {
		return environmentTexture;
	}

	return environmentTexture.url ?? environmentTexture.name ?? null;
}

/**
 * Loads the environment texture of the given serialized scene (`.env` or `.hdr`) used for the image based lighting
 * of the PBR materials. As in Babylon.js, no skybox or ground is created: they are meshes of the scene in the editor.
 * @param scene defines the reference to the scene to configure.
 * @param rootUrl defines the root url of the scene.
 * @param data defines the serialized scene.
 * @param brdfUrl defines the optional URL of the BRDF lookup texture provided by the application.
 * @returns true if an environment has been loaded.
 */
export async function loadSceneEnvironment(scene: SceneContext, rootUrl: string, data: any, brdfUrl?: string): Promise<boolean> {
	const url = getEnvironmentTextureUrl(data);
	if (!url) {
		return false;
	}

	const absoluteUrl = url.indexOf("://") > 0 || url.startsWith("data:") ? url : `${rootUrl}${url}`;
	const loadableUrl = await getLoadableUrl(absoluteUrl);

	try {
		if (data.environmentTextureType === "BABYLON.HDRCubeTexture" || url.toLowerCase().endsWith(".hdr")) {
			await loadHdrEnvironment(scene, loadableUrl, {
				faceSize: data.environmentTextureSize ?? 256,
				skipSkybox: true,
				skipGround: true,
			});
		} else {
			await loadEnvironment(scene, loadableUrl, {
				brdfUrl: await getBrdfTextureUrl(brdfUrl),
				skipSkybox: true,
				skipGround: true,
			});
		}
	} catch (e) {
		console.error(`Failed to load the environment texture "${absoluteUrl}".`, e);
		return false;
	}

	const rotationY = data.environmentTextureRotationY ?? data.environmentTexture?.rotationY ?? 0;
	if (rotationY) {
		setEnvironmentRotation(scene, rotationY);
	}

	return true;
}

/**
 * Applies the environment intensity of the scene to the given materials. Babylon Lite has no scene environment
 * intensity: it is multiplied with the environment intensity of each PBR material, as Babylon.js does when shading.
 * @param materials defines the list of materials to configure.
 * @param data defines the serialized scene.
 */
export function applyEnvironmentIntensity(materials: Iterable<Material | null>, data: any): void {
	const intensity = (data.environmentIntensity ?? 1) * (data.iblIntensity ?? 1);
	if (intensity === 1) {
		return;
	}

	for (const material of materials) {
		if (material && isPbrMaterial(material)) {
			material.environmentIntensity = (material.environmentIntensity ?? 1) * intensity;
		}
	}
}

/**
 * Creates the procedural sky environment of Babylon Lite from the given serialized sky material (`BABYLON.SkyMaterial`):
 * the sky is used for the image based lighting of the scene. As with Babylon.js, the scenes loaded by the tools don't
 * use the sky materials for the image based lighting: this function can be used when the scene has no environment texture.
 * @param scene defines the reference to the scene to configure.
 * @param data defines the serialized sky material.
 * @param brdfUrl defines the optional URL of the BRDF lookup texture provided by the application.
 */
export async function loadSkyEnvironment(scene: SceneContext, data: any, brdfUrl?: string): Promise<void> {
	const sunDirection = getSkySunPosition({
		luminance: data.luminance ?? 1,
		turbidity: data.turbidity ?? 10,
		rayleigh: data.rayleigh ?? 2,
		mieCoefficient: data.mieCoefficient ?? 0.005,
		mieDirectionalG: data.mieDirectionalG ?? 0.8,
		distance: data.distance ?? 500,
		inclination: data.inclination ?? 0.49,
		azimuth: data.azimuth ?? 0.25,
		useSunPosition: data.useSunPosition ?? false,
		sunPosition: { x: data.sunPosition?.[0] ?? 0, y: data.sunPosition?.[1] ?? 100, z: data.sunPosition?.[2] ?? 0 },
		cameraOffset: { x: 0, y: 0, z: 0 },
		up: { x: data.up?.[0] ?? 0, y: data.up?.[1] ?? 1, z: data.up?.[2] ?? 0 },
		cloudiness: data.cloudiness ?? 0,
	});

	const length = Math.sqrt(sunDirection[0] * sunDirection[0] + sunDirection[1] * sunDirection[1] + sunDirection[2] * sunDirection[2]) || 1;

	try {
		await loadProceduralSkyEnvironment(scene, {
			sunDirection: [sunDirection[0] / length, sunDirection[1] / length, sunDirection[2] / length],
			luminance: data.luminance ?? 1,
			turbidity: data.turbidity ?? 10,
			rayleigh: data.rayleigh ?? 2,
			mieCoefficient: data.mieCoefficient ?? 0.005,
			mieDirectionalG: data.mieDirectionalG ?? 0.8,
			brdfUrl: await getBrdfTextureUrl(brdfUrl),
		});
	} catch (e) {
		console.error(`Failed to create the procedural sky of the sky material "${data.name}".`, e);
	}
}
