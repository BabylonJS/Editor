import { ISceneDecoratorData } from "./apply";

export interface IPointerEventDecoratorOptions {
	/**
	 * Defines the listening mode for pointer event.
	 * - The `global` mode will always trigger the event when a pointer event of the provided type in the decorator is raised.
	 * - The `attachedMeshOnly` mode will only trigger the event when the pointer event is raised on the attached mesh.
	 * - The `includeDescendants` mode will trigger the event when the pointer event is raised on the attached mesh or any of its descendants.
	 */
	mode: "global" | "attachedMeshOnly" | "includeDescendants";
}

/**
 * Makes the decorated method called on the given pointer event is triggered on the scene.
 * Once the script is instantiated, the reference to the sound is retrieved from the scene
 * and assigned to the property. Node link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * @param eventType defines the type of event or list of event to listen.
 * @param onlyWhenMeshPicked defines wether or not the decorated method should be called ONLY if the clicked object is the attached object of the script.
 */
export function onPointerEvent(eventType: number | number[], options?: IPointerEventDecoratorOptions) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._PointerEvents ??= [];
		ctor._PointerEvents.push({
			propertyKey,
			options: {
				mode: "global",
				...(options ?? {}),
			},
			eventTypes: Array.isArray(eventType) ? eventType : [eventType],
		} as any);
	};
}

/**
 * Makes the decorated method called on the given keyboard event is triggered on the scene.
 * Once the script is instantiated, the reference to the sound is retrieved from the scene
 * and assigned to the property. Node link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * @param eventType defines the type of event or list of event to listen.
 */
export function onKeyboardEvent(eventType: number | number[]) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._KeyboardEvents ??= [];
		ctor._KeyboardEvents.push({
			propertyKey,
			eventTypes: Array.isArray(eventType) ? eventType : [eventType],
		} as any);
	};
}
