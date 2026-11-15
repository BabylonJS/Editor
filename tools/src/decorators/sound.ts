import { ISceneDecoratorData } from "./apply";

export type SoundFromSceneOptions = {
	/**
	 * Defines whether or not the node should be searched for globally in the scene instead of being scoped to the container the node comes from.
	 * Each scene loaded using `@sceneAsset` or `@visibleAsEntity("scene", ...)` is loaded into its own asset container before it's added to the main scene.
	 * Setting `global: false` will restrict the search to the asset container the node comes from.
	 * @default false
	 */
	global?: boolean;
};

/**
 * Makes the decorated property linked to the sound that has the given name.
 * Once the script is instantiated, the reference to the sound is retrieved from the scene
 * and assigned to the property. Node link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * @param soundName defines the name of the sound to retrieve in scene.
 */
export function soundFromScene(soundName: string, options?: SoundFromSceneOptions) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._SoundsFromScene ??= [];
		ctor._SoundsFromScene.push({ propertyKey, soundName, options });
	};
}
