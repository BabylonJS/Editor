import { Undefinable } from "../../../shared/types";

import { IItemHandler } from "../components/assets-browser/files/item-handler";
import { AssetsBrowserMoveHandler } from "../components/assets-browser/files/move/move-handler";

export interface IPluginAssets {
	/**
	 * Defines the item handler to register in the assets-browser component of the editor.
	 */
	itemHandler?: Undefinable<IItemHandler>;
	/**
	 * Defines the move item handler to register in the assets-browser component of the editor.
	 * This handler will be called each time a file that matches the handler extension has been moved.
	 */
	moveItemhandler?: Undefinable<AssetsBrowserMoveHandler>;
}