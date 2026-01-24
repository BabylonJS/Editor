import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene, ParticleSystem, GPUParticleSystem } from "babylonjs";

import { Editor } from "../../../editor/main";

import { isGPUParticleSystem } from "../../../tools/guards/particles";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadParticleSystems(editor: Editor, particleSystemFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedParticleSystems = await Promise.all(
		particleSystemFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "particleSystems", file), "utf-8");

				let particleSystem: ParticleSystem | GPUParticleSystem;

				switch (data.className) {
					case "GPUParticleSystem":
						particleSystem = GPUParticleSystem.Parse(data, scene, join(options.projectPath, "/"));
						break;

					default:
						particleSystem = ParticleSystem.Parse(data, scene, join(options.projectPath, "/"));
						break;
				}

				if (!particleSystem.emitter) {
					editor.layout.console.warn(`No emitter found for particle system "${particleSystem.name}". Skipping.`);
					if (isGPUParticleSystem(particleSystem)) {
						particleSystem.dispose(true);
					} else {
						particleSystem.dispose(true, true, true);
					}

					return;
				}

				particleSystem!.uniqueId = data.uniqueId;

				options.loadResult.particleSystems.push(particleSystem!);

				return particleSystem;
			} catch (e) {
				editor.layout.console.error(`Failed to particle system file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);

	// Re-add particle systems to keep correct order
	loadedParticleSystems.forEach((particleSystem) => {
		if (particleSystem) {
			scene.removeParticleSystem(particleSystem);
			scene.addParticleSystem(particleSystem);
		}
	});
}
