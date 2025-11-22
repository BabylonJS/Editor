import { Editor } from "../../editor/main";

let isInitialized = false;

export async function initializeRecast(editor: Editor) {
	if (isInitialized) {
		return;
	}

	isInitialized = true;

	try {
		const RecastCore = require("@recast-navigation/core");
		await RecastCore.init();

		return true;
	} catch (e) {
		if (e instanceof Error) {
			editor.layout.console.error(`Failed to initialize Recast navigation: ${e.message}`);
		}

		return false;
	}
}
