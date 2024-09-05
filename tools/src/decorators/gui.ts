import { ISceneDecoratorData } from "./apply";

/**
 * Makes the decorated property linked to the GUI created from the given asset file.
 * Once the script is instantiated, the reference to the gui texture is created from the asset file
 * and assigned to the property. Gui link cant' be used in constructor and its creation is asynchronous.
 * @param pathInAssets defines the relative path (as it is in the assets browser in the editor) to the .gui file.
 */
export function guiFromAsset(pathInAssets: string) {
    return function (target: any, propertyKey: string | Symbol) {
        const ctor = target.constructor as ISceneDecoratorData;

        ctor._GuiFromAsset ??= [];
        ctor._GuiFromAsset.push({ propertyKey, pathInAssets });
    };
}
