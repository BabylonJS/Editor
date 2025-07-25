import { join } from "path/posix";
import { pathExists, readJSON } from "fs-extra";

import { Logger, EffectFallbacks } from "babylonjs";

import { Editor } from "../../editor/main";

export async function compileSavedEffects(editor: Editor, scenePath: string) {
	const logLevels = Logger.LogLevels;
	Logger.LogLevels = Logger.NoneLogLevel;

	const engine = editor.layout.preview.engine;
	const parallelShaderCompile = engine.getCaps().parallelShaderCompile;

	delete engine.getCaps().parallelShaderCompile;

	try {
		const compiledEffectsPath = join(scenePath, "compiled-effects.json");

		let compiledEffects: Record<string, any> = {};
		if (await pathExists(compiledEffectsPath)) {
			compiledEffects = await readJSON(compiledEffectsPath, "utf-8");
		}

		for (const key in compiledEffects) {
			if (!compiledEffects.hasOwnProperty(key)) {
				continue;
			}

			const parsedEffect = compiledEffects[key];

			let fallbacks: EffectFallbacks | undefined = undefined;
			if (parsedEffect.fallbacks) {
				fallbacks = new EffectFallbacks();

				for (const key in parsedEffect.fallbacks) {
					if (!parsedEffect.fallbacks.hasOwnProperty(key)) {
						continue;
					}

					const rank = parseInt(key);
					const defines = parsedEffect.fallbacks[key];

					defines?.forEach((define) => {
						fallbacks!.addFallback(rank, define);
					});
				}
			}

			try {
				engine.createEffect(
					parsedEffect.name,
					{
						...parsedEffect.options,
						fallbacks,
					},
					engine,
				);
			} catch (e) {
				// Catch silently.
			}
		}
	} catch (e) {
		console.error(e);
	}

	Logger.LogLevels = logLevels;
	engine.getCaps().parallelShaderCompile = parallelShaderCompile;
}
