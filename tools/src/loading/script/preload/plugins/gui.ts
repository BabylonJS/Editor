import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture";

import { loadJsonFile } from "../../../../tools/request";

import { IScriptAssetParserParameters, registerScriptAssetParser } from "../../preload";

export async function preloadFullScreenScriptAsset(parameters: IScriptAssetParserParameters) {
	const data = await loadJsonFile<any>(`${parameters.rootUrl}${parameters.key}`);

	let gui: AdvancedDynamicTexture | null = null;

	try {
		switch (data.guiType) {
			case "fullscreen":
				gui = AdvancedDynamicTexture.CreateFullscreenUI(data.name, true, parameters.scene);
				gui.parseSerializedObject(data.content, false);
				break;
			default:
				throw new Error(`Unknown GUI type: ${data.guiType}`);
		}
	} catch (e) {
		console.error(`Failed to load GUI asset '${parameters.key}'. Make sure you imported all @babylonjs/gui modules required by this GUI asset.`);
		console.error(e);
	}

	return gui;
}

registerScriptAssetParser("gui", preloadFullScreenScriptAsset);
