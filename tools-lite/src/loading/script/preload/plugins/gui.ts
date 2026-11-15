import { IScriptAssetParserParameters, registerScriptAssetParser } from "../../preload";

/**
 * Babylon Lite has no GUI system: the GUI assets (`.gui` files) can't be loaded. An error is logged and null is
 * assigned to the decorated properties.
 */
export async function preloadFullScreenScriptAsset(parameters: IScriptAssetParserParameters) {
	console.error(`Failed to load GUI asset '${parameters.key}': Babylon Lite has no GUI system.`);
	return null;
}

registerScriptAssetParser("gui", preloadFullScreenScriptAsset);
