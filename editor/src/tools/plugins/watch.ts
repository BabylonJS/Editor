import { watch, FSWatcher } from "chokidar";

import { Editor } from "../../editor/main";

import { IRequirePluginOptions, requirePlugin } from "./require";

export const pluginWatchers = new Map<string, FSWatcher>();

export function watchPlugin(editor: Editor, requireId: string, options: IRequirePluginOptions) {
	const watcher = watch(requireId, {
		persistent: false,
		ignoreInitial: true,
	});

	pluginWatchers.set(requireId, watcher);

	let timeoutId: number | null = null;

	watcher.on("change", () => {
		editor.layout.console.log(`Changes detected for plugin "${options.pluginNameOrPath}"...`);

		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}

		timeoutId = window.setTimeout(async () => {
			editor.layout.console.log(`Reloading plugin "${options.pluginNameOrPath}"...`);

			const result = require(requireId);
			await result.close?.(editor);

			const keys = Object.keys(require.cache);
			for (const key of keys) {
				const keyNormalized = key.replace(/\\/g, "/");

				if (keyNormalized.startsWith(requireId)) {
					delete require.cache[key];
				}
			}

			requirePlugin(editor, {
				projectPath: options.projectPath,
				pluginNameOrPath: options.pluginNameOrPath,
				noWatch: true,
			});
		}, 3500);
	});
}
