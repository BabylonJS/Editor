import { ISceneDecoratorData } from "./apply";

/**
 * Makes the decorated property linked to the sound that has the given name.
 * Once the script is instantiated, the reference to the sound is retrieved from the scene
 * and assigned to the property. Node link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * @param soundName defines the name of the sound to retrieve in scene.
 */
export function soundFromScene(soundName: string) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._SoundsFromScene ??= [];
		ctor._SoundsFromScene.push({ propertyKey, soundName });
	};
}
