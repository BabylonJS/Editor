import { ISceneDecoratorData } from "./apply";

/**
 * Makes the decorated property linked to the node that has the given name.
 * Once the script is instantiated, the reference to the node is retrieved from the scene
 * and assigned to the property. Node link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * @param nodeName defines the name of the node to retrieve in scene.
 */
export function nodeFromScene(nodeName: string) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._NodesFromScene ??= [];
		ctor._NodesFromScene.push({ propertyKey, nodeName });
	};
}

/**
 * Makes the decorated property linked to the node that has the given name.
 * Once the script is instantiated, the reference to the node is retrieved from the descendants
 * of the current node and assigned to the property. Node link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * @param nodeName defines the name of the node to retrieve in scene.
 * @param directDescendantsOnly defines if true only direct descendants of 'this' will be considered, if false direct and also indirect (children of children, an so on in a recursive manner) descendants of 'this' will be considered.
 */
export function nodeFromDescendants(nodeName: string, directDescendantsOnly: boolean = false) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._NodesFromDescendants ??= [];
		ctor._NodesFromDescendants.push({ propertyKey, nodeName, directDescendantsOnly });
	};
}

/**
 * Makes the decorated property linked to an animation group that has the given name.
 * Once the script is instantiated, the reference to the animation group is retrieved from the scene
 * and assigned to the property. Animation group link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * @param animationGroupName defines the name of the animation group to retrieve in scene.
 */
export function animationGroupFromScene(animationGroupName: string) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._AnimationGroups ??= [];
		ctor._AnimationGroups.push({ animationGroupName, propertyKey });
	};
}

/**
 * Makes the decorated property linked to a scene that has the given name.
 * Once the script is instantiated, the reference to the scene is retrieved as a
 * `AdvancedAssetContainer` and assigned to the property. Scene link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * @param sceneName defines the name of the scene to retrieve.
 * @example \@sceneAsset("blaster.babylon") public myBlasterScene: AdvancedAssetContainer;
 */
export function sceneAsset(sceneName: string) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._SceneAssets ??= [];
		ctor._SceneAssets.push({
			sceneName,
			propertyKey,
		});
	};
}
