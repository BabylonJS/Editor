import { pathExists } from "fs-extra";
import { dirname, join } from "path/posix";

import { Editor } from "../../editor/main";

import { watchPlugin } from "./watch";

export interface IRequirePluginOptions {
	projectPath: string;
	pluginNameOrPath: string;

	noWatch?: boolean;
}

export async function requirePlugin(editor: Editor, options: IRequirePluginOptions) {
	const isLocalPlugin = await pathExists(options.pluginNameOrPath);

	let result: any = null;
	let requireId = options.pluginNameOrPath;

	if (!isLocalPlugin) {
		const projectDir = dirname(options.projectPath);
		const pathSplit = projectDir.split("/");

		do {
			try {
				const path = join(pathSplit.join("/"), "node_modules", options.pluginNameOrPath);
				result = require(path);
				result.main(editor);
				break;
			} catch (e) {
				// Catch silently.
			}

			pathSplit.pop();
		} while (pathSplit.length > 0);
	} else {
		result = require(requireId);
		result.main(editor);
	}

	if (!result) {
		editor.layout.console.error(`Failed to load plugin "${requireId}"`);
	}

	if (isLocalPlugin) {
		editor.layout.console.log(`Loaded plugin from local drive "${result.title ?? options.pluginNameOrPath}"`);
	} else {
		editor.layout.console.log(`Loaded plugin "${result.title ?? options.pluginNameOrPath}"`);
	}

	if (isLocalPlugin && !options.noWatch) {
		try {
			watchPlugin(editor, requireId, options);
		} catch (e) {
			editor.layout.console.error("An error occured, failed to watch plugin for changes.");
			if (e instanceof Error) {
				editor.layout.console.error(e.message);
			}
		}
	}
}
