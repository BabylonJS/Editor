import { ISceneDecoratorData } from "./apply";

/**
 * Makes the decorated method called on the given pointer event is trigerred on the scene.
 * Once the script is instantiated, the reference to the sound is retrieved from the scene
 * and assigned to the property. Node link cant' be used in constructor.
 * This can be used only by scripts using Classes.
 * @param eventType defines the type of event or list of event to listen.
 * @param onlyWhenMeshPicked defines wether or not the decorated method should be called ONLY if the clicked object is the attached object of the script.
 */
export function onPointerEvent(eventType: number | number[], onlyWhenMeshPicked: boolean = true) {
	return function (target: any, propertyKey: string | Symbol) {
		const ctor = target.constructor as ISceneDecoratorData;

		ctor._PointerEvents ??= [];
		ctor._PointerEvents.push({
			propertyKey,
			onlyWhenMeshPicked,
			eventTypes: Array.isArray(eventType) ? eventType : [eventType],
		} as any);
	};
}
