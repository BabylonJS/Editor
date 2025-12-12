import type { Scene } from "@babylonjs/core";
import { Tools } from "@babylonjs/core/Misc/tools";
import type { IDisposable } from "@babylonjs/core/scene";
import type { QuarksVFXJSON } from "./types/quarksTypes";
import type { VFXLoaderOptions } from "./types/loader";
import { VFXParser } from "./parsers/VFXParser";
import type { VFXParticleSystem } from "./systems/VFXParticleSystem";
import type { VFXSolidParticleSystem } from "./systems/VFXSolidParticleSystem";

/**
 * VFX Effect containing multiple particle systems
 * Main entry point for loading and creating VFX from Three.js particle JSON files
 */
export class VFXEffect implements IDisposable {
	public readonly systems: (VFXParticleSystem | VFXSolidParticleSystem)[] = [];

	/**
	 * Load a Three.js particle JSON file and create particle systems
	 * @param url URL to the JSON file
	 * @param scene The Babylon.js scene
	 * @param rootUrl Root URL for loading textures
	 * @param options Optional parsing options
	 * @returns Promise that resolves to a VFXEffect
	 */
	public static async LoadAsync(url: string, scene: Scene, rootUrl: string = "", options?: VFXLoaderOptions): Promise<VFXEffect> {
		return new Promise((resolve, reject) => {
			Tools.LoadFile(
				url,
				(data) => {
					try {
						const jsonData = JSON.parse(data.toString());
						const effect = VFXEffect.Parse(jsonData, scene, rootUrl, options);
						resolve(effect);
					} catch (error) {
						reject(error);
					}
				},
				undefined,
				undefined,
				undefined,
				(error) => {
					reject(error);
				}
			);
		});
	}

	/**
	 * Parse a Three.js particle JSON file and create Babylon.js particle systems
	 * @param jsonData The Three.js JSON data
	 * @param scene The Babylon.js scene
	 * @param rootUrl Root URL for loading textures
	 * @param options Optional parsing options
	 * @returns A VFXEffect containing all particle systems
	 */
	public static Parse(jsonData: QuarksVFXJSON, scene: Scene, rootUrl: string = "", options?: VFXLoaderOptions): VFXEffect {
		const particleSystems = new VFXParser(scene, rootUrl, jsonData, options).parse();
		const effect = new VFXEffect();
		effect.systems.push(...particleSystems);
		return effect;
	}

	/**
	 * Create a VFXEffect directly from JSON data
	 * @param jsonData The Three.js JSON data
	 * @param scene The Babylon.js scene
	 * @param rootUrl Root URL for loading textures
	 * @param options Optional parsing options
	 */
	constructor(jsonData?: QuarksVFXJSON, scene?: Scene, rootUrl: string = "", options?: VFXLoaderOptions) {
		if (jsonData && scene) {
			const effect = VFXEffect.Parse(jsonData, scene, rootUrl, options);
			this.systems.push(...effect.systems);
		}
	}

	public start(): void {
		for (const system of this.systems) {
			system.start();
		}
	}

	public stop(): void {
		for (const system of this.systems) {
			system.stop();
		}
	}

	public dispose(): void {
		for (const system of this.systems) {
			system.dispose();
		}
		this.systems.length = 0;
	}
}
