import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene, ShadowGenerator, CascadedShadowGenerator, RenderTargetTexture } from "babylonjs";

import { Editor } from "../../../editor/main";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadShadowGenerators(editor: Editor, shadowGeneratorFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	await Promise.all(
		shadowGeneratorFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "shadowGenerators", file), "utf-8");

				const light = scene.lights.find((light) => light.id === data.lightId);
				if (!light) {
					return;
				}

				let shadowGenerator: ShadowGenerator;

				if (data.className === CascadedShadowGenerator.CLASSNAME) {
					shadowGenerator = CascadedShadowGenerator.Parse(data, scene);
				} else {
					shadowGenerator = ShadowGenerator.Parse(data, scene);
				}

				const shadowMap = shadowGenerator.getShadowMap();
				if (shadowMap) {
					shadowMap.refreshRate = data.refreshRate ?? RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
				}
			} catch (e) {
				editor.layout.console.error(`Failed to load shadow generator file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);
}
