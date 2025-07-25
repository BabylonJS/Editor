import { join } from "path/posix";
import { writeJSON } from "fs-extra";

import { Effect } from "babylonjs";

import { Editor } from "../../editor/main";

export async function saveCompiledEffects(editor: Editor, scenePath: string) {
	const engine = editor.layout.preview.engine;
	const compiledEffects = engine["_compiledEffects"] ?? {} as Record<string, Effect>;

	const compiledEffectsResult: Record<string, any> = {};

	for (const key in compiledEffects) {
		if (!compiledEffects.hasOwnProperty(key)) {
			continue;
		}

		const effect = compiledEffects[key];

		compiledEffectsResult[key] = {
			name: effect.name,
			fallbacks: effect["_fallbacks"]?.["_defines"],
			options: {
				attributes: effect.getAttributesNames(),
				uniformsNames: effect.getUniformNames(),
				uniformBuffersNames: effect.getUniformBuffersNames(),
				samplers: effect.getSamplers(),
				defines: effect.defines,
				indexParameters: effect.getIndexParameters(),
				shaderLanguage: effect.shaderLanguage,
				multiTarget: effect._multiTarget,
			},
		};
	}

	await writeJSON(join(scenePath, "compiled-effects.json"), compiledEffectsResult, {
		encoding: "utf-8",
	});
}
