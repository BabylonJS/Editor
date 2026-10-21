import { ISceneDecoratorData } from "./apply";

/**
 * Makes the decorated property linked to the GUI created from the given asset file.
 * Babylon Lite has no GUI system: the GUI can't be created and the decorated property stays null (an error is logged).
 * @param pathInAssets defines the relative path (as it is in the assets browser in the editor) to the .gui file.
 * @param onGuiCreated defines the optional callback that is called when the GUI is created.
 * @deprecated Please use @visibleAsAsset decorator instead.
 * @example
 * 	@visibleAsAsset("gui", "GUI")
 * 	private _ui!: unknown;
 */
export function guiFromAsset(pathInAssets: string, onGuiCreated?: (instance: unknown, gui: unknown) => unknown) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._GuiFromAsset ??= [];
		ctor._GuiFromAsset.push({ propertyKey, pathInAssets, onGuiCreated });
	};
}
